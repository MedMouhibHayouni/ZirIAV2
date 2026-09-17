import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Zone } from './entities/zone.entity';
import { FieldReport, FieldReportSeverity } from './entities/field-report.entity';
import { NotificationService } from '../notifications/notification.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AmbassadorService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)   private readonly userRepo: Repository<User>,
    @InjectRepository(Zone)   private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(FieldReport) private readonly reportRepo: Repository<FieldReport>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Get Ambassador's Zone ──────────────────────────────────────────────────
  private async getAmbassadorZone(ambassadorId: string): Promise<Zone> {
    let zone = await this.zoneRepo.findOne({ where: { ambassador_id: ambassadorId } });
    if (!zone) {
      // Auto-create a default zone if the ambassador doesn't have one
      const ambassador = await this.userRepo.findOne({ where: { id: ambassadorId } });
      const gov = ambassador?.governorate || 'Tunis';
      const del = ambassador?.delegation || 'Centre';
      
      zone = this.zoneRepo.create({
        name: `Zone ${gov} - ${del}`,
        delegation: del,
        governorate: gov,
        center_lat: ambassador?.lat || 33.8869,
        center_lng: ambassador?.lng || 9.5375,
        ambassador_id: ambassadorId,
      });
      await this.zoneRepo.save(zone);
      
      // Also update the ambassador's zone_id
      if (ambassador) {
        ambassador.zone_id = zone.id;
        await this.userRepo.save(ambassador);
      }
    }
    return zone;
  }

  // ── Privacy masking ────────────────────────────────────────────────────────
  private maskFarmer(farmer: any): any {
    const level = farmer.privacy_level ?? 'SEMI_PUBLIC';
    const last4 = (farmer.id as string).slice(-4);
    const base = {
      id: farmer.id, privacy_level: level,
      governorate: farmer.governorate, delegation: farmer.delegation,
      parcel_count: Number(farmer.parcel_count ?? 0),
      total_area_ha: Number(farmer.total_area_ha ?? 0),
      alert_level: farmer.alert_level ?? 'NONE',
      crop_types: farmer.crop_types ?? [],
      last_activity: farmer.last_activity,
    };
    if (level === 'ANONYMOUS') {
      return { ...base, display_name: `Agriculteur #${last4}`, phone: null, email: null };
    }
    if (level === 'SEMI_PUBLIC') {
      const parts = (farmer.name || '').split(' ');
      const first = parts[0] || '';
      const initial = parts[1]?.charAt(0) ? parts[1].charAt(0) + '.' : '';
      return { ...base, display_name: `${first} ${initial}`.trim(), phone: null, email: null };
    }
    return { ...base, display_name: farmer.name, name: farmer.name, phone: farmer.phone, email: farmer.email };
  }

  // ── Zone Stats ─────────────────────────────────────────────────────────────
  async getZoneStats(ambassadorId: string) {
    const zone = await this.getAmbassadorZone(ambassadorId);

    const farmers = await this.dataSource.query(`
      SELECT u.id FROM users u
      WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2)
        AND u.role = 'FARMER'
    `, [zone.id, ambassadorId]);

    if (!farmers.length) {
      return { zone, total_farmers: 0, active_farmers_this_week: 0, total_parcels: 0, total_area_ha: 0, active_alerts: { critical: 0, warning: 0, normal: 0 }, active_listings: 0, zone_health_score: 100, harvests_this_week: [] };
    }

    const ids = farmers.map((f: any) => f.id);
    const idList = ids.map((_: string, i: number) => `$${i + 1}`).join(',');

    const [parcelStats, alertStats, activeStats, listingsStats, harvestsStats] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as total_parcels, COALESCE(SUM(surface_ha),0) as total_area FROM parcels WHERE owner_id IN (${idList})`, [...ids]),
      this.dataSource.query(`SELECT urgency as alert_level, COUNT(*) as cnt FROM disease_detections WHERE reporter_id IN (${idList}) AND created_at >= NOW() - INTERVAL '30 days' GROUP BY urgency`, [...ids]),
      this.dataSource.query(`SELECT COUNT(DISTINCT owner_id) as active FROM parcels WHERE owner_id IN (${idList}) AND updated_at >= NOW() - INTERVAL '7 days'`, [...ids]),
      this.dataSource.query(`SELECT COUNT(*) as cnt FROM marketplace_listings WHERE seller_id IN (${idList}) AND status = 'ACTIVE'`, [...ids]),
      this.dataSource.query(`SELECT u.name, u.privacy_level, u.id, cz.crop_type, EXTRACT(DAY FROM (cz.harvest_prediction_date - NOW())) as eta_days FROM crop_zones cz JOIN parcels p ON p.id = cz.parcel_id JOIN users u ON u.id = p.owner_id WHERE p.owner_id IN (${idList}) AND cz.harvest_prediction_date BETWEEN NOW() AND NOW() + INTERVAL '14 days' ORDER BY cz.harvest_prediction_date`, [...ids]),
    ]);

    const alertMap: Record<string, number> = {};
    for (const row of alertStats) alertMap[row.alert_level] = Number(row.cnt);
    const critical = alertMap['CRITICAL'] ?? 0;
    const warning = alertMap['WARNING'] ?? 0;
    const totalParcels = Number(parcelStats[0]?.total_parcels ?? 1);
    const healthScore = Math.max(0, Math.round(100 - ((critical * 30 + warning * 10) / totalParcels)));

    return {
      zone,
      total_farmers: ids.length,
      active_farmers_this_week: Number(activeStats[0]?.active ?? 0),
      total_parcels: totalParcels,
      total_area_ha: Number(parcelStats[0]?.total_area ?? 0),
      active_alerts: { critical, warning, normal: alertMap['NORMAL'] ?? 0 },
      active_listings: Number(listingsStats[0]?.cnt ?? 0),
      zone_health_score: healthScore,
      harvests_this_week: harvestsStats.map((h: any) => ({
        farmer_display_name: this.maskFarmer(h).display_name,
        crop_type: h.crop_type,
        eta_days: Math.round(Number(h.eta_days ?? 0)),
      })),
    };
  }

  // ── Zone Farmers ───────────────────────────────────────────────────────────
  async getZoneFarmers(ambassadorId: string) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const rows = await this.dataSource.query(`
      SELECT u.id, u.name, u.email, u.phone, u.governorate, u.delegation, u.privacy_level, u.created_at,
        COUNT(DISTINCT p.id) as parcel_count,
        COALESCE(SUM(p.surface_ha), 0) as total_area_ha,
        MAX(p.updated_at) as last_activity,
        ARRAY_AGG(DISTINCT p.crop_type) FILTER (WHERE p.crop_type IS NOT NULL) as crop_types,
        COALESCE((SELECT urgency FROM disease_detections d WHERE d.reporter_id = u.id ORDER BY created_at DESC LIMIT 1)::text, 'NONE') as alert_level
      FROM users u
      LEFT JOIN parcels p ON p.owner_id = u.id
      WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2) AND u.role = 'FARMER'
      GROUP BY u.id, u.name, u.email, u.phone, u.governorate, u.delegation, u.privacy_level, u.created_at
      ORDER BY last_activity DESC NULLS LAST
    `, [zone.id, ambassadorId]);
    return rows.map((r: any) => this.maskFarmer(r));
  }

  // ── Zone Alerts ────────────────────────────────────────────────────────────
  async getZoneAlerts(ambassadorId: string) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const rows = await this.dataSource.query(`
      SELECT dd.id, dd.disease_name, dd.urgency as alert_level, dd.confidence_score, dd.created_at,
        dd.photo_url, dd.requires_expert_validation,
        u.id as farmer_id, u.name as farmer_name, u.privacy_level,
        p.name as parcel_name, p.crop_type
      FROM disease_detections dd
      JOIN users u ON u.id = dd.reporter_id
      LEFT JOIN parcels p ON p.id = dd.parcel_id
      WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2)
        AND dd.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY CASE dd.urgency WHEN 'CRITICAL' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, dd.created_at DESC
    `, [zone.id, ambassadorId]);

    return rows.map((r: any) => ({
      id: r.id,
      type: 'DISEASE',
      severity: r.alert_level,
      disease_name: r.disease_name,
      confidence_score: r.confidence_score,
      detected_at: r.created_at,
      farmer_display_name: this.maskFarmer({ ...r, id: r.farmer_id, name: r.farmer_name }).display_name,
      parcel_name: r.parcel_name,
      crop_type: r.crop_type,
      photo_url: r.photo_url,
      requires_action: r.requires_expert_validation,
    }));
  }

  // ── Register Farmer ────────────────────────────────────────────────────────
  async registerFarmer(ambassadorId: string, dto: {
    name: string; phone?: string; governorate: string; delegation?: string; privacy_level?: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';
  }) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const tempPass = `Zr${Math.random().toString(36).slice(2, 8)}!`;
    const hash = await bcrypt.hash(tempPass, 10);

    const farmer = this.userRepo.create({
      name: dto.name,
      phone: dto.phone || null,
      governorate: dto.governorate,
      delegation: dto.delegation || null,
      role: 'FARMER' as any,
      password_hash: hash,
      verified: false,
      zone_id: zone.id,
      privacy_level: dto.privacy_level ?? 'ANONYMOUS',
      registered_by_ambassador_id: ambassadorId,
    });
    const saved = await this.userRepo.save(farmer);
    return { ...saved, password_hash: undefined, temp_password: tempPass };
  }

  // ── Proxy Action ───────────────────────────────────────────────────────────
  async proxyAction(ambassadorId: string, dto: { farmer_id: string; action_type: string; payload: Record<string, unknown> }) {
    const farmer = await this.userRepo.findOne({ where: { id: dto.farmer_id } });
    if (!farmer) throw new NotFoundException('Agriculteur introuvable');
    if (farmer.registered_by_ambassador_id !== ambassadorId && farmer.zone_id !== (await this.getAmbassadorZone(ambassadorId)).id) {
      throw new ForbiddenException('Cet agriculteur n\'est pas dans votre zone');
    }
    // Log proxy action
    await this.dataSource.query(
      `INSERT INTO ambassador_reports (ambassador_id, problem_type, description, governorate, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING`,
      [ambassadorId, `PROXY_${dto.action_type}`, JSON.stringify(dto.payload), farmer.governorate]
    ).catch(() => {});
    return { success: true, action_type: dto.action_type, farmer_id: dto.farmer_id, executed_at: new Date() };
  }

  // ── Field Reports ──────────────────────────────────────────────────────────
  async submitFieldReport(ambassadorId: string, dto: {
    photo_urls?: string[]; description: string; observations?: string; recommendations?: string;
    location_lat?: number; location_lng?: number; gps_lat?: number; gps_lng?: number;
    affected_crop_type?: string; crop_type?: string; affected_area_ha?: number;
    severity: FieldReportSeverity; farmer_id?: string;
  }) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const report = this.reportRepo.create({ ...dto, ambassador_id: ambassadorId, zone_id: zone.id });
    const saved = await this.reportRepo.save(report);

    // Notify all experts in the ambassador's governorate
    const experts = await this.userRepo.find({ where: { role: 'EXPERT' as any, governorate: zone.governorate } });
    const expertIds = experts.map(e => e.id);
    if (expertIds.length > 0) {
      await this.notificationService.sendToUsers(
        expertIds,
        '📋 Nouveau rapport terrain',
        `Sévérité ${dto.severity}: ${dto.description.substring(0, 80)} — Zone ${zone.name}`,
        { type: 'FIELD_REPORT', reportId: saved.id, severity: dto.severity }
      ).catch(() => {});
    }
    return { ...saved, notified_experts: expertIds.length };
  }

  async getFieldReports(ambassadorId: string) {
    return this.reportRepo.find({ where: { ambassador_id: ambassadorId }, order: { created_at: 'DESC' } });
  }

  // ── Expert Alerts for Zone ─────────────────────────────────────────────────
  async getExpertAlerts(ambassadorId: string) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    return this.dataSource.query(`
      SELECT pa.*, u.name as expert_name
      FROM phyto_alerts pa
      LEFT JOIN users u ON u.id = pa.expert_id
      WHERE (pa.governorate = $1 OR $1 = ANY(pa.affected_governorates))
        AND (pa.valid_until IS NULL OR pa.valid_until > NOW())
      ORDER BY pa.created_at DESC LIMIT 20
    `, [zone.governorate]).catch(() => []);
  }

  // Sprint 10: Unified zone activity feed
  async getActivityFeed(ambassadorId: string): Promise<any[]> {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const [diseases, jobs, listings] = await Promise.all([
      this.dataSource.query(`
        SELECT 'DISEASE' as type, u.name as actor_name,
          CONCAT('A détecté : ', dd.disease_name, ' (', dd.urgency, ')') as description,
          dd.created_at
        FROM disease_detections dd
        JOIN users u ON u.id = dd.reporter_id
        WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2)
          AND dd.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY dd.created_at DESC LIMIT 10
      `, [zone.id, ambassadorId]).catch(() => []),
      this.dataSource.query(`
        SELECT 'JOB_OFFER' as type, u.name as actor_name,
          CONCAT('A publié une offre : ', jo.task_type, ' (', jo.daily_pay_tnd, ' TND/j)') as description,
          jo.created_at
        FROM job_offers jo
        JOIN users u ON u.id = jo.employer_id
        WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2)
          AND jo.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY jo.created_at DESC LIMIT 10
      `, [zone.id, ambassadorId]).catch(() => []),
      this.dataSource.query(`
        SELECT 'MARKETPLACE' as type, u.name as actor_name,
          CONCAT('A listé : ', ml.title, ' (', ml.price_tnd, ' TND)') as description,
          ml.created_at
        FROM marketplace_listings ml
        JOIN users u ON u.id = ml.seller_id
        WHERE (u.zone_id = $1 OR u.registered_by_ambassador_id = $2)
          AND ml.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY ml.created_at DESC LIMIT 10
      `, [zone.id, ambassadorId]).catch(() => []),
    ]);
    const all = [...diseases, ...jobs, ...listings];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all.slice(0, 20);
  }

  // Sprint 10: Full farmer registration with credentials
  async registerFarmerFull(ambassadorId: string, dto: {
    first_name: string;
    last_name: string;
    phone?: string;
    national_id?: string;
    email?: string;
    password: string;
    governorate: string;
    delegation?: string;
    village?: string;
    parcel_count?: number;
    privacy_level?: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';
  }) {
    const zone = await this.getAmbassadorZone(ambassadorId);
    const hash = await bcrypt.hash(dto.password, 10);
    const farmer = this.userRepo.create({
      name: `${dto.first_name} ${dto.last_name}`.trim(),
      email: dto.email || undefined,
      phone: dto.phone || null,
      governorate: dto.governorate,
      delegation: dto.delegation || null,
      role: 'FARMER' as any,
      password_hash: hash,
      verified: true,
      zone_id: zone.id,
      privacy_level: dto.privacy_level ?? 'SEMI_PUBLIC',
      registered_by_ambassador_id: ambassadorId,
    });
    const saved = await this.userRepo.save(farmer);

    // Send welcome notification
    await this.notificationService.sendToUsers(
      [saved.id],
      '🌱 Bienvenue sur ZirIA!',
      `Votre compte agriculteur a été créé par votre ambassadeur. Connectez-vous avec vos identifiants pour commencer.`,
      { type: 'WELCOME', registered_by: ambassadorId }
    ).catch(() => {});

    return { ...saved, password_hash: undefined, display_name: saved.name };
  }

  // ── Pending certifications in zone (NOUVEAU) ─────────────────────────────────
  async getPendingCertificationsInZone(ambassadorId: string): Promise<any[]> {
    const zone = await this.getAmbassadorZone(ambassadorId);
    return this.dataSource.query(`
      SELECT wc.*, wp.skills, wp.governorate, u.name as worker_name, u.phone as worker_phone
      FROM worker_certifications wc
      JOIN worker_profiles wp ON wp.id = wc.worker_profile_id
      JOIN users u ON u.id = wp.user_id
      WHERE wc.verification_status = 'PENDING' AND TRIM(LOWER(wp.governorate)) = TRIM(LOWER($1))
      ORDER BY wc.created_at ASC
    `, [zone.governorate]);
  }
}
