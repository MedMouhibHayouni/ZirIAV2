import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3001', 'https://ziria-v2.vercel.app'],
    credentials: true,
  },
  namespace: '/expert-dashboard',
})
export class ExpertGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ExpertGateway.name);
  private userSockets = new Map<string, string[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new UnauthorizedException('No token provided');

      const payload = this.jwtService.verify(token, { secret: this.configService.getOrThrow('JWT_SECRET') });
      const userId = payload.sub;

      if (userId) {
        const current = this.userSockets.get(userId) || [];
        this.userSockets.set(userId, [...current, client.id]);
        client.data.userId = userId;

        // Auto join user room
        client.join(`expert_${userId}`);
        this.logger.log(`Expert connected: ${client.id} (User: ${userId})`);
      }
    } catch (err) {
      this.logger.error(`Connection rejected: ${client.id} - ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const current = this.userSockets.get(userId) || [];
      const updated = current.filter(id => id !== client.id);
      if (updated.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, updated);
      }
    }
    this.logger.log(`Expert disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_zone')
  handleJoinZone(
    @ConnectedSocket() client: Socket,
    @MessageBody() governorate: string,
  ) {
    if (typeof governorate !== 'string' || !governorate) {
      return { error: 'Invalid governorate' };
    }
    const room = `zone_${governorate.toLowerCase()}`;
    client.join(room);
    this.logger.log(`Expert ${client.id} a rejoint la room: ${room}`);
    return { event: 'joined_zone', data: room };
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { other_user_id: string },
  ) {
    const myId = client.data.userId;
    if (!myId) return { error: 'Not authenticated' };
    if (!payload || typeof payload.other_user_id !== 'string' || !payload.other_user_id) {
      return { error: 'Invalid other_user_id' };
    }

    const ids = [myId, payload.other_user_id].sort();
    const room = `conversation_${ids[0]}_${ids[1]}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} joint la conversation room: ${room}`);
    return { event: 'joined_conversation', data: room };
  }

  emitNewMessage(senderId: string, receiverId: string, message: any) {
    const ids = [senderId, receiverId].sort();
    const room = `conversation_${ids[0]}_${ids[1]}`;
    this.server.to(room).emit('new_message', message);

    // Notify receiver about stats update (unread messages count increment)
    this.server.to(`expert_${receiverId}`).emit('stats_update', { trigger: 'new_message' });
  }

  emitNewMessageNotification(receiverId: string, payload: any) {
    this.server.to(`expert_${receiverId}`).emit('new_message_notification', payload);
  }

  emitStatsUpdate(expertId: string, stats: any) {
    this.server.to(`expert_${expertId}`).emit('stats_update', stats);
  }

  emitNewPendingRequest(expertId: string, farmerName: string) {
    this.server.to(`expert_${expertId}`).emit('new_pending_request', { farmer_name: farmerName });
  }

  broadcastToExperts(payload: {
    detection_id: string;
    disease: string;
    confidence: number;
    lat: number;
    lng: number;
    urgency: string;
    governorate: string;
  }) {
    const room = `zone_${payload.governorate.toLowerCase()}`;
    this.logger.log(`ZirIA Expert Sync: Émission de detection_alert pour ID ${payload.detection_id} dans la room ${room}`);
    this.server.to(room).emit('disease_detection_alert', payload);
  }
}
