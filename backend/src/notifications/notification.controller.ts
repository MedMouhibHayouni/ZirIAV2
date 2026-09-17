import { Controller, Post, Get, Delete, Body, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsString } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

class UpdateFcmTokenDto {
  @IsString()
  fcm_token: string;
}

@ApiTags('Notifications Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * PATCH /notifications/fcm-token
   */
  @Patch('fcm-token')
  @ApiOperation({ summary: 'Mettre à jour le token FCM (app mobile)' })
  @ApiBody({ description: 'Token FCM', type: UpdateFcmTokenDto })
  async updateToken(@CurrentUser() user: any, @Body() body: UpdateFcmTokenDto) {
    await this.notificationService.updateFcmToken(user.id, body.fcm_token);
    return { message: 'Token FCM mis à jour' };
  }

  /**
   * GET /notifications
   * Retourne les notifications de l'utilisateur connecté.
   */
  @Get()
  @ApiOperation({ summary: 'Lister mes notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Query('type') type?: string,
  ) {
    return this.notificationService.findByUser(user.id, +page, +limit, type);
  }

  /**
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.countUnread(user.id);
    return { count };
  }

  /**
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationService.markRead(user.id, id);
    return { message: 'Notification marquée comme lue' };
  }

  /**
   * PATCH /notifications/read-all
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  async markAllRead(@CurrentUser() user: any) {
    await this.notificationService.markAllRead(user.id);
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  @Get('my')
  @ApiOperation({ summary: 'Lister mes notifications (alias)' })
  async getMyNotificationsAlias(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.notificationService.findByUser(user.id, +page, +limit);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  async markAllNotificationsRead(@CurrentUser() user: any) {
    const countBefore = await this.notificationService.countUnread(user.id);
    await this.notificationService.markAllRead(user.id);
    return { updated: countBefore };
  }

  /**
   * DELETE /notifications/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  async deleteNotification(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationService.deleteNotification(user.id, id);
    return { message: 'Notification supprimée' };
  }
}
