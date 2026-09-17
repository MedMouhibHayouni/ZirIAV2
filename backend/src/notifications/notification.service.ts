import { Injectable, Logger } from '@nestjs/common';
import { PaginatedResult } from '../common/dto/paginated.dto';
import { NotificationGateway } from './notification.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationRecord } from './entities/notification-record.entity';
import { FirebaseAdminService } from './firebase-admin.service';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly gateway: NotificationGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(NotificationRecord)
    private readonly notifRepo: Repository<NotificationRecord>,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async sendToUsers(userIds: string[], title: string, message: string, payload?: any) {
    this.logger.log(`Sending notification to ${userIds.length} users: ${title}`);
    const records = userIds.map(userId =>
      this.notifRepo.create({
        user_id: userId,
        title,
        body: message,
        type: payload?.type ?? 'GENERAL',
        payload,
        is_read: false,
      })
    );
    await this.notifRepo.save(records);

    for (const userId of userIds) {
      this.gateway.sendToUser(userId, 'notification', { title, message, payload });
    }

    // FIREBASE PUSH (awaited, failures collected — never fire-and-forget)
    let pushDelivered = 0;
    let pushFailed = 0;
    if (userIds.length > 0) {
      try {
        const usersWithTokens = await this.userRepo.query(`
          SELECT id, fcm_token
          FROM users
          WHERE id = ANY($1) AND fcm_token IS NOT NULL
        `, [userIds]);
        if (usersWithTokens && usersWithTokens.length > 0) {
          const stringifiedPayload = payload ? Object.fromEntries(
            Object.entries(payload).map(([k, v]) => [k, String(v)])
          ) : {};

          const results = await Promise.allSettled(
            usersWithTokens.map(u =>
              this.firebaseAdminService.sendPush(u.fcm_token, title, message, stringifiedPayload)
            )
          );
          for (const r of results) {
            if (r.status === 'fulfilled') pushDelivered++;
            else {
              pushFailed++;
              this.logger.error('FCM push failed', (r.reason as Error)?.stack);
            }
          }
        }
      } catch (err) {
        this.logger.error('Error fetching FCM tokens for push', err.stack);
        pushFailed = userIds.length;
      }
    }

    return { notified: userIds.length, pushDelivered, pushFailed };
  }

  async broadcastToZone(zoneWkt: string, roles: Role[], title: string, message: string, payload?: any) {
    this.logger.log(`Broadcasting to zone for roles: ${roles.join(',')}`);
    
    // Find users in polygon
    const usersInZone = await this.userRepo.query(`
      SELECT id, fcm_token 
      FROM users 
      WHERE ST_Within(location::geometry, ST_GeomFromText($1, 4326)) 
      AND role = ANY($2::text[])
    `, [zoneWkt, roles]);

    const userIds = usersInZone.map(u => u.id);
    if (userIds.length === 0) return;

    // Create DB records and send WS
    const records = userIds.map(userId =>
      this.notifRepo.create({
        user_id: userId,
        title,
        body: message,
        type: payload?.type ?? 'GENERAL',
        payload,
        is_read: false,
      })
    );
    await this.notifRepo.save(records);

    for (const userId of userIds) {
      this.gateway.sendToUser(userId, 'notification', { title, message, payload });
    }

    // FIREBASE PUSH (awaited, failures collected — never fire-and-forget)
    const usersWithTokens = usersInZone.filter(u => u.fcm_token);
    let pushDelivered = 0;
    let pushFailed = 0;
    if (usersWithTokens.length > 0) {
      const stringifiedPayload = payload ? Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, String(v)])
      ) : {};

      const results = await Promise.allSettled(
        usersWithTokens.map(u =>
          this.firebaseAdminService.sendPush(u.fcm_token, title, message, stringifiedPayload)
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled') pushDelivered++;
        else {
          pushFailed++;
          this.logger.error('Error in broadcastToZone push', (r.reason as Error)?.stack);
        }
      }
    }

    return { notified: userIds.length, pushDelivered, pushFailed };
  }

  async sendPushToUser(userId: string, data: { title: string; message: string; payload?: any }) {
    return this.sendToUsers([userId], data.title, data.message, data.payload);
  }

  async updateFcmToken(userId: string, token: string) {
    this.logger.log(`Updating FCM token for user ${userId}`);
    await this.userRepo.update(userId, { fcm_token: token } as any);
  }

  async broadcastPhytoAlert(farmerIds: string[], diseaseName: string, message: string) {
    await this.sendToUsers(
      farmerIds,
      `🚨 ALERTE PHYTOSANITAIRE: ${diseaseName}`,
      message,
      { type: 'PHYTO_ALERT', disease: diseaseName }
    );
  }

  async findByUser(userId: string, page: number, limit: number, type?: string): Promise<PaginatedResult<NotificationRecord>> {
    const qb = this.notifRepo.createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type && type !== 'ALL') {
      qb.andWhere('n.type = :type', { type });
    }

    const [items, total] = await qb.getManyAndCount();
    return { 
      items, 
      total, 
      page, 
      limit,
      hasNext: (page * limit) < total
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { user_id: userId, is_read: false } });
  }

  async markRead(userId: string, notifId: string) {
    await this.notifRepo.update({ id: notifId, user_id: userId }, { is_read: true });
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update({ user_id: userId, is_read: false }, { is_read: true });
  }

  async deleteNotification(userId: string, notifId: string) {
    await this.notifRepo.softDelete({ id: notifId, user_id: userId });
  }
}
