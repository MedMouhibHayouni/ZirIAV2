import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cooperative } from './entities/cooperative.entity';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class CooperativesService {
  constructor(
    @InjectRepository(Cooperative)
    private readonly repo: Repository<Cooperative>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateCooperativeDto, presidentId: string): Promise<Cooperative> {
    const coop = this.repo.create({ ...dto, president_id: presidentId });
    return this.repo.save(coop);
  }

  findAll(): Promise<Cooperative[]> {
    return this.repo.find({ relations: ['president'] });
  }

  async findOne(id: string): Promise<Cooperative> {
    const coop = await this.repo.findOne({ where: { id }, relations: ['president'] });
    if (!coop) throw new NotFoundException(`Coopérative ${id} introuvable`);
    return coop;
  }

  async update(id: string, dto: Partial<CreateCooperativeDto>, userId: string, isAdmin: boolean): Promise<Cooperative> {
    const coop = await this.findOne(id);
    if (!isAdmin && coop.president_id !== userId) {
      throw new ForbiddenException('Modification réservée au président ou à un admin');
    }
    Object.assign(coop, dto);
    return this.repo.save(coop);
  }

  async remove(id: string): Promise<void> {
    const coop = await this.findOne(id);
    await this.repo.remove(coop);
  }

  async getMyMembers(presidentId: string): Promise<User[]> {
    const coop = await this.repo.findOne({ where: { president_id: presidentId } });
    if (!coop) throw new NotFoundException('Vous ne gérez aucune coopérative');
    
    // Sprint 4: Only return FARMER and FARMER_AMBASSADOR roles — no admin/expert leakage
    return this.dataSource.query(`
      SELECT id, email, name, phone, governorate, delegation, role, verified, created_at, cooperative_id
      FROM users
      WHERE cooperative_id = $1
        AND role IN ('FARMER', 'FARMER_AMBASSADOR')
      ORDER BY name ASC
    `, [coop.id]);
  }

  async addMember(presidentId: string, memberData: any): Promise<User> {
    const coop = await this.repo.findOne({ where: { president_id: presidentId } });
    if (!coop) throw new NotFoundException('Vous ne gérez aucune coopérative');

    const existingUser = await this.userRepo.findOne({ where: { email: memberData.email } });
    if (existingUser) throw new BadRequestException('Un utilisateur avec cet email existe déjà');

    const hash = await bcrypt.hash('Ziria2026!', 10);
    const newUser = this.userRepo.create({
      ...memberData,
      password_hash: hash,
      role: Role.FARMER_AMBASSADOR,
      cooperative_id: coop.id,
      verified: true
    } as any) as unknown as User;

    return this.userRepo.save(newUser);
  }

  async getCoopStats(presidentId: string) {
    const coop = await this.repo.findOne({ where: { president_id: presidentId } });
    if (!coop) throw new NotFoundException('Vous ne gérez aucune coopérative');

    const memberCount = await this.userRepo.count({ where: { cooperative_id: coop.id } });
    
    const listingsCount = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM marketplace_listings ml
      JOIN users u ON ml.seller_id = u.id
      WHERE u.cooperative_id = $1 AND ml.status = 'ACTIVE'
    `, [coop.id]);

    const pendingConnections = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM marketplace_connections mc
      JOIN users u ON mc.seller_id = u.id
      WHERE u.cooperative_id = $1 AND mc.status = 'PENDING'
    `, [coop.id]);

    const activeAlerts = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM disease_detections dd
      JOIN users u ON dd.reporter_id = u.id
      WHERE u.cooperative_id = $1 AND dd.created_at >= NOW() - INTERVAL '7 days'
    `, [coop.id]);

    return {
      cooperative_name: coop.name,
      total_members: memberCount,
      total_listings: parseInt(listingsCount[0].count, 10),
      pending_transactions: parseInt(pendingConnections[0].count, 10),
      active_alerts: parseInt(activeAlerts[0].count, 10),
      monthly_revenue: 0 // Will implement later if needed
    };
  }

  /**
   * Flux d'activité réel depuis 3 tables : marketplace_connections,
   * disease_detections, et job_offers — triés par date DESC.
   */
  async getActivityFeed(presidentId: string, limit = 20): Promise<any[]> {
    try {
      const members = await this.getMyMembers(presidentId);
      if (!members.length) return [];

      const memberIds = members.map(m => m.id);
      // Paramètres PostgreSQL $1 = limit, $2...$N = memberIds
      const placeholders = memberIds.map((_, i) => `$${i + 2}`).join(',');

      // ── Connexions B2B (Marketplace) ─────────────────────────────────────────
      const b2bConnections = await this.dataSource.query(`
        SELECT 
          CONCAT('b2b_', mc.id) as id,
          'B2B_CONNECTION' as type,
          u.name as actor_name,
          CASE mc.status
            WHEN 'PENDING' THEN 'a initié une mise en relation B2B'
            WHEN 'CONFIRMED' THEN 'a conclu un contrat B2B'
            ELSE 'a refusé une mise en relation'
          END as action,
          ml.crop_type as entity_name,
          mc.created_at
        FROM marketplace_connections mc
        JOIN marketplace_listings ml ON mc.listing_id = ml.id
        JOIN users u ON ml.seller_id = u.id
        WHERE ml.seller_id IN (${placeholders})
        ORDER BY mc.created_at DESC
        LIMIT $1
      `, [limit, ...memberIds]);

      // ── Détections de maladies ────────────────────────────────────────────────
      const diseaseDetections = await this.dataSource.query(`
        SELECT 
          CONCAT('disease_', dd.id) as id,
          'DISEASE_DETECTION' as type,
          u.name as actor_name,
          CONCAT('a signalé une maladie (', CAST(dd.urgency AS TEXT), ')') as action,
          dd.disease_name as entity_name,
          dd.created_at
        FROM disease_detections dd
        JOIN users u ON dd.reporter_id = u.id
        WHERE dd.reporter_id IN (${placeholders})
        ORDER BY dd.created_at DESC
        LIMIT $1
      `, [limit, ...memberIds]);

      // ── Offres d'emploi ───────────────────────────────────────────────────────
      const jobOffers = await this.dataSource.query(`
        SELECT 
          CONCAT('job_', jo.id) as id,
          'JOB_OFFER' as type,
          u.name as actor_name,
          'a publié une offre d''emploi saisonnière' as action,
          jo.task_type as entity_name,
          jo.created_at
        FROM job_offers jo
        JOIN users u ON jo.employer_id = u.id
        WHERE jo.employer_id IN (${placeholders})
        ORDER BY jo.created_at DESC
        LIMIT $1
      `, [limit, ...memberIds]);

      // ── Merge et tri global ───────────────────────────────────────────────────
      const feed = [
        ...b2bConnections,
        ...diseaseDetections,
        ...jobOffers,
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return feed.slice(0, limit);
    } catch (error) {
      console.error('[CooperativesService] Error in getActivityFeed:', error);
      // Fallback empty to avoid 500
      return [];
    }
  }

  async broadcastToMembers(presidentId: string, message: string): Promise<{ sent: number }> {
    const members = await this.getMyMembers(presidentId);
    if (!members.length) return { sent: 0 };
    const memberIds = members.map(m => m.id);
    await this.notificationService.sendToUsers(memberIds, '📢 Message de votre SMSA', message);
    return { sent: memberIds.length };
  }
}
