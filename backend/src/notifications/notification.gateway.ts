import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3001', 'https://ziria-v2.vercel.app'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
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
        // Also attach userId to client object for disconnect
        client.data.userId = userId;
        this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
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
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  sendToUser(userId: string, event: string, payload: any): { delivered: number; queued: number } {
    try {
      const socketIds = this.userSockets.get(userId);
      if (!socketIds || socketIds.length === 0) {
        return { delivered: 0, queued: 0 };
      }
      let delivered = 0;
      socketIds.forEach(id => {
        try {
          this.server.to(id).emit(event, payload);
          delivered++;
        } catch (err) {
          this.logger.error(`sendToUser emit failed for socket ${id}`, err.stack);
        }
      });
      return { delivered, queued: socketIds.length - delivered };
    } catch (err) {
      this.logger.error(`sendToUser failed for user ${userId}`, err.stack);
      return { delivered: 0, queued: 0 };
    }
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }
}
