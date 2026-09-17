import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async getConversations(userId: string) {
    // Liste des derniers messages échangés avec chaque interlocuteur
    return this.dataSource.query(`
      SELECT DISTINCT ON (interlocutor_id)
        CASE 
          when sender_id = $1 then receiver_id 
          else sender_id 
        END as interlocutor_id,
        content,
        created_at,
        is_read,
        id as message_id
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY interlocutor_id, created_at DESC
    `, [userId]);
  }

  async getThread(userId: string, interlocutorId: string) {
    return this.messageRepo.find({
      where: [
        { sender_id: userId, receiver_id: interlocutorId },
        { sender_id: interlocutorId, receiver_id: userId },
      ],
      order: { created_at: 'ASC' },
      take: 100
    });
  }

  async sendMessage(userId: string, receiverId: string, content: string) {
    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('Destinataire introuvable');

    const msg = this.messageRepo.create({
      sender_id: userId,
      receiver_id: receiverId,
      content
    });
    const saved = await this.messageRepo.save(msg);

    const sender = await this.userRepo.findOne({ where: { id: userId } });
    const senderName = sender?.name || 'Un utilisateur';

    // Dispatch real-time / persistent notification
    await this.notificationService.sendToUsers(
      [receiverId],
      `💬 Nouveau message de ${senderName}`,
      content.length > 60 ? `${content.substring(0, 57)}...` : content,
      { type: 'CHAT_MESSAGE', sender_id: userId, sender_name: senderName }
    ).catch(() => {});

    return saved;
  }

  async markAsRead(userId: string, senderId: string) {
    await this.messageRepo.update(
      { sender_id: senderId, receiver_id: userId, is_read: false },
      { is_read: true }
    );
    return { success: true };
  }
}
