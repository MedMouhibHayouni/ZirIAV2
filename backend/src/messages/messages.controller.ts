import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Messagerie (Chat)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste mes conversations (derniers messages)' })
  getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.sub);
  }

  @Get(':interlocutorId')
  @ApiOperation({ summary: 'Récupérer le fil de discussion avec un utilisateur' })
  getThread(@Request() req, @Param('interlocutorId') interlocutorId: string) {
    return this.messagesService.getThread(req.user.sub, interlocutorId);
  }

  @Post()
  @ApiOperation({ summary: 'Envoyer un message à un utilisateur' })
  sendMessage(@Request() req, @Body() dto: { receiverId: string; content: string }) {
    return this.messagesService.sendMessage(req.user.sub, dto.receiverId, dto.content);
  }

  @Patch('read/:senderId')
  @ApiOperation({ summary: 'Marquer les messages d\'un utilisateur comme lus' })
  markAsRead(@Request() req, @Param('senderId') senderId: string) {
    return this.messagesService.markAsRead(req.user.sub, senderId);
  }
}
