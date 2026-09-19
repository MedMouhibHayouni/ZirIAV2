import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { InstitutionMessagesService } from './institution-messages.service';
import { MessageContext } from './entities/institution-message.entity';

@ApiTags('Messagerie Institutionnelle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('institution-messages')
export class InstitutionMessagesController {
  constructor(private readonly messagesService: InstitutionMessagesService) {}

  @Get(':institutionId/conversations')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async getConversations(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Request() req: any,
  ) {
    return this.messagesService.getConversations(institutionId, req.user.id);
  }

  @Get(':institutionId/thread')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async getThread(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Request() req: any,
    @Query('dossierId') dossierId?: string,
    @Query('participantId') participantId?: string,
  ) {
    return this.messagesService.getThread(institutionId, req.user.id, {
      dossierId,
      participantId,
    });
  }

  @Post(':institutionId/send')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async sendMessage(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Request() req: any,
    @Body()
    body: {
      content: string;
      context: MessageContext;
      dossierId?: string;
      parentId?: string;
      recipientId?: string;
    },
  ) {
    return this.messagesService.sendMessage(req.user.id, institutionId, body);
  }

  @Patch(':institutionId/read/:messageId')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async markAsRead(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ) {
    return this.messagesService.markAsRead(messageId, req.user.id, institutionId);
  }

  @Patch(':institutionId/read-thread')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async markThreadAsRead(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Request() req: any,
    @Body() body: { dossierId?: string; participantId?: string },
  ) {
    return this.messagesService.markThreadAsRead(req.user.id, institutionId, body);
  }

  @Get(':institutionId/unread-count')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async getUnreadCount(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Request() req: any,
  ) {
    return this.messagesService.getUnreadCount(institutionId, req.user.id);
  }
}
