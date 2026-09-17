import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DriverProfile } from './entities/driver-profile.entity';
import { GpsTrackingEvent } from './entities/gps-tracking-event.entity';
import { v4 as uuidv4 } from 'uuid';

/** Tunisia approximate bounding box */
const TUNISIA_BOUNDS = { minLat: 30.2, maxLat: 37.6, minLng: 7.5, maxLng: 11.6 };

function inTunisiaBounds(lat: number, lng: number): boolean {
  return (
    lat >= TUNISIA_BOUNDS.minLat && lat <= TUNISIA_BOUNDS.maxLat &&
    lng >= TUNISIA_BOUNDS.minLng && lng <= TUNISIA_BOUNDS.maxLng
  );
}

interface PositionUpdatePayload {
  session_id: string;
  mission_id?: string;
  lat: number;
  lng: number;
  speed_kmh?: number;
  bearing_degrees?: number;
  accuracy_meters?: number;
  recorded_at: string; // ISO string
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3001', 'https://ziria-v2.vercel.app'],
    credentials: true,
  },
  namespace: '/gps-tracking',
})
@Injectable()
export class GpsTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GpsTrackingGateway.name);
  /** Map: socketId -> { userId, driverProfileId } */
  private clients = new Map<string, { userId: string; driverProfileId: string | null }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(DriverProfile)
    private readonly driverRepo: Repository<DriverProfile>,
    @InjectRepository(GpsTrackingEvent)
    private readonly eventRepo: Repository<GpsTrackingEvent>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new UnauthorizedException('No token');

      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });
      const userId: string = payload.sub;
      client.data.userId = userId;

      const profile = await this.driverRepo.findOne({ where: { user_id: userId } });
      client.data.driverProfileId = profile?.id ?? null;
      this.clients.set(client.id, { userId, driverProfileId: profile?.id ?? null });

      this.logger.log(`GPS WS connected: ${client.id} (user=${userId})`);
    } catch (err) {
      this.logger.warn(`GPS WS rejected: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`GPS WS disconnected: ${client.id}`);
  }

  // ─── DRIVER EVENTS ────────────────────────────────────────────────────────

  @SubscribeMessage('start_tracking')
  async onStartTracking(@ConnectedSocket() client: Socket) {
    const profileId = client.data.driverProfileId as string | null;
    if (!profileId) return { error: 'No driver profile' };

    const sessionId = uuidv4();
    await this.driverRepo.update(profileId, {
      is_tracking_active: true,
      tracking_session_id: sessionId,
    });

    this.logger.log(`Tracking started: driver=${profileId} session=${sessionId}`);
    return { session_id: sessionId };
  }

  @SubscribeMessage('position_update')
  async onPositionUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PositionUpdatePayload,
  ) {
    const profileId = client.data.driverProfileId as string | null;
    if (!profileId) return { error: 'No driver profile' };

    // Validate session
    const profile = await this.driverRepo.findOne({ where: { id: profileId } });
    if (!profile || profile.tracking_session_id !== data.session_id) {
      return { error: 'Invalid session' };
    }

    const lat = parseFloat(data.lat as any);
    const lng = parseFloat(data.lng as any);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { error: 'Invalid coordinates' };
    }
    if (isNaN(Date.parse(data.recorded_at))) {
      return { error: 'Invalid recorded_at timestamp' };
    }

    if (!inTunisiaBounds(lat, lng)) {
      this.logger.warn(`Position out of Tunisia bounds: driver=${profileId} lat=${lat} lng=${lng}`);
      return { error: 'Position out of bounds' };
    }

    try {
      // Update live coordinates on driver profile
      await this.driverRepo.update(profileId, {
        live_lat: lat,
        live_lng: lng,
        live_location: { type: 'Point', coordinates: [lng, lat] } as any,
      });

      // Write audit event (append-only)
      await this.eventRepo.save({
        driver_profile_id: profileId,
        mission_id: data.mission_id ?? null,
        lat,
        lng,
        speed_kmh: data.speed_kmh ?? null,
        bearing_degrees: data.bearing_degrees ?? null,
        accuracy_meters: data.accuracy_meters ?? null,
        recorded_at: new Date(data.recorded_at),
      });
    } catch (err) {
      this.logger.error(`position_update persist failed: driver=${profileId}`, err.stack);
      return { error: 'Failed to persist position' };
    }

    // Broadcast to room watchers (farmers watching this mission)
    const room = data.mission_id ? `mission_${data.mission_id}` : `driver_${profileId}`;
    this.server.to(room).emit('driver_position', {
      driver_profile_id: profileId,
      mission_id: data.mission_id,
      lat,
      lng,
      speed_kmh: data.speed_kmh,
      bearing_degrees: data.bearing_degrees,
      timestamp: data.recorded_at,
    });

    return { ok: true };
  }

  @SubscribeMessage('stop_tracking')
  async onStopTracking(@ConnectedSocket() client: Socket) {
    const profileId = client.data.driverProfileId as string | null;
    if (!profileId) return { error: 'No driver profile' };

    await this.driverRepo.update(profileId, {
      is_tracking_active: false,
      tracking_session_id: null,
    });

    this.logger.log(`Tracking stopped: driver=${profileId}`);
    return { ok: true };
  }

  // ─── FARMER/WATCHER EVENTS ────────────────────────────────────────────────

  @SubscribeMessage('watch_mission')
  async onWatchMission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mission_id: string },
  ) {
    const room = `mission_${data.mission_id}`;
    await client.join(room);

    // Emit last known position immediately
    const event = await this.eventRepo.findOne({
      where: { mission_id: data.mission_id },
      order: { recorded_at: 'DESC' },
    });

    if (event) {
      client.emit('driver_position', {
        driver_profile_id: event.driver_profile_id,
        mission_id: event.mission_id,
        lat: event.lat,
        lng: event.lng,
        speed_kmh: event.speed_kmh,
        bearing_degrees: event.bearing_degrees,
        timestamp: event.recorded_at,
      });
    }

    return { joined: room };
  }
}
