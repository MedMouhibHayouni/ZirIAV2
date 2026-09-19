import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InstitutionMessage, MessageContext } from './entities/institution-message.entity';
import { InstitutionMessageRead } from './entities/institution-message-read.entity';
import { InstitutionMember } from '../institutions/entities/institution-member.entity';

@Injectable()
export class InstitutionMessagesService {
  constructor(
    @InjectRepository(InstitutionMessage)
    private msgRepo: Repository<InstitutionMessage>,
    @InjectRepository(InstitutionMessageRead)
    private readRepo: Repository<InstitutionMessageRead>,
    @InjectRepository(InstitutionMember)
    private memberRepo: Repository<InstitutionMember>,
  ) {}

  async getConversations(institutionId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { userId, institutionId, isActive: true },
    });
    if (!member) throw new BadRequestException('Vous n\'êtes pas membre de ce bureau');

    const allMembers = await this.memberRepo.find({
      where: { institutionId, isActive: true },
      relations: ['user'],
    });
    const memberUserIds = allMembers.map((m) => m.userId);
    const memberMap = new Map(allMembers.map((m) => [m.userId, m]));

    const rawConversations = await this.msgRepo
      .createQueryBuilder('msg')
      .select([
        'msg.id as msg_id',
        'msg.senderId as sender_id',
        'msg.context as context',
        'msg.dossierId as dossier_id',
        'msg.content as content',
        'msg.createdAt as created_at',
        'sender.name as sender_name',
        'sender.id as sender_user_id',
      ])
      .leftJoin('msg.sender', 'sender')
      .where('msg.institutionId = :institutionId', { institutionId })
      .andWhere('msg.parentId IS NULL')
      .orderBy('msg.createdAt', 'DESC')
      .getRawMany();

    const conversationMap = new Map<string, any>();

    for (const raw of rawConversations) {
      let convKey: string;
      let conv: any;

      if (raw.context === MessageContext.DOSSIER && raw.dossier_id) {
        convKey = `dossier:${raw.dossier_id}`;
        if (!conversationMap.has(convKey)) {
          const dossier = await this.msgRepo
            .createQueryBuilder('msg')
            .innerJoinAndSelect('msg.dossier', 'd')
            .where('msg.dossierId = :dId', { dId: raw.dossier_id })
            .getOne();
          conversationMap.set(convKey, {
            type: 'DOSSIER',
            dossierId: raw.dossier_id,
            dossierRef: dossier?.dossier?.referenceNumber || raw.dossier_id.slice(0, 8),
            lastMessage: {
              id: raw.msg_id,
              senderId: raw.sender_id,
              senderName: raw.sender_name,
              content: raw.content,
              createdAt: raw.created_at,
            },
            unreadCount: 0,
          });
        }
      } else if (raw.context === MessageContext.ANNOUNCEMENT) {
        convKey = `announcement:${raw.sender_user_id}:${raw.content.slice(0, 50)}`;
        if (!conversationMap.has(convKey)) {
          conversationMap.set(convKey, {
            type: 'ANNOUNCEMENT',
            senderId: raw.sender_user_id,
            senderName: raw.sender_name,
            lastMessage: {
              id: raw.msg_id,
              senderId: raw.sender_id,
              senderName: raw.sender_name,
              content: raw.content,
              createdAt: raw.created_at,
            },
            unreadCount: 0,
          });
        }
      } else {
        const otherUserId = raw.sender_id === userId
          ? raw.sender_id
          : raw.sender_id;
        convKey = `internal:${otherUserId}`;
        if (!conversationMap.has(convKey)) {
          const otherMember = memberMap.get(otherUserId);
          conversationMap.set(convKey, {
            type: 'INTERNAL',
            participantId: otherUserId,
            participantName: raw.sender_name,
            participantRole: otherMember?.officeRole || 'AGENT',
            lastMessage: {
              id: raw.msg_id,
              senderId: raw.sender_id,
              senderName: raw.sender_name,
              content: raw.content,
              createdAt: raw.created_at,
            },
            unreadCount: 0,
          });
        }
      }
    }

    for (const [key, conv] of conversationMap) {
      const lastMsgId = conv.lastMessage.id;
      const readCount = await this.readRepo
        .createQueryBuilder('r')
        .where('r.messageId = :msgId', { msgId: lastMsgId })
        .andWhere('r.memberId = :memberId', { memberId: member.id })
        .getCount();
      conv.unreadCount = readCount === 0 ? 1 : 0;
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
    );
  }

  async getThread(
    institutionId: string,
    userId: string,
    params: { dossierId?: string; participantId?: string },
  ) {
    const member = await this.memberRepo.findOne({
      where: { userId, institutionId, isActive: true },
    });
    if (!member) throw new BadRequestException('Vous n\'êtes pas membre de ce bureau');

    const qb = this.msgRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.dossier', 'dossier')
      .where('msg.institutionId = :institutionId', { institutionId })
      .andWhere('msg.parentId IS NULL')
      .orderBy('msg.createdAt', 'ASC');

    if (params.dossierId) {
      qb.andWhere('msg.dossierId = :dossierId', { dossierId: params.dossierId });
    } else if (params.participantId) {
      qb.andWhere(
        '(msg.senderId = :userId OR msg.senderId = :pid)',
        { userId, pid: params.participantId },
      );
    }

    const messages = await qb.getMany();

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const reads = await this.readRepo.find({
          where: { messageId: msg.id },
          relations: ['member', 'member.user'],
        });
        const replies = await this.msgRepo.find({
          where: { parentId: msg.id },
          relations: ['sender'],
          order: { createdAt: 'ASC' },
        });
        const enrichedReplies = await Promise.all(
          replies.map(async (reply) => {
            const replyReads = await this.readRepo.find({
              where: { messageId: reply.id },
              relations: ['member', 'member.user'],
            });
            return {
              ...reply,
              readBy: replyReads.map((r) => ({
                memberId: r.memberId,
                userName: r.member?.user?.name,
                readAt: r.readAt,
              })),
            };
          }),
        );
        return {
          ...msg,
          readBy: reads.map((r) => ({
            memberId: r.memberId,
            userName: r.member?.user?.name,
            readAt: r.readAt,
          })),
          replies: enrichedReplies,
        };
      }),
    );

    return enriched;
  }

  async sendMessage(
    senderId: string,
    institutionId: string,
    dto: {
      content: string;
      context: MessageContext;
      dossierId?: string;
      parentId?: string;
      recipientId?: string;
    },
  ) {
    const member = await this.memberRepo.findOne({
      where: { userId: senderId, institutionId, isActive: true },
    });
    if (!member) throw new BadRequestException('Vous n\'êtes pas membre de ce bureau');

    if (dto.context === MessageContext.DOSSIER && !dto.dossierId) {
      throw new BadRequestException('Un dossierId est requis pour les messages de dossier');
    }

    const msg = this.msgRepo.create({
      senderId,
      institutionId,
      content: dto.content,
      context: dto.context,
      dossierId: dto.dossierId || null,
      parentId: dto.parentId || null,
    });
    const saved = await this.msgRepo.save(msg);

    const allMembers = await this.memberRepo.find({
      where: { institutionId, isActive: true },
    });

    if (dto.context === MessageContext.INTERNAL && dto.recipientId) {
      const recipientMember = allMembers.find((m) => m.userId === dto.recipientId);
      if (recipientMember) {
        await this.readRepo.save(
          this.readRepo.create({
            messageId: saved.id,
            memberId: recipientMember.id,
          }),
        );
      }
    }

    return saved;
  }

  async markAsRead(messageId: string, userId: string, institutionId: string) {
    const member = await this.memberRepo.findOne({
      where: { userId, institutionId, isActive: true },
    });
    if (!member) return;

    const existing = await this.readRepo.findOne({
      where: { messageId, memberId: member.id },
    });
    if (!existing) {
      await this.readRepo.save(
        this.readRepo.create({ messageId, memberId: member.id }),
      );
    }
  }

  async markThreadAsRead(
    userId: string,
    institutionId: string,
    params: { dossierId?: string; participantId?: string },
  ) {
    const member = await this.memberRepo.findOne({
      where: { userId, institutionId, isActive: true },
    });
    if (!member) return;

    const qb = this.msgRepo.createQueryBuilder('msg')
      .where('msg.institutionId = :institutionId', { institutionId })
      .andWhere('msg.parentId IS NULL');

    if (params.dossierId) {
      qb.andWhere('msg.dossierId = :dossierId', { dossierId: params.dossierId });
    } else if (params.participantId) {
      qb.andWhere(
        '(msg.senderId = :userId OR msg.senderId = :pid)',
        { userId, pid: params.participantId },
      );
    }

    const messages = await qb.getMany();

    for (const msg of messages) {
      const existing = await this.readRepo.findOne({
        where: { messageId: msg.id, memberId: member.id },
      });
      if (!existing) {
        await this.readRepo.save(
          this.readRepo.create({ messageId: msg.id, memberId: member.id }),
        );
      }
    }
  }

  async getUnreadCount(institutionId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { userId, institutionId, isActive: true },
    });
    if (!member) return 0;

    const totalMessages = await this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.institutionId = :institutionId', { institutionId })
      .andWhere('msg.parentId IS NULL')
      .andWhere('msg.senderId != :userId', { userId })
      .getCount();

    const readMessages = await this.readRepo
      .createQueryBuilder('r')
      .innerJoin('r.message', 'msg')
      .where('msg.institutionId = :institutionId', { institutionId })
      .andWhere('msg.parentId IS NULL')
      .andWhere('msg.senderId != :userId', { userId })
      .andWhere('r.memberId = :memberId', { memberId: member.id })
      .getCount();

    return totalMessages - readMessages;
  }
}
