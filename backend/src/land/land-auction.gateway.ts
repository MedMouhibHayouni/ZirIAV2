import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, UnauthorizedException } from '@nestjs/common';
import { LandAuctionService } from './land-auction.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: 'auctions',
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3001', 'https://ziria-v2.vercel.app'],
    credentials: true,
  },
})
export class LandAuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LandAuctionGateway.name);

  constructor(
    private readonly auctionService: LandAuctionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new UnauthorizedException('No token provided');
      
      const payload = this.jwtService.verify(token, { secret: this.configService.getOrThrow('JWT_SECRET') });
      client.data.userId = payload.sub;
      this.logger.log(`Client connected to auctions: ${client.id} (User: ${payload.sub})`);
    } catch (err) {
      this.logger.error(`Connection rejected: ${client.id} - ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from auctions: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @MessageBody() data: { auctionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`auction_${data.auctionId}`);
    this.logger.log(`Client ${client.id} joined auction ${data.auctionId}`);
    return { status: 'joined', auctionId: data.auctionId };
  }

  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody() data: { auctionId: string; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const bidderId = client.data.userId;
      if (!bidderId) return { status: 'error', message: 'Not authenticated' };
      const bidResult = await this.auctionService.placeBid(data.auctionId, bidderId, data.amount);

      // Broadcast to everyone in the room
      this.server.to(`auction_${data.auctionId}`).emit('newBid', {
        auctionId: data.auctionId,
        bidderId,
        amount: data.amount,
        timestamp: new Date().toISOString()
      });

      return { status: 'success', bidResult };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
