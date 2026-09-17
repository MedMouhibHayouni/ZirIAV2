import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { io, Socket } from 'socket.io-client';

export interface DriverPosition {
  driver_profile_id: string;
  mission_id: string | null;
  lat: number;
  lng: number;
  speed_kmh?: number;
  bearing_degrees?: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class GpsTrackingService implements OnDestroy {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private watchInterval: any = null;

  /** Current driver position broadcast (for the tracking UI) */
  driverPosition = signal<DriverPosition | null>(null);
  isTracking = signal(false);

  constructor(private http: HttpClient) {}

  // ─── DRIVER SIDE ─────────────────────────────────────────────────────────

  /** Connect to /gps-tracking namespace and start position broadcast */
  async startTracking(missionId: string): Promise<void> {
    await this.connectSocket();

    return new Promise<void>((resolve, reject) => {
      this.socket!.emit('start_tracking', {}, (response: any) => {
        if (response?.error) { reject(new Error(response.error)); return; }
        this.sessionId = response.session_id;
        this.isTracking.set(true);

        // Emit position every 10 seconds using browser Geolocation API
        this.watchInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => this.emitPosition(missionId, pos),
            (err) => console.warn('[GPS] Geolocation error:', err),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
          );
        }, 10_000);

        // Emit immediately
        navigator.geolocation.getCurrentPosition(
          (pos) => this.emitPosition(missionId, pos),
          () => {},
          { enableHighAccuracy: true },
        );

        resolve();
      });
    });
  }

  /** Stop tracking and disconnect */
  stopTracking(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }

    if (this.socket?.connected) {
      this.socket.emit('stop_tracking', {}, () => {});
    }

    this.sessionId = null;
    this.isTracking.set(false);
  }

  private emitPosition(missionId: string, pos: GeolocationPosition): void {
    if (!this.socket || !this.sessionId) return;

    this.socket.emit('position_update', {
      session_id: this.sessionId,
      mission_id: missionId,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
      bearing_degrees: pos.coords.heading,
      accuracy_meters: pos.coords.accuracy,
      recorded_at: new Date(pos.timestamp).toISOString(),
    });
  }

  // ─── FARMER SIDE ─────────────────────────────────────────────────────────

  /** Subscribe to a mission room and stream driver positions via signal */
  async watchMission(missionId: string): Promise<void> {
    await this.connectSocket();

    this.socket!.on('driver_position', (data: DriverPosition) => {
      this.driverPosition.set(data);
    });

    return new Promise<void>((resolve) => {
      this.socket!.emit('watch_mission', { mission_id: missionId }, () => resolve());
    });
  }

  stopWatching(): void {
    this.socket?.off('driver_position');
    this.driverPosition.set(null);
  }

  // ─── SHARED ──────────────────────────────────────────────────────────────

  private async connectSocket(): Promise<void> {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('access_token');
    this.socket = io(`${environment.wsUrl}/gps-tracking`, {
      auth: { token },
      transports: ['websocket'],
    });

    return new Promise<void>((resolve, reject) => {
      this.socket!.on('connect', () => resolve());
      this.socket!.on('connect_error', (err) => reject(err));
    });
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.socket?.disconnect();
  }
}
