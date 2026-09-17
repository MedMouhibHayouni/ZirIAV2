import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FinancialTransaction } from '../finance/entities/financial-transaction.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import * as os from 'os';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FinancialTransaction)
    private readonly txRepo: Repository<FinancialTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getKpis() {
    // Run all KPI queries in parallel
    const [
      usersRoleRes,
      todayTxRes,
      todayCommRes,
      listingsRes,
      auctionsRes,
      diseaseRes,
      newUsersRes,
      pendingValidationsRes,
      subscriptionsRes,
    ] = await Promise.all([
      this.dataSource.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      this.dataSource.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount_tnd), 0) as total FROM financial_records WHERE DATE(recorded_at) = CURRENT_DATE`),
      this.dataSource.query(`SELECT COALESCE(SUM(amount_tnd), 0) as total FROM platform_commissions WHERE DATE(collected_at) = CURRENT_DATE`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM marketplace_listings WHERE status = 'ACTIVE'`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM land_auctions WHERE status = 'ACTIVE'`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM disease_detections WHERE created_at >= NOW() - INTERVAL '7 days'`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
      this.dataSource.query(`SELECT COUNT(*) as count FROM users WHERE verified = false`),
      this.dataSource.query(`SELECT p.code as plan, COUNT(s.id) as count FROM subscription_plans p LEFT JOIN user_subscriptions s ON p.id = s.plan_id AND s.status = 'ACTIVE' GROUP BY p.code`),
    ]).catch(err => {
      console.error('KPI Query Error', err);
      return [[], [{count: 0, total: 0}], [{total: 0}], [{count: 0}], [{count: 0}], [{count: 0}], [{count: 0}], [{count: 0}], []];
    });

    // Active subscription revenue
    let activeSubRevenue = 0;
    try {
      const revRes = await this.dataSource.query(`
        SELECT COALESCE(SUM(p.price_tnd), 0) as total
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'ACTIVE'
      `);
      activeSubRevenue = parseFloat(revRes[0]?.total || '0');
    } catch (e) {
      this.logger.error('getKpis: activeSubRevenue query failed', e.stack);
      throw new ServiceUnavailableException('Statistiques temporairement indisponibles');
    }

    const active_users_by_role = usersRoleRes.reduce((acc, row) => ({ ...acc, [row.role]: parseInt(row.count, 10) }), {});
    const active_subscriptions_by_plan = subscriptionsRes.reduce((acc, row) => ({ ...acc, [row.plan]: parseInt(row.count, 10) }), {});

    return {
      active_users_by_role,
      transactions_today: parseInt(todayTxRes[0]?.count || '0', 10),
      commission_today_tnd: parseFloat(todayCommRes[0]?.total || '0'),
      active_listings: parseInt(listingsRes[0]?.count || '0', 10),
      active_auctions: parseInt(auctionsRes[0]?.count || '0', 10),
      disease_detections_this_week: parseInt(diseaseRes[0]?.count || '0', 10),
      new_users_this_week: parseInt(newUsersRes[0]?.count || '0', 10),
      pending_validations: parseInt(pendingValidationsRes[0]?.count || '0', 10),
      active_subscriptions_by_plan,
      active_subscription_revenue_tnd: activeSubRevenue,
    };
  }

  async getRecentTransactions(page = 1, limit = 20, type?: string, from?: string, to?: string, governorate?: string) {
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        pc.id,
        pc.transaction_type as type,
        pc.collected_at as date,
        pc.transaction_value_tnd as gross_tnd,
        pc.amount_tnd as commission_tnd,
        'N/A' as payer_name,
        'N/A' as payee_name,
        'N/A' as governorate,
        'COMPLETED' as status
      FROM platform_commissions pc
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type) {
      params.push(type);
      query += ` AND pc.transaction_type = $${params.length}`;
    }
    if (from) {
      params.push(from);
      query += ` AND pc.collected_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND pc.collected_at <= $${params.length}`;
    }

    query += ` ORDER BY pc.collected_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const items = await this.dataSource.query(query, params);

    let countQuery = `SELECT COUNT(*) FROM platform_commissions pc WHERE 1=1`;
    const countParams: any[] = [];
    if (type) { countParams.push(type); countQuery += ` AND pc.transaction_type = $${countParams.length}`; }
    if (from) { countParams.push(from); countQuery += ` AND pc.collected_at >= $${countParams.length}`; }
    if (to) { countParams.push(to); countQuery += ` AND pc.collected_at <= $${countParams.length}`; }

    // Summary for the period
    let summaryQuery = `SELECT COALESCE(SUM(transaction_value_tnd),0) as total_tnd, COALESCE(SUM(amount_tnd),0) as total_commission, COUNT(*) as tx_count FROM platform_commissions pc WHERE 1=1`;
    const summaryParams = [...countParams];
    if (type) { summaryParams.push(type); summaryQuery += ` AND pc.transaction_type = $${summaryParams.length}`; }
    if (from) { summaryParams.push(from); summaryQuery += ` AND pc.collected_at >= $${summaryParams.length}`; }
    if (to) { summaryParams.push(to); summaryQuery += ` AND pc.collected_at <= $${summaryParams.length}`; }

    const [totalRes, summaryRes] = await Promise.all([
      this.dataSource.query(countQuery, countParams),
      this.dataSource.query(`SELECT COALESCE(SUM(transaction_value_tnd),0) as total_tnd, COALESCE(SUM(amount_tnd),0) as total_commission, COUNT(*) as tx_count, COALESCE(AVG(transaction_value_tnd),0) as avg_tnd FROM platform_commissions`),
    ]);

    const total = parseInt(totalRes[0].count, 10);
    const summary = {
      total_tnd: parseFloat(summaryRes[0]?.total_tnd || '0'),
      total_commission: parseFloat(summaryRes[0]?.total_commission || '0'),
      tx_count: parseInt(summaryRes[0]?.tx_count || '0', 10),
      avg_tnd: parseFloat(summaryRes[0]?.avg_tnd || '0'),
    };

    return { items, total, page, limit, summary };
  }

  async getUsers(page = 1, limit = 20, role?: string, governorate?: string, status?: string, plan?: string, search?: string) {
    const qb = this.userRepo.createQueryBuilder('u')
      .withDeleted()
      .orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (role) qb.andWhere('u.role = :role', { role });
    if (governorate) qb.andWhere('u.governorate = :governorate', { governorate });
    if (search) qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });
    if (status === 'ACTIVE') qb.andWhere('u.verified = true AND u.deleted_at IS NULL AND u.is_banned = false');
    else if (status === 'SUSPENDED') qb.andWhere('u.verified = false AND u.deleted_at IS NULL AND u.is_banned = false');
    else if (status === 'BANNED') qb.andWhere('u.is_banned = true AND u.deleted_at IS NULL');
    else if (status === 'DELETED') qb.andWhere('u.deleted_at IS NOT NULL');

    // Plan filter via raw SQL subquery
    if (plan) {
      const planCode = plan.toUpperCase();
      qb.andWhere(
        `u.id IN (SELECT us.user_id FROM user_subscriptions us INNER JOIN subscription_plans sp ON us.plan_id = sp.id WHERE sp.code::text = :planCode AND us.status = 'ACTIVE')`,
        { planCode }
      );
    }

    const [items, total] = await qb.getManyAndCount();

    // Attach active plan to each user
    if (items.length) {
      const userIds = items.map(u => u.id);
      const subscriptions = await this.dataSource.query(`
        SELECT s.user_id, sp.code::text as plan
        FROM user_subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.status = 'ACTIVE' AND s.user_id = ANY($1)
      `, [userIds]).catch((err) => {
        this.logger.error('getUsers: subscription enrichment query failed', err.stack);
        throw new ServiceUnavailableException('Liste utilisateurs temporairement indisponible');
      });
      const planMap = Object.fromEntries(subscriptions.map((s: any) => [s.user_id, s.plan]));
      for (const user of items) {
        (user as any).plan = planMap[user.id] || null;
      }
    }

    return { items, total, page, limit };
  }

  async getPendingVerifications() {
    return this.userRepo.find({
      where: { verified: false, is_banned: false },
      order: { created_at: 'ASC' }
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Fetch subscription with error resilience
    let subscription = null;
    try {
      if (user.role === 'SUPPLIER') {
        const supSubRes = await this.dataSource.query(`
          SELECT plan_code as plan_name, expires_at as end_date
          FROM supplier_subscriptions
          WHERE supplier_id = $1 AND status = 'ACTIVE'
        `, [userId]).catch((err) => {
          this.logger.error(`getUserDetail: supplier subscription query failed for ${userId}`, err.stack);
          throw new ServiceUnavailableException('Détail utilisateur temporairement indisponible');
        });
        subscription = supSubRes[0] || null;
      } else {
        const subRes = await this.dataSource.query(`
          SELECT COALESCE(p.code::text, p.name_fr) as plan_name, p.id as plan_id,
            s.expires_at as end_date
          FROM user_subscriptions s
          LEFT JOIN subscription_plans p ON s.plan_id = p.id
          WHERE s.user_id = $1 AND s.status = 'ACTIVE'
        `, [userId]).catch(() => []);
        subscription = subRes[0] || null;
      }
    } catch (e) {
      subscription = null;
    }

    // Fetch stats based on role with per-query error handling
    let stats = { diagnostics: 0, activeListings: 0, orders: 0 };
    try {
      if (user.role === 'SUPPLIER') {
        const [pRes, oRes] = await Promise.all([
          this.dataSource.query(`SELECT COUNT(*) as count FROM products WHERE supplier_id = $1`, [userId]).catch((err) => {
            this.logger.error(`getUserDetail: supplier stats query failed for ${userId}`, err.stack);
            throw new ServiceUnavailableException('Détail utilisateur temporairement indisponible');
          }),
          this.dataSource.query(`SELECT COUNT(*) as count FROM product_orders WHERE supplier_id = $1`, [userId]).catch(() => [{ count: 0 }]),
        ]);
        stats = {
          diagnostics: 0,
          activeListings: parseInt(pRes[0]?.count || '0', 10),
          orders: parseInt(oRes[0]?.count || '0', 10),
        };
      } else {
        const [dRes, lRes, oRes] = await Promise.all([
          this.dataSource.query(`SELECT COUNT(*) as count FROM disease_detections WHERE reporter_id = $1`, [userId]).catch(() => [{ count: 0 }]),
          this.dataSource.query(`SELECT COUNT(*) as count FROM marketplace_listings WHERE seller_id = $1 AND status = 'ACTIVE'`, [userId]).catch(() => [{ count: 0 }]),
          this.dataSource.query(`SELECT COUNT(*) as count FROM supplier_purchase_orders WHERE supplier_id = $1`, [userId]).catch(() =>
            this.dataSource.query(`SELECT COUNT(*) as count FROM platform_commissions WHERE user_id = $1`, [userId]).catch(() => [{ count: 0 }])
          ),
        ]);
        stats = {
          diagnostics: parseInt(dRes[0]?.count || '0', 10),
          activeListings: parseInt(lRes[0]?.count || '0', 10),
          orders: parseInt(oRes[0]?.count || '0', 10),
        };
      }
    } catch (e) {
      stats = { diagnostics: 0, activeListings: 0, orders: 0 };
    }

    return { user, subscription, stats };
  }

  async getUserPaymentHistory(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    let history: any[] = [];

    if (user.role === 'SUPPLIER') {
      const supHistory = await this.dataSource.query(`
        SELECT 
          id,
          plan_code as plan_name,
          status,
          started_at as start_date,
          expires_at as end_date,
          'SUPPLIER_SUBSCRIPTION' as type,
          0 as price_tnd
        FROM supplier_subscriptions
        WHERE supplier_id = $1
        ORDER BY started_at DESC
      `, [userId]).catch((err) => {
        this.logger.error(`getUserPaymentHistory query failed for ${userId}`, err.stack);
        throw new ServiceUnavailableException('Historique paiements temporairement indisponible');
      });
      history = supHistory;
    } else {
      const subHistory = await this.dataSource.query(`
        SELECT 
          s.id,
          COALESCE(p.name_fr, p.code::text) as plan_name,
          p.code::text as plan_code,
          p.price_tnd,
          s.status,
          s.started_at as start_date,
          s.expires_at as end_date,
          'USER_SUBSCRIPTION' as type
        FROM user_subscriptions s
        LEFT JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.started_at DESC
      `, [userId]).catch(() => []);
      history = subHistory;
    }

    const commissions = await this.dataSource.query(`
      SELECT 
        id,
        transaction_type as type,
        transaction_value_tnd,
        amount_tnd as commission_tnd,
        collected_at as date,
        'COMMISSION' as record_type
      FROM platform_commissions
      WHERE user_id = $1
      ORDER BY collected_at DESC
      LIMIT 20
    `, [userId]).catch(() => []);

    return {
      subscriptions: history,
      commissions,
    };
  }

  async changeUserPlan(userId: string, planId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (user.role === 'SUPPLIER') {
      await this.dataSource.query(`UPDATE supplier_subscriptions SET status = 'CANCELLED' WHERE supplier_id = $1 AND status = 'ACTIVE'`, [userId]);
      if (planId !== 'freemium') {
        const planCode = planId.toUpperCase().includes('VITRINE') || planId.toUpperCase().includes('ERP') ? planId : 'VITRINE_BASIC';
        await this.dataSource.query(`
          INSERT INTO supplier_subscriptions (supplier_id, plan_code, status, started_at, expires_at) 
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')
        `, [userId, planCode]);
      }
      await this.notificationService.sendPushToUser(userId, {
        title: "Plan d'abonnement fournisseur mis à jour",
        message: `Votre abonnement a été changé vers le plan ${planId}.`,
        payload: { type: 'PLAN_UPDATED' }
      });
    } else {
      const planCode = planId.toUpperCase();

      // Cancel any active subscription
      await this.dataSource.query(
        `UPDATE user_subscriptions SET status = 'CANCELLED' WHERE user_id = $1 AND status = 'ACTIVE'`,
        [userId]
      );

      // 'FREE' means cancel only, no new subscription
      if (planCode !== 'FREE') {
        let planLookup = await this.dataSource.query(
          `SELECT id, name_fr as plan_name FROM subscription_plans WHERE code::text = $1`,
          [planCode]
        ).catch((err) => {
          this.logger.error(`updateUserPlan: plan lookup failed for ${planCode}`, err.stack);
          throw new ServiceUnavailableException('Mise à jour du plan temporairement indisponible');
        });

        if (!planLookup.length) {
          // Auto-create plan if it doesn't exist
          try {
            await this.dataSource.query(`
              INSERT INTO subscription_plans (id, code, name_fr, price_tnd)
              VALUES (gen_random_uuid(), $1, $2, 0)
              ON CONFLICT (code) DO NOTHING
            `, [planCode, planCode]);
            planLookup = await this.dataSource.query(
              `SELECT id, name_fr as plan_name FROM subscription_plans WHERE code::text = $1`,
              [planCode]
            ).catch(() => []);
          } catch (e) { /* ignore insert failure */ }
        }

        if (!planLookup.length) {
          const allPlans = await this.dataSource.query(`SELECT code, name_fr FROM subscription_plans`).catch(() => []);
          throw new BadRequestException(
            `Plan "${planId}" introuvable. Codes dispo: ${allPlans.map(p => p.code).join(', ') || 'aucun'}`
          );
        }
        const resolvedPlanId = planLookup[0].id;

        await this.dataSource.query(`
          INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at)
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '1 year')
        `, [userId, resolvedPlanId]);

        await this.notificationService.sendPushToUser(userId, {
          title: "Plan d'abonnement mis à jour",
          message: `Votre abonnement a été changé vers le plan ${planLookup[0].plan_name || planCode}.`,
          payload: { type: 'PLAN_UPDATED' }
        });
      } else {
        await this.notificationService.sendPushToUser(userId, {
          title: "Abonnement résilié",
          message: "Votre abonnement a été annulé. Vous êtes maintenant en mode Freemium.",
          payload: { type: 'PLAN_UPDATED' }
        });
      }
    }
    return { success: true };
  }

  async changeUserRole(userId: string, role: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const validRoles = ['FARMER','B2B_BUYER','SUPPLIER','DRIVER','WORKER','EXPERT','LAND_OWNER','EQUIP_OWNER','FARMER_AMBASSADOR','COOP_PRESIDENT'];
    if (!validRoles.includes(role)) throw new BadRequestException('Rôle invalide');

    user.role = role as any;
    await this.userRepo.save(user);

    await this.notificationService.sendPushToUser(userId, {
      title: 'Rôle mis à jour',
      message: `Votre rôle sur ZirIA a été mis à jour: ${role}.`,
      payload: { type: 'ROLE_UPDATED' }
    });

    this.dataSource.query(`INSERT INTO audit_logs (action, user_id, timestamp) VALUES ($1, $2, NOW())`, ['ROLE_CHANGED', userId]).catch((err) => {
      this.logger.error(`changeUserRole: audit log write failed for ${userId}`, err.stack);
      throw new ServiceUnavailableException('Journalisation temporairement indisponible');
    });
    return { success: true, role };
  }

  async verifyUser(userId: string, approved: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (approved) {
      user.verified = true;
      await this.userRepo.save(user);
      await this.notificationService.sendPushToUser(userId, {
        title: "Compte Vérifié",
        message: "Votre compte ZirIA a été vérifié avec succès. Bienvenue !",
        payload: { type: 'ACCOUNT_VERIFIED' }
      });
      return { success: true, message: 'Utilisateur vérifié' };
    } else {
      await this.userRepo.softRemove(user);
      return { success: true, message: 'Utilisateur rejeté et supprimé' };
    }
  }

  async suspendUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.is_banned) throw new BadRequestException('Impossible de suspendre un utilisateur banni.');

    user.verified = false;
    await this.userRepo.save(user);

    await this.notificationService.sendPushToUser(userId, {
      title: 'Compte Suspendu',
      message: 'Votre compte ZirIA a été temporairement suspendu. Contactez le support.',
      payload: { type: 'ACCOUNT_SUSPENDED' }
    });

    this.dataSource.query(`INSERT INTO audit_logs (action, user_id, timestamp) VALUES ($1, $2, NOW())`, ['USER_SUSPENDED', userId]).catch(() => {});
    return { success: true, message: 'Utilisateur suspendu' };
  }

  async banUser(userId: string, reason?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    user.verified = false;
    user.is_banned = true;
    await this.userRepo.save(user);

    // Cancel all active subscriptions
    await this.dataSource.query(`UPDATE user_subscriptions SET status = 'CANCELLED' WHERE user_id = $1 AND status = 'ACTIVE'`, [userId]).catch((err) => {
      this.logger.error(`banUser: subscription cancel failed for ${userId}`, err.stack);
      throw new ServiceUnavailableException('Bannissement incomplet: annulation abonnement impossible');
    });
    await this.dataSource.query(`UPDATE supplier_subscriptions SET status = 'CANCELLED' WHERE supplier_id = $1 AND status = 'ACTIVE'`, [userId]).catch(() => {});

    // Deactivate all listings
    await this.dataSource.query(`UPDATE marketplace_listings SET status = 'INACTIVE' WHERE seller_id = $1`, [userId]).catch(() => {});

    const banMessage = reason ? `Raison: ${reason}` : 'Violation des Conditions d\'Utilisation';
    await this.notificationService.sendPushToUser(userId, {
      title: 'Compte Banni',
      message: `Votre compte a été définitivement banni de la plateforme ZirIA. ${banMessage}`,
      payload: { type: 'ACCOUNT_BANNED' }
    });

    this.dataSource.query(`INSERT INTO audit_logs (action, user_id, notes, timestamp) VALUES ($1, $2, $3, NOW())`, ['USER_BANNED', userId, reason || 'Violation des CGU']).catch(() => {});
    return { success: true, message: 'Utilisateur banni' };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.userRepo.softRemove(user);
    return { success: true, message: 'Utilisateur supprimé (soft delete)' };
  }

  async createUser(dto: {
    name: string;
    email: string;
    phone?: string;
    governorate?: string;
    role: string;
    expert_type?: string;
    activity_type?: string;
    planId?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Un utilisateur avec cet email existe déjà');

    const defaultPassword = 'Ziria2026!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = new User();
    user.name = dto.name;
    user.email = dto.email;
    user.phone = dto.phone ?? null;
    user.governorate = dto.governorate ?? '';
    user.role = dto.role as any;
    user.expert_type = dto.expert_type as any;
    user.activity_type = dto.activity_type as any;
    user.password_hash = hashedPassword;
    user.verified = true;

    const saved = await this.userRepo.save(user);

    // Assign plan if provided
    if (dto.planId && dto.planId !== 'freemium') {
      const planCode = dto.planId.toUpperCase();
      const plan = await this.dataSource.query(
        `SELECT id FROM subscription_plans WHERE code::text = $1`,
        [planCode]
      ).catch(() => []);
      if (plan.length) {
        await this.dataSource.query(`
          INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at)
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '1 year')
        `, [saved.id, plan[0].id]).catch((err) => {
          this.logger.error(`createUser: plan assignment failed for ${saved.id}`, err.stack);
          throw new ServiceUnavailableException('Création incomplète: assignation du plan impossible');
        });
      }
    }

    // Send welcome notification
    await this.notificationService.sendPushToUser(saved.id, {
      title: 'Bienvenue sur ZirIA !',
      message: `Votre compte ${dto.role} a été créé par l'administrateur. Mot de passe par défaut: ${defaultPassword}`,
      payload: { type: 'ACCOUNT_CREATED' }
    });

    this.dataSource.query(`INSERT INTO audit_logs (action, user_id, timestamp) VALUES ($1, $2, NOW())`, ['USER_CREATED_BY_ADMIN', saved.id]).catch(() => {});

    return { success: true, user: saved };
  }

  async getExpertsAndAmbassadors() {
    const [experts, ambassadors, govCoverage] = await Promise.all([
      // Experts with farmer count
      this.dataSource.query(`
        SELECT 
          u.id, u.name, u.email, u.governorate, u.verified, u.created_at,
          u.expert_type,
          COUNT(DISTINCT ef.farmer_id) as farmer_count,
          COALESCE(AVG(er.rating), 0) as avg_rating,
          COUNT(DISTINCT er.id) as review_count
        FROM users u
        LEFT JOIN expert_farmers ef ON ef.expert_id = u.id
        LEFT JOIN expert_reviews er ON er.expert_id = u.id
        WHERE u.role = 'EXPERT' AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.governorate, u.expert_type
      `).catch(() => []),

      // Ambassadors with registered farmers count
      this.dataSource.query(`
        SELECT 
          u.id, u.name, u.email, u.governorate, u.verified, u.created_at,
          COUNT(DISTINCT f.id) as farmers_registered,
          COUNT(DISTINCT dd.id) as diagnostics_filed
        FROM users u
        LEFT JOIN users f ON f.governorate = u.governorate AND f.role = 'FARMER'
        LEFT JOIN disease_detections dd ON dd.reporter_id = u.id
        WHERE u.role = 'FARMER_AMBASSADOR' AND u.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY u.governorate
      `).catch(() => []),

      // Governorate coverage: count of experts + ambassadors + farmers per governorate
      this.dataSource.query(`
        SELECT 
          u.governorate,
          COUNT(CASE WHEN u.role = 'EXPERT' THEN 1 END) as expert_count,
          COUNT(CASE WHEN u.role = 'FARMER_AMBASSADOR' THEN 1 END) as ambassador_count,
          COUNT(CASE WHEN u.role = 'FARMER' THEN 1 END) as farmer_count
        FROM users u
        WHERE u.deleted_at IS NULL AND u.governorate IS NOT NULL
        GROUP BY u.governorate
        ORDER BY u.governorate
      `).catch(() => []),
    ]);

    return { experts, ambassadors, govCoverage };
  }

  async getSystemHealth() {
    const uptime = process.uptime();

    let dbStatus = 'ERROR';
    try {
      await this.dataSource.query(`SELECT 1`);
      dbStatus = 'OK';
    } catch (e) {}

    let pendingCommissions = 0;
    try {
      const res = await this.dataSource.query(`SELECT COUNT(*) as count FROM marketplace_connections WHERE status = 'PENDING'`);
      pendingCommissions = parseInt(res[0].count, 10);
    } catch (e) {}

    // Total users count
    let totalUsers = 0;
    try {
      const res = await this.dataSource.query(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`);
      totalUsers = parseInt(res[0].count, 10);
    } catch (e) {}

    return {
      db_status: dbStatus,
      websocket_connections: this.notificationGateway.getConnectedUsersCount(),
      pending_commissions: pendingCommissions,
      uptime_seconds: uptime,
      node_env: process.env.NODE_ENV || 'development',
      total_users: totalUsers,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpu_count: os.cpus().length,
    };
  }

  async getBtsReport() {
    let totalUsers = 0, totalTransactions = 0, subscriptionRevenue = 0;
    try {
      const totalUsersRes = await this.dataSource.query(`SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`).catch(() => [{ count: 0 }]);
      totalUsers = parseInt(totalUsersRes[0]?.count || '0', 10);
    } catch (e) {}

    try {
      const totalTxRes = await this.dataSource.query(`SELECT COUNT(*) as count FROM platform_commissions`).catch(() => [{ count: 0 }]);
      totalTransactions = parseInt(totalTxRes[0]?.count || '0', 10);
    } catch (e) {}

    try {
      const subRevRes = await this.dataSource.query(`
        SELECT COALESCE(SUM(p.price_tnd), 0) as total 
        FROM user_subscriptions s 
        LEFT JOIN subscription_plans p ON s.plan_id = p.id 
        WHERE s.status = 'ACTIVE'
      `).catch(() => [{ total: 0 }]);
      subscriptionRevenue = parseFloat(subRevRes[0]?.total || '0');
    } catch (e) {}

    let monthly_revenue: any[] = [];
    try {
      const monthlyRevRes = await this.dataSource.query(`
        SELECT 
          TO_CHAR(collected_at, 'YYYY-MM') as month, 
          SUM(amount_tnd) as commission_tnd, 
          COUNT(*) as transaction_count
        FROM platform_commissions
        WHERE collected_at >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(collected_at, 'YYYY-MM')
        ORDER BY month ASC
      `).catch(() => []);

      monthly_revenue = (monthlyRevRes || []).map(r => ({
        month: r.month,
        commission_tnd: parseFloat(r.commission_tnd || '0'),
        transaction_count: parseInt(r.transaction_count || '0', 10),
      }));
    } catch (e) {
      monthly_revenue = [];
    }

    let growthRate = 0;
    if (monthly_revenue.length >= 2) {
      const thisMonth = monthly_revenue[monthly_revenue.length - 1].commission_tnd;
      const lastMonth = monthly_revenue[monthly_revenue.length - 2].commission_tnd;
      if (lastMonth > 0) {
        growthRate = ((thisMonth - lastMonth) / lastMonth) * 100;
      }
    }

    return {
      period: 'Last 6 months',
      monthly_revenue,
      total_active_users: totalUsers,
      total_transactions: totalTransactions,
      subscription_revenue_tnd: subscriptionRevenue,
      growth_rate_pct: parseFloat(growthRate.toFixed(2)),
    };
  }
}
