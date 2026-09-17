import { Injectable, Logger, BadRequestException, NotFoundException, HttpException } from '@nestjs/common';
import { DataSource, Repository, LessThan, MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { DiseaseDetection } from '../disease-detections/entities/disease-detection.entity';
import { AiModelFeedback } from '../ai/entities/ai-model-feedback.entity';
import { NotificationService } from '../notifications/notification.service';
import { PhytoAlert } from './entities/phyto-alert.entity';
import { Prescription, ApplicationMethod } from './entities/prescription.entity';
import { NameDictionary } from '../name-dictionary/entities/name-dictionary.entity';
import { User } from '../users/entities/user.entity';
import { ExpertProfile } from './entities/expert-profile.entity';
import { ExpertConsultation, ConsultationStatus } from './entities/expert-consultation.entity';
import { ExpertType } from '../common/enums/expert-type.enum';
import { ProfessionalStatus } from '../common/enums/professional-status.enum';
import { Role } from '../common/enums/role.enum';
import { CommissionService } from '../finance/commission.service';
import { CommissionTransactionType } from '../finance/entities/platform-commission.entity';
import { RecordCategory } from '../finance/entities/financial-record.entity';
import { ExpertGateway } from '../ai/gateways/expert.gateway';
import { DiseaseKnowledgeService } from '../ai/services/disease-knowledge.service';
import { ExpertMessage } from './entities/expert-message.entity';
import { CrdaZone } from './entities/crda-zone.entity';
import { GovernorateBoundary } from './entities/governorate-boundary.entity';
import { ConsultationAdditionalInfo } from './entities/consultation-additional-info.entity';
import { CommissionAgreement } from './entities/commission-agreement.entity';
import { PrescriptionPurchase } from './entities/prescription-purchase.entity';
import { HerdRecord } from './entities/herd-record.entity';
import { VaccinationRecord } from './entities/vaccination-record.entity';

@Injectable()
export class ExpertService {
  private readonly logger = new Logger(ExpertService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly commissionService: CommissionService,
    @InjectRepository(PhytoAlert) private readonly phytoRepo: Repository<PhytoAlert>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(NameDictionary) private readonly nameDictRepo: Repository<NameDictionary>,
    @InjectRepository(ExpertProfile) private readonly expertProfileRepo: Repository<ExpertProfile>,
    @InjectRepository(ExpertConsultation) private readonly expertConsultationRepo: Repository<ExpertConsultation>,
    @InjectRepository(ExpertMessage) private readonly messageRepo: Repository<ExpertMessage>,
    @InjectRepository(CrdaZone) private readonly crdaZoneRepo: Repository<CrdaZone>,
    @InjectRepository(GovernorateBoundary) private readonly govBoundaryRepo: Repository<GovernorateBoundary>,
    @InjectRepository(ConsultationAdditionalInfo) private readonly consultAddInfoRepo: Repository<ConsultationAdditionalInfo>,
    @InjectRepository(CommissionAgreement) private readonly commissionAgreementRepo: Repository<CommissionAgreement>,
    @InjectRepository(PrescriptionPurchase) private readonly prescriptionPurchaseRepo: Repository<PrescriptionPurchase>,
    @InjectRepository(HerdRecord) private readonly herdRecordRepo: Repository<HerdRecord>,
    @InjectRepository(VaccinationRecord) private readonly vaccinationRecordRepo: Repository<VaccinationRecord>,
    private readonly expertGateway: ExpertGateway,
    private readonly diseaseKnowledgeService: DiseaseKnowledgeService,
  ) {}

  async validateDiagnosis(
    detectionId: string,
    expertId: string,
    isCorrect: boolean,
    correctedDisease?: string,
    comments?: string,
    nameAr?: string,
    nameLat?: string,
  ) {
    // ── Mandatory trilingual name validation ─────────────────────────────────
    if (!nameAr?.trim()) {
      throw new BadRequestException('Le nom arabe tunisien (name_ar) est obligatoire pour valider un diagnostic.');
    }
    if (!nameLat?.trim()) {
      throw new BadRequestException('La translittération latine tunisienne (name_lat) est obligatoire pour valider un diagnostic.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const expert = await queryRunner.manager.findOne(User, { where: { id: expertId } });
      if (!expert) throw new BadRequestException('Expert not found');

      const detection = await queryRunner.manager.findOne(DiseaseDetection, {
        where: { id: detectionId }, lock: { mode: 'pessimistic_write' }
      });
      if (!detection) throw new BadRequestException('Detection not found');

      // Apply correction or confirmation
      const finalDiseaseName = (!isCorrect && correctedDisease) ? correctedDisease : detection.disease_name;
      detection.disease_name = finalDiseaseName;
      detection.requires_expert_validation = false;
      detection.is_expert_validated = true;
      detection.expert_comments = comments || null;
      await queryRunner.manager.save(detection);

      // Record MLOps feedback
      const feedback = queryRunner.manager.create(AiModelFeedback, {
        prediction_id: detectionId,
        expert_id: expertId,
        is_correct: isCorrect,
        corrected_value_jsonb: correctedDisease ? { disease: correctedDisease } : undefined,
        comments: comments || undefined,
        expert_validated: true,
        validating_expert_type: expert.expert_type,
      });
      await queryRunner.manager.save(feedback);

      // Upsert the trilingual name into the NameDictionary for platform-wide availability
      const existingEntry = await this.nameDictRepo.findOne({ where: { key: finalDiseaseName } });
      if (existingEntry) {
        existingEntry.name_ar = nameAr.trim();
        existingEntry.name_lat = nameLat.trim();
        existingEntry.name_fr = finalDiseaseName;
        await this.nameDictRepo.save(existingEntry);
      } else {
        const newEntry = this.nameDictRepo.create({
          key: finalDiseaseName,
          name_fr: finalDiseaseName,
          name_ar: nameAr.trim(),
          name_lat: nameLat.trim(),
        });
        await this.nameDictRepo.save(newEntry);
      }
      this.logger.log(`[NameDict] Upserted trilingual entry for: ${finalDiseaseName}`);

      await queryRunner.commitTransaction();

      // Train base of knowledge asynchronously
      this.diseaseKnowledgeService.trainFromExpert(finalDiseaseName, detection.crop_type, {
        fr: comments
      }).catch(err => this.logger.warn(`Failed to train KB from expert validation: ${err.message}`));

      // Notify farmer with expert badge
      const notifBody = isCorrect
        ? `✅ Votre diagnostic « ${finalDiseaseName} » a été confirmé par un expert certifié CRDA.`
        : `🔄 Votre diagnostic a été corrigé par un expert certifié CRDA : « ${finalDiseaseName} ».`;
      const expertComment = comments ? `\n📝 Avis expert : ${comments}` : '';
      await this.notificationService.sendToUsers(
        [detection.reporter_id],
        '👨‍🔬 Diagnostic validé par Expert Certifié',
        notifBody + expertComment,
        { type: 'DIAGNOSIS_EXPERT_VALIDATED', detection_id: detectionId, is_correct: isCorrect, disease: finalDiseaseName, expert_id: expertId }
      );

      return { success: true, message: 'Diagnostic validé, nomenclature mise à jour.', disease: finalDiseaseName, name_ar: nameAr, name_lat: nameLat };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Expert Dashboard Stats ──────────────────────────────────────────────────
  async getDashboardStats(expertId: string) {
    try {
      const resValidated = await this.dataSource.query(`SELECT COUNT(*) as validated FROM ai_model_feedbacks WHERE expert_id = $1 AND created_at >= date_trunc('month', NOW())`, [expertId]);
      const resCorrect = await this.dataSource.query(`SELECT COUNT(*) as correct FROM ai_model_feedbacks WHERE expert_id = $1 AND is_correct = true AND created_at >= date_trunc('month', NOW())`, [expertId]);
      const resAlerts = await this.dataSource.query(`SELECT COUNT(*) as alerts FROM phyto_alerts WHERE expert_id = $1 AND created_at >= date_trunc('month', NOW())`, [expertId]);
      
      const validated = resValidated[0]?.validated || 0;
      const correct = resCorrect[0]?.correct || 0;
      const alerts = resAlerts[0]?.alerts || 0;
      
      const resFarmers = await this.dataSource.query(`SELECT COUNT(*) as farmers FROM expert_farmer_relations WHERE expert_id = $1 AND status = 'ACCEPTED'`, [expertId]);
      const resPendingReq = await this.dataSource.query(`SELECT COUNT(*) as pending_requests_count FROM expert_farmer_relations WHERE expert_id = $1 AND status = 'PENDING' AND requested_by = 'FARMER'`, [expertId]);
      const resConsult = await this.dataSource.query(`SELECT COUNT(*) as active_consultations_count FROM expert_consultations WHERE expert_id = $1 AND status = 'IN_PROGRESS'`, [expertId]);
      const resEarnings = await this.dataSource.query(`SELECT SUM(net_to_expert_tnd) as monthly_earnings_net FROM expert_consultations WHERE expert_id = $1 AND status = 'COMPLETED' AND completed_at >= date_trunc('month', NOW())`, [expertId]);

      // New fields for sidebar badges
      const resPendingCases = await this.dataSource.query(`SELECT COUNT(*) as pending_cases_count FROM disease_detections WHERE requires_expert_validation = true AND is_expert_validated = false`, []);
      const resUnreadMsgs = await this.dataSource.query(`SELECT COUNT(*) as unread_messages_count FROM expert_messages WHERE receiver_id = $1 AND read_at IS NULL`, [expertId]);
      const resTopDiseases = await this.dataSource.query(`
        SELECT disease_name, COUNT(*) as count
        FROM disease_detections
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY disease_name
        ORDER BY count DESC
        LIMIT 5
      `, []);
      
      const farmers = resFarmers[0]?.farmers || 0;
      
      return {
        validated_this_month: Number(validated),
        ai_accuracy_rate: Number(validated) > 0 ? Math.round((Number(correct) / Number(validated)) * 100) : 0,
        alerts_this_month: Number(alerts),
        farmers_count: Number(farmers),
        pending_requests_count: Number(resPendingReq[0]?.pending_requests_count || 0),
        active_consultations_count: Number(resConsult[0]?.active_consultations_count || 0),
        monthly_earnings_net: Number(resEarnings[0]?.monthly_earnings_net || 0),
        pending_cases_count: Number(resPendingCases[0]?.pending_cases_count || 0),
        unread_messages_count: Number(resUnreadMsgs[0]?.unread_messages_count || 0),
        top_diseases_week: resTopDiseases.map((r: any) => ({ disease_name: r.disease_name, count: Number(r.count) })),
      };
    } catch (error) {
      this.logger.error('Error in getDashboardStats:', error);
      throw error;
    }
  }

  // ── Expert-Farmer Relations ──────────────────────────────────────────────────
  async getMyFarmers(expertId: string) {
    // ── Step 1: base farmer list ─────────────────────────────────────────────
    const farmers = await this.dataSource.query(`
      SELECT u.id, u.name, u.phone, u.governorate,
             (SELECT COUNT(*) FROM parcels WHERE owner_id = u.id) as parcel_count,
             (SELECT created_at FROM expert_consultations WHERE expert_id = $1 AND farmer_id = u.id ORDER BY created_at DESC LIMIT 1) as last_consultation_date,
             (SELECT consultation_type FROM expert_consultations WHERE expert_id = $1 AND farmer_id = u.id ORDER BY created_at DESC LIMIT 1) as last_consultation_type,
             (SELECT COUNT(*) FROM disease_detections WHERE reporter_id = u.id) as total_diagnostics_count
      FROM users u
      JOIN expert_farmer_relations efr ON efr.farmer_id = u.id
      WHERE efr.expert_id = $1 AND efr.status = 'ACCEPTED'
    `, [expertId]);

    if (!farmers.length) return farmers;

    // ── Step 2: expert type → domain metadata ───────────────────────────────
    const expert = await this.dataSource.getRepository(User).findOne({ where: { id: expertId }, select: ['id', 'expert_type'] });
    const expertType: string = expert?.expert_type ?? '';
    const farmerIds: string[] = farmers.map((f: any) => f.id);
    const idList = farmerIds.map((_: any, i: number) => `$${i + 1}`).join(',');

    try {
      if (expertType === ExpertType.AGRONOMIST) {
        const tCheck = await this.dataSource.query(`SELECT to_regclass('public.soil_analyses') as t`);
        if (tCheck[0]?.t) {
          const rows = await this.dataSource.query(`
            SELECT DISTINCT ON (farmer_id)
              farmer_id,
              analysis_date as last_soil_analysis_date,
              (ph < 6.0 OR ph > 8.0 OR nitrogen_ppm < 100 OR phosphorus_ppm < 25 OR potassium_ppm < 50 OR conductivity_ms > 2.0) as has_nutritive_alert
            FROM soil_analyses
            WHERE farmer_id IN (${idList}) AND expert_id = $${farmerIds.length + 1}
            ORDER BY farmer_id, analysis_date DESC
          `, [...farmerIds, expertId]);
          const map = new Map(rows.map((r: any) => [r.farmer_id, r]));
          return farmers.map((f: any) => ({ ...f, domain: map.get(f.id) || null }));
        }

      } else if (expertType === ExpertType.HYDRAULIC_ENGINEER) {
        const tCheck = await this.dataSource.query(`SELECT to_regclass('public.water_projects') as t`);
        if (tCheck[0]?.t) {
          const rows = await this.dataSource.query(`
            SELECT farmer_id, COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED','CANCELLED')) as active_irrigation_projects
            FROM water_projects
            WHERE farmer_id IN (${idList}) AND expert_id = $${farmerIds.length + 1}
            GROUP BY farmer_id
          `, [...farmerIds, expertId]);
          const map = new Map(rows.map((r: any) => [r.farmer_id, r]));
          return farmers.map((f: any) => ({ ...f, domain: map.get(f.id) || null }));
        }

      } else if (expertType === ExpertType.HYDROGEOLOGIST) {
        const tCheck = await this.dataSource.query(`SELECT to_regclass('public.wells') as t`);
        if (tCheck[0]?.t) {
          const rows = await this.dataSource.query(`
            SELECT farmer_id,
              COUNT(*) as monitored_wells_count,
              BOOL_OR(anomaly_drawdown OR anomaly_salinity) as has_well_anomaly
            FROM wells
            WHERE farmer_id IN (${idList}) AND expert_id = $${farmerIds.length + 1} AND status != 'INACTIVE'
            GROUP BY farmer_id
          `, [...farmerIds, expertId]);
          const map = new Map(rows.map((r: any) => [r.farmer_id, r]));
          return farmers.map((f: any) => ({ ...f, domain: map.get(f.id) || null }));
        }

      } else if (expertType === ExpertType.ZOOTECHNICIAN) {
        const rows = await this.herdRecordRepo
          .createQueryBuilder('hr')
          .select('DISTINCT ON (hr.farmer_id) hr.farmer_id', 'farmer_id')
          .addSelect('hr.species', 'last_herd_species')
          .addSelect('hr.herd_size', 'last_herd_size')
          .where('hr.farmer_id IN (:...farmerIds)', { farmerIds })
          .andWhere('hr.expert_id = :expertId', { expertId })
          .orderBy('hr.farmer_id')
          .addOrderBy('hr.created_at', 'DESC')
          .getRawMany();
        const map = new Map(rows.map((r: any) => [r.farmer_id, r]));
        return farmers.map((f: any) => ({ ...f, domain: map.get(f.id) || null }));

      } else if (expertType === ExpertType.VETERINARY_EPIDEMIOLOGIST) {
        const rows = await this.vaccinationRecordRepo
          .createQueryBuilder('vr')
          .select('vr.farmer_id', 'farmer_id')
          .addSelect(
            `COUNT(*) FILTER (
              WHERE vr.next_reminder_date IS NOT NULL
                AND vr.next_reminder_date >= NOW()
                AND vr.next_reminder_date <= NOW() + INTERVAL '14 days'
            )`,
            'upcoming_vaccine_reminders'
          )
          .where('vr.farmer_id IN (:...farmerIds)', { farmerIds })
          .andWhere('vr.expert_id = :expertId', { expertId })
          .groupBy('vr.farmer_id')
          .getRawMany();
        const map = new Map(rows.map((r: any) => [r.farmer_id, { upcoming_vaccine_reminders: Number(r.upcoming_vaccine_reminders) }]));
        return farmers.map((f: any) => ({ ...f, domain: map.get(f.id) || null }));
      }
    } catch (e) {
      this.logger.warn(`getMyFarmers domain enrichment failed for ${expertType}: ${e.message}`);
    }

    return farmers;
  }

  async getFarmerDetails(expertId: string, farmerId: string) {
    const rel = await this.dataSource.query(`SELECT 1 FROM expert_farmer_relations WHERE expert_id = $1 AND farmer_id = $2 AND status = 'ACCEPTED'`, [expertId, farmerId]);
    if (!rel.length) throw new BadRequestException('Relation not found or not accepted');
    
    const farmer = await this.dataSource.query(`SELECT id, name, phone, governorate FROM users WHERE id = $1`, [farmerId]);
    const parcels = await this.dataSource.query(`SELECT id, name, area_ha, crop_type, ST_AsGeoJSON(boundary) as boundary_geojson FROM parcels WHERE owner_id = $1`, [farmerId]);
    const diagnostics = await this.dataSource.query(`SELECT id, created_at, disease_name, confidence_score, is_expert_validated FROM disease_detections WHERE reporter_id = $1 ORDER BY created_at DESC LIMIT 10`, [farmerId]);
    const consultations = await this.dataSource.query(`SELECT id, created_at, consultation_type, status, net_to_expert_tnd, satisfaction_score FROM expert_consultations WHERE expert_id = $1 AND farmer_id = $2 ORDER BY created_at DESC`, [expertId, farmerId]);
    const prescriptions = await this.dataSource.query(`SELECT id, created_at, product_name, dosage, application_method, valid_until FROM prescriptions WHERE expert_id = $1 AND farmer_id = $2 ORDER BY created_at DESC`, [expertId, farmerId]);

    return { farmer: farmer[0], parcels, diagnostics, consultations, prescriptions };
  }

  async requestFarmerLink(expertId: string, farmerId: string, note?: string) {
    const exist = await this.dataSource.query(`SELECT id FROM expert_farmer_relations WHERE expert_id = $1 AND farmer_id = $2`, [expertId, farmerId]);
    if (exist.length) throw new BadRequestException('Relation déjà existante');
    
    await this.dataSource.query(`INSERT INTO expert_farmer_relations (expert_id, farmer_id, status, requested_by, note) VALUES ($1, $2, 'PENDING', 'EXPERT', $3)`, [expertId, farmerId, note]);
    await this.notificationService.sendToUsers([farmerId], 'Demande de suivi', 'Un expert souhaite vous suivre', { type: 'EXPERT_FOLLOW_REQUEST' });
    return { success: true };
  }

  async respondToFarmerLink(relationId: string, actorId: string, accepted: boolean) {
    try {
      const rels = await this.dataSource.query(`SELECT * FROM expert_farmer_relations WHERE id = $1`, [relationId]);
      if (!rels.length) throw new NotFoundException('Relation not found');
      const rel = rels[0];
      
      if ((rel.requested_by === 'EXPERT' && rel.farmer_id !== actorId) || (rel.requested_by === 'FARMER' && rel.expert_id !== actorId)) {
         throw new BadRequestException('Unauthorized actor');
      }
      
      const status = accepted ? 'ACCEPTED' : 'REJECTED';
      const acceptedAt = accepted ? new Date() : null;
      await this.dataSource.query(
        `UPDATE expert_farmer_relations SET status = $1, accepted_at = $2 WHERE id = $3`,
        [status, acceptedAt, relationId]
      );

      try {
        const stats = await this.getDashboardStats(rel.expert_id);
        this.expertGateway.emitStatsUpdate(rel.expert_id, stats);
      } catch (e) {
        this.logger.error('Error emitting stats update in respondToFarmerLink', e);
      }

      return { success: true };
    } catch (e) {
      this.logger.error(`respondToFarmerLink FAILED relationId=${relationId} actorId=${actorId} accepted=${accepted}`, e);
      throw e;
    }
  }

  async getPendingRelations(expertId: string) {
    return this.dataSource.query(`
      SELECT efr.id, u.name as farmer_name, u.governorate, efr.note, efr.created_at
      FROM expert_farmer_relations efr
      JOIN users u ON efr.farmer_id = u.id
      WHERE efr.expert_id = $1 AND efr.status = 'PENDING' AND efr.requested_by = 'FARMER'
    `, [expertId]);
  }

  async removeFarmerLink(expertId: string, farmerId: string) {
    await this.dataSource.query(`UPDATE expert_farmer_relations SET status = 'REJECTED' WHERE expert_id = $1 AND farmer_id = $2`, [expertId, farmerId]);

    try {
      const stats = await this.getDashboardStats(expertId);
      this.expertGateway.emitStatsUpdate(expertId, stats);
    } catch (e) {
      this.logger.error('Error emitting stats update in removeFarmerLink', e);
    }

    return { success: true };
  }

  // ── Unified Pending Cases (Triage Queue) ─────────────────────────────
  async getPendingCases(expertId: string) {
    try {
      const expert = await this.dataSource.getRepository(User).findOne({ where: { id: expertId } });
      const expertType = expert?.expert_type;

      const aiCases = await this.dataSource.query(`
        SELECT
          dd.id, 'AI_DIAGNOSIS' as case_type,
          dd.disease_name as title, dd.urgency as severity,
          dd.created_at, dd.photo_url,
          dd.confidence_score,
          dd.recommendation_fr, dd.recommendation_darija,
          dd.is_expert_validated,
          u.id as farmer_id, u.name as farmer_name, u.privacy_level,
          p.crop_type, u.delegation
        FROM disease_detections dd
        JOIN users u ON u.id = dd.reporter_id
        LEFT JOIN parcels p ON p.id = dd.parcel_id
        WHERE dd.requires_expert_validation = true
          AND (dd.assigned_expert_id IS NULL OR dd.assigned_expert_id = $1)
          AND (dd.assigned_expert_id IS NOT NULL OR dd.required_expert_type IS NULL OR dd.required_expert_type = $2)
      `, [expertId, expertType]);

      const fieldReports = await this.dataSource.query(`
        SELECT fr.id, 'FIELD_REPORT' as case_type, fr.description as title, fr.severity,
              fr.created_at, fr.photo_urls->>0 as photo_url, u.id as farmer_id, u.name as farmer_name, u.privacy_level, fr.affected_crop_type as crop_type, z.delegation
        FROM field_reports fr
        JOIN zones z ON z.id = fr.zone_id
        LEFT JOIN users u ON u.id = fr.farmer_id
        WHERE fr.status = 'PENDING'
      `);

      const allCases = [...aiCases, ...fieldReports];
      const now = new Date();

      const mappedCases = allCases.map(c => {
        let base = 40;
        if (c.severity === 'CRITICAL') base = 80;
        else if (c.severity === 'HIGH' || c.severity === 'WARNING' || c.severity === 'CLINICAL') base = 60;
        else if (c.severity === 'LOW') base = 20;

        let confBonus = 0;
        if (c.case_type === 'AI_DIAGNOSIS' && c.confidence_score) {
          confBonus = Math.round((1 - parseFloat(c.confidence_score)) * 20);
        }

        const created = new Date(c.created_at);
        const hours = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60));
        const delayBonus = Math.min(15, Math.round(hours * 0.25));

        const clusterCount = allCases.filter(x => x.title === c.title && x.delegation === c.delegation).length;
        const clusterBonus = clusterCount > 1 ? 15 : 0;

        const urgency_score = Math.min(100, base + confBonus + delayBonus + clusterBonus);

        const level = c.privacy_level ?? 'SEMI_PUBLIC';
        let display_name = c.farmer_name || 'Agriculteur';
        if (level === 'ANONYMOUS') {
          display_name = `Agriculteur #${(c.farmer_id || '').slice(-4)}`;
        } else if (level === 'SEMI_PUBLIC' && c.farmer_name) {
          const p = c.farmer_name.split(' ');
          display_name = `${p[0]} ${p[1] ? p[1].charAt(0) + '.' : ''}`;
        }

        return {
          ...c,
          urgency_score,
          farmer_display_name: display_name
        };
      });

      return mappedCases.sort((a, b) => b.urgency_score - a.urgency_score);
    } catch (error) {
      this.logger.error('Error in getPendingCases:', error);
      throw error;
    }
  }

  async getPriorityActions(expertId: string) {
    const expert = await this.dataSource.getRepository(User).findOne({ where: { id: expertId } });
    if (!expert) throw new NotFoundException('Expert introuvable');

    const expertType = expert.expert_type;
    const now = new Date();

    if (expertType === ExpertType.PHYTOPATHOLOGIST) {
      return this.getPendingCases(expertId);
    }

    if (expertType === ExpertType.AGRONOMIST) {
      try {
        const t = await this.dataSource.query(`SELECT to_regclass('public.soil_analyses') as t`);
        if (!t[0]?.t) return [];
        const rows = await this.dataSource.query(`
          SELECT sa.id, sa.created_at, sa.ph, sa.nitrogen_ppm, sa.phosphorus_ppm, sa.potassium_ppm, sa.conductivity_ms,
                 u.name as farmer_name, u.delegation, p.crop_type
          FROM soil_analyses sa
          JOIN users u ON u.id = sa.farmer_id
          LEFT JOIN parcels p ON p.id = sa.parcel_id
          WHERE sa.expert_id = $1
            AND (sa.ph < 6.0 OR sa.ph > 8.0 OR sa.nitrogen_ppm < 100 OR sa.phosphorus_ppm < 25 OR sa.potassium_ppm < 50 OR sa.conductivity_ms > 2.0)
          ORDER BY sa.created_at DESC
        `, [expertId]);

        return rows.map((r: any) => {
          const isCritical = (Number(r.ph) < 5.0 || Number(r.ph) > 8.5 || Number(r.conductivity_ms) > 4.0);
          return {
            id: r.id,
            case_type: 'SOIL_ANALYSIS',
            title: `Analyse de sol hors-norme (${r.crop_type || 'Sans culture'})`,
            severity: isCritical ? 'CRITICAL' : 'HIGH',
            created_at: r.created_at,
            farmer_name: r.farmer_name,
            delegation: r.delegation,
            urgency_score: isCritical ? 85 : 65,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/analyses-sol'
          };
        });
      } catch (error) {
        this.logger.error('Error in getPriorityActions for AGRONOMIST:', error);
        return [];
      }
    }

    if (expertType === ExpertType.HYDRAULIC_ENGINEER) {
      try {
        const t = await this.dataSource.query(`SELECT to_regclass('public.water_projects') as t`);
        if (!t[0]?.t) return [];
        const rows = await this.dataSource.query(`
          SELECT wp.id, wp.project_name, wp.created_at, wp.estimated_completion_date,
                 u.name as farmer_name, u.delegation
          FROM water_projects wp
          JOIN users u ON u.id = wp.farmer_id
          WHERE wp.expert_id = $1
            AND wp.status != 'COMPLETED'
            AND wp.estimated_completion_date < NOW()
          ORDER BY wp.estimated_completion_date ASC
        `, [expertId]);

        return rows.map((r: any) => {
          const daysOverdue = Math.floor((now.getTime() - new Date(r.estimated_completion_date).getTime()) / (1000 * 60 * 60 * 24));
          const isCritical = daysOverdue > 30;
          return {
            id: r.id,
            case_type: 'WATER_PROJECT',
            title: `Projet en retard : ${r.project_name}`,
            severity: isCritical ? 'CRITICAL' : 'HIGH',
            created_at: r.estimated_completion_date,
            farmer_name: r.farmer_name,
            delegation: r.delegation,
            urgency_score: isCritical ? 90 : 70,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/projets-irrigation'
          };
        });
      } catch (error) {
        this.logger.error('Error in getPriorityActions for HYDRAULIC_ENGINEER:', error);
        return [];
      }
    }

    if (expertType === ExpertType.HYDROGEOLOGIST) {
      try {
        const t = await this.dataSource.query(`SELECT to_regclass('public.wells') as t`);
        if (!t[0]?.t) return [];
        const rows = await this.dataSource.query(`
          SELECT w.id, w.well_name, w.created_at, w.anomaly_drawdown, w.anomaly_salinity,
                 u.name as farmer_name, u.delegation
          FROM wells w
          JOIN users u ON u.id = w.farmer_id
          WHERE w.expert_id = $1
            AND (w.anomaly_drawdown = true OR w.anomaly_salinity = true)
          ORDER BY w.created_at DESC
        `, [expertId]);

        return rows.map((r: any) => {
          const isCritical = r.anomaly_drawdown && r.anomaly_salinity;
          const typeStr = r.anomaly_drawdown && r.anomaly_salinity ? 'Niveau & Salinité' : r.anomaly_drawdown ? 'Niveau bas' : 'Salinité élevée';
          return {
            id: r.id,
            case_type: 'WELL_ANOMALY',
            title: `Anomalie puits : ${r.well_name} (${typeStr})`,
            severity: isCritical ? 'CRITICAL' : 'HIGH',
            created_at: r.created_at,
            farmer_name: r.farmer_name,
            delegation: r.delegation,
            urgency_score: isCritical ? 85 : 65,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/carte-puits'
          };
        });
      } catch (error) {
        this.logger.error('Error in getPriorityActions for HYDROGEOLOGIST:', error);
        return [];
      }
    }

    if (expertType === ExpertType.ZOOTECHNICIAN) {
      try {
        const rows = await this.herdRecordRepo
          .createQueryBuilder('hr')
          .select(['hr.id as id', 'hr.species as species', 'hr.breed as breed', 'hr.created_at as created_at', 'hr.herd_size as herd_size'])
          .addSelect('u.name', 'farmer_name')
          .addSelect('u.delegation', 'delegation')
          .innerJoin('hr.farmer', 'u')
          .where('hr.expert_id = :expertId', { expertId })
          .andWhere('hr.performance_alert = true')
          .orderBy('hr.created_at', 'DESC')
          .getRawMany();

        return rows.map((r: any) => {
          return {
            id: r.id,
            case_type: 'HERD_ATTENTION',
            title: `Alerte performance élevage : ${r.species} (${r.breed || 'Standard'})`,
            severity: 'HIGH',
            created_at: r.created_at,
            farmer_name: r.farmer_name,
            delegation: r.delegation,
            urgency_score: 75,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/mes-elevages'
          };
        });
      } catch (error) {
        this.logger.error('Error in getPriorityActions for ZOOTECHNICIAN:', error);
        return [];
      }
    }

    if (expertType === ExpertType.VETERINARY_EPIDEMIOLOGIST) {
      const actions: any[] = [];
      try {
        const consults = await this.expertConsultationRepo.find({
          where: { expert_type: ExpertType.VETERINARY_EPIDEMIOLOGIST, status: ConsultationStatus.OPEN },
          relations: ['farmer'],
          order: { created_at: 'DESC' }
        });
        consults.forEach(c => {
          actions.push({
            id: c.id,
            case_type: 'CONSULTATION_PENDING',
            title: `Consultation en attente : ${c.consultation_type}`,
            severity: 'HIGH',
            created_at: c.created_at,
            farmer_name: c.farmer?.name || 'Agriculteur',
            delegation: c.farmer?.delegation,
            urgency_score: 70,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/consultations'
          });
        });
      } catch (error) {
        this.logger.error('Error fetching consultations for vet action queue:', error);
      }

      try {
        const vacs = await this.vaccinationRecordRepo
          .createQueryBuilder('vr')
          .select(['vr.id as id', 'vr.vaccine_name as vaccine_name', 'vr.next_reminder_date as next_reminder_date', 'vr.species as species'])
          .addSelect('u.name', 'farmer_name')
          .addSelect('u.delegation', 'delegation')
          .innerJoin('vr.farmer', 'u')
          .where('vr.expert_id = :expertId', { expertId })
          .andWhere("vr.next_reminder_date <= NOW() + INTERVAL '14 days'")
          .orderBy('vr.next_reminder_date', 'ASC')
          .getRawMany();

        vacs.forEach((v: any) => {
          const daysLeft = Math.floor((new Date(v.next_reminder_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isCritical = daysLeft <= 3;
          actions.push({
            id: v.id,
            case_type: 'VACCINATION_REMINDER',
            title: `Rappel vaccin requis : ${v.vaccine_name} (${v.species})`,
            severity: isCritical ? 'CRITICAL' : 'HIGH',
            created_at: v.next_reminder_date,
            farmer_name: v.farmer_name,
            delegation: v.delegation,
            urgency_score: isCritical ? 85 : 65,
            confidence_score: 1.0,
            action_route: '/dashboard/expert/vaccinations'
          });
        });
      } catch (error) {
        this.logger.error('Error fetching vaccinations for vet action queue:', error);
      }

      return actions.sort((a, b) => b.urgency_score - a.urgency_score);
    }

    return [];
  }

  // ── Expert: Field Reports (from ambassadors in my governorate) ─────────────
  async getExpertFieldReports(expertId: string) {
    try {
      const expertRow = await this.dataSource.query(`SELECT governorate FROM users WHERE id = $1`, [expertId]);
      const governorate = expertRow[0]?.governorate;
      if (!governorate) return [];

      return this.dataSource.query(`
        SELECT
          fr.id, fr.severity, fr.status, fr.description, fr.observations, fr.recommendations,
          fr.affected_crop_type, fr.crop_type, fr.affected_area_ha, fr.photo_urls,
          fr.gps_lat, fr.gps_lng, fr.location_lat, fr.location_lng, fr.created_at,
          amb.id as ambassador_id, amb.name as ambassador_name,
          farmer.id as farmer_id, farmer.name as farmer_name,
          z.name as zone_name, z.delegation, z.governorate
        FROM field_reports fr
        JOIN zones z ON z.id = fr.zone_id
        JOIN users amb ON amb.id = fr.ambassador_id
        LEFT JOIN users farmer ON farmer.id = fr.farmer_id
        WHERE z.governorate = $1
        ORDER BY
          CASE fr.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
          fr.created_at DESC
      `, [governorate]);
    } catch (error) {
      this.logger.error('Error in getExpertFieldReports:', error);
      return [];
    }
  }


  async createPrescription(expertId: string, dto: any) {
    const detection_id = dto.detection_id || dto.case_id || null;
    const notes = dto.notes || dto.content || null;
    const product_name = dto.product_name || 'Prescription Rapide';
    const dosage = dto.dosage || 'Selon instructions';
    const application_method = dto.application_method || ApplicationMethod.SPRAY;

    const p = this.prescriptionRepo.create({
      detection_id,
      farmer_id: dto.farmer_id || null,
      expert_id: expertId,
      product_name,
      dosage,
      application_method,
      pre_harvest_days: dto.pre_harvest_days || null,
      notes,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
    });
    return this.prescriptionRepo.save(p);
  }

  async getPrescriptions(expertId: string) {
    return this.dataSource.query(`
      SELECT p.*, d.disease_name, u.name as farmer_name, u.privacy_level
      FROM prescriptions p
      LEFT JOIN disease_detections d ON d.id = p.detection_id
      LEFT JOIN users u ON u.id = p.farmer_id
      WHERE p.expert_id = $1
      ORDER BY p.created_at DESC
    `, [expertId]);
  }

  // ── Existing alert methods... ───────────────────────────────────────────────
  async broadcastPhytoAlert(expertId: string, diseaseName: string, lat: number, lng: number, radiusKm: number, message: string) {
    const affectedParcels = await this.dataSource.query(`
      SELECT DISTINCT p.owner_id as farmer_id FROM parcels p
      WHERE ST_DWithin(p.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    `, [lng, lat, radiusKm * 1000]);
    const farmerIds = affectedParcels.map((row:any) => row.farmer_id);
    await this.notificationService.broadcastPhytoAlert(farmerIds, diseaseName, message);
    return { success: true, alerted_farmers_count: farmerIds.length, message: 'Alert successfully broadcasted' };
  }

  async getMyAlerts(expertId: string) { return this.phytoRepo.find({ where: { expert_id: expertId }, order: { created_at: 'DESC' } }); }
  async createPhytoAlert(expertId: string, dto: any) { const alert = this.phytoRepo.create({ ...dto, expert_id: expertId }); return this.phytoRepo.save(alert); }
  
  async generateSynthesisReport(expertId: string) {
    const stats = await this.getExpertReports();
    return { report_id: `CRDA-${Date.now()}`, title: "Rapport de Synthèse Phytosanitaire", expert_id: expertId, data: stats };
  }

  async getExpertReports() {
    const stats = await this.dataSource.query(`SELECT disease_name, COUNT(*) as count, AVG(confidence_score) as avg_confidence FROM disease_detections GROUP BY disease_name ORDER BY count DESC`);
    return { generated_at: new Date().toISOString(), region: 'Kasserine', disease_stats: stats };
  }

  async getDiseaseClusters() {
    return this.dataSource.query(`
      WITH clustered AS (
        SELECT id, disease_name, parcel_id, ST_ClusterDBSCAN(ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry, 3857), eps := 10000, minpoints := 3) over () as cluster_id, ST_SetSRID(ST_MakePoint(lng, lat), 4326) as location
        FROM disease_detections WHERE lat IS NOT NULL AND confidence_score >= 0.7
      )
      SELECT cluster_id, disease_name, COUNT(id) as detection_count, ST_AsGeoJSON(ST_ConvexHull(ST_Collect(location::geometry)))::json as convex_hull_geojson
      FROM clustered WHERE cluster_id IS NOT NULL GROUP BY cluster_id, disease_name
    `);
  }

  async createConsultation(
    farmerId: string,
    dto: { expert_type: ExpertType; consultation_type: string; description: string; gross_amount_tnd: number }
  ) {
    const consultation = this.expertConsultationRepo.create({
      farmer_id: farmerId,
      expert_type: dto.expert_type,
      consultation_type: dto.consultation_type,
      description: dto.description,
      gross_amount_tnd: dto.gross_amount_tnd || 0,
      status: ConsultationStatus.OPEN,
    });
    return this.expertConsultationRepo.save(consultation);
  }

  async getExpertQueue(expertId: string) {
    const expert = await this.dataSource.getRepository(User).findOne({ where: { id: expertId } });
    if (!expert || !expert.expert_type) {
      throw new BadRequestException("Vous devez configurer votre type d'expertise.");
    }

    const consultations = await this.expertConsultationRepo.find({
      where: [
        { expert_type: expert.expert_type, status: ConsultationStatus.OPEN },
        { expert_id: expertId, status: ConsultationStatus.IN_PROGRESS }
      ],
      relations: ['farmer'],
      order: { created_at: 'DESC' }
    });

    // Flatten farmer fields + inject parcels for context
    return Promise.all(consultations.map(async (c) => {
      const farmer = c.farmer as any;
      let parcels: any[] = [];
      if (farmer) {
        parcels = await this.dataSource.query(
          `SELECT id, name, crop_type, surface_ha FROM parcels WHERE owner_id = $1 LIMIT 3`,
          [farmer.id]
        ).catch(() => []);
      }
      return {
        ...c,
        farmer_name: farmer?.name || 'Agriculteur',
        farmer_activity_type: farmer?.activity_type || null,
        farmer_governorate: farmer?.governorate || null,
        farmer_activity_label: farmer?.activity_type === 'LIVESTOCK' ? 'Éleveur'
          : farmer?.activity_type === 'CROP' ? 'Agriculteur'
          : farmer?.activity_type === 'MIXED' ? 'Polyculteur' : 'Agriculteur',
        parcels,
      };
    }));
  }

  async acceptConsultation(consultationId: string, expertId: string) {
    const consultation = await this.expertConsultationRepo.findOne({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundException('Consultation introuvable');
    if (consultation.status !== ConsultationStatus.OPEN) {
      throw new BadRequestException('Consultation déjà acceptée ou terminée');
    }
    consultation.expert_id = expertId;
    consultation.status = ConsultationStatus.IN_PROGRESS;
    const res = await this.expertConsultationRepo.save(consultation);

    try {
      const stats = await this.getDashboardStats(expertId);
      this.expertGateway.emitStatsUpdate(expertId, stats);
    } catch (e) {
      this.logger.error('Error emitting stats update in acceptConsultation', e);
    }

    return res;
  }

  async respondToConsultation(consultationId: string, expertId: string, responseText: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const consultation = await queryRunner.manager.findOne(ExpertConsultation, {
        where: { id: consultationId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!consultation) throw new NotFoundException('Consultation introuvable');
      if (consultation.expert_id !== expertId) {
        throw new BadRequestException('Vous n\'êtes pas l\'expert assigné à cette consultation');
      }
      if (consultation.status !== ConsultationStatus.IN_PROGRESS) {
        throw new BadRequestException('La consultation n\'est pas en cours');
      }

      consultation.expert_response = responseText;
      consultation.status = ConsultationStatus.COMPLETED;
      consultation.completed_at = new Date();

      const rate = 0.12;
      const commissionAmount = Number(consultation.gross_amount_tnd) * rate;
      const netToExpert = Number(consultation.gross_amount_tnd) - commissionAmount;

      consultation.platform_commission_tnd = commissionAmount;
      consultation.net_to_expert_tnd = netToExpert;

      await queryRunner.manager.save(ExpertConsultation, consultation);

      if (Number(consultation.gross_amount_tnd) > 0) {
        await this.commissionService.recordCommission(queryRunner, {
          type: CommissionTransactionType.EXPERT_CONSULTATION,
          grossTnd: Number(consultation.gross_amount_tnd),
          payerUserId: consultation.farmer_id,
          payeeUserId: expertId,
          relatedEntityId: consultation.id,
          rate,
          category: RecordCategory.EXPERT_CONSULTATION
        });
      }

      await queryRunner.commitTransaction();

      try {
        const stats = await this.getDashboardStats(expertId);
        this.expertGateway.emitStatsUpdate(expertId, stats);
      } catch (e) {
        this.logger.error('Error emitting stats update in respondToConsultation', e);
      }

      await this.notificationService.sendToUsers(
        [consultation.farmer_id],
        '👨‍🔬 Consultation expert terminée',
        `L'expert a répondu à votre consultation.`,
        { type: 'CONSULTATION_COMPLETED', consultation_id: consultation.id }
      );

      return consultation;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getExpertEarningsSummary(expertId: string) {
    const result = await this.dataSource.query(`
      SELECT 
        COALESCE(SUM(gross_amount_tnd), 0) as gross,
        COALESCE(SUM(net_to_expert_tnd), 0) as net,
        COALESCE(SUM(platform_commission_tnd), 0) as commission
      FROM expert_consultations
      WHERE expert_id = $1 AND status = 'COMPLETED'
    `, [expertId]);
    return {
      gross_amount_tnd: Number(result[0].gross),
      net_to_expert_tnd: Number(result[0].net),
      platform_commission_tnd: Number(result[0].commission),
    };
  }

  async completeExpertProfile(
    expertId: string,
    dto: {
      expert_type: ExpertType;
      professional_status: string[];
      crda_zone_id?: string;
      affiliation_name?: string;
      institution_name?: string;
      accepts_remote_consultations?: boolean;
      governorate_zones: string[];
      certifications: string[];
      bio: string;
    }
  ) {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: expertId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role !== Role.EXPERT) {
      throw new BadRequestException("Seuls les experts peuvent compléter leur profil.");
    }

    user.expert_type = dto.expert_type;
    await this.dataSource.getRepository(User).save(user);

    let profile = await this.expertProfileRepo.findOne({ where: { user_id: expertId } });
    if (!profile) {
      profile = this.expertProfileRepo.create({ user_id: expertId });
    }

    profile.expert_type = dto.expert_type;
    profile.professional_status = dto.professional_status;
    profile.crda_zone_id = dto.crda_zone_id || null;
    profile.affiliation_name = dto.affiliation_name || null;
    profile.institution_name = dto.institution_name || null;
    profile.accepts_remote_consultations = dto.accepts_remote_consultations !== undefined ? dto.accepts_remote_consultations : true;
    profile.governorate_zones = dto.governorate_zones;
    profile.certifications = dto.certifications;
    profile.bio = dto.bio;
    profile.is_profile_completed = true;

    // CRDA-only agents: force rate to 0
    if (dto.professional_status?.length === 1 && dto.professional_status[0] === 'CRDA_AGENT') {
      profile.consultation_rate_tnd = 0;
    }

    return this.expertProfileRepo.save(profile);
  }

  async requestExpertLink(farmerId: string, expertId: string, note?: string) {
    const expert = await this.dataSource.query(`
      SELECT u.id, ep.is_profile_completed 
      FROM users u
      LEFT JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE u.id = $1 AND u.role = 'EXPERT'
    `, [expertId]);
    if (!expert.length) throw new NotFoundException('Expert non trouvé');
    if (!expert[0].is_profile_completed) throw new BadRequestException('Le profil de l\'expert n\'est pas complété');

    // 30-day cooldown: check last REJECTED request
    const lastRel = await this.dataSource.query(`
      SELECT status, created_at FROM expert_farmer_relations
      WHERE expert_id = $1 AND farmer_id = $2
      ORDER BY created_at DESC LIMIT 1
    `, [expertId, farmerId]);
    if (lastRel.length) {
      const last = lastRel[0];
      if (last.status === 'PENDING') {
        throw new BadRequestException('Une demande est déjà en attente pour cet expert.');
      }
      if (last.status === 'REJECTED') {
        const daysSinceRejection = Math.floor(
          (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceRejection < 30) {
          const daysLeft = 30 - daysSinceRejection;
          throw new HttpException(
            `Vous devez attendre ${daysLeft} jours avant de renvoyer une demande à cet expert.`,
            429
          );
        }
      }
    }

    const exist = await this.dataSource.query(`SELECT id, status FROM expert_farmer_relations WHERE expert_id = $1 AND farmer_id = $2 AND status = 'ACCEPTED'`, [expertId, farmerId]);
    if (exist.length) throw new BadRequestException('Relation déjà existante');
    
    await this.dataSource.query(`INSERT INTO expert_farmer_relations (expert_id, farmer_id, status, requested_by, note) VALUES ($1, $2, 'PENDING', 'FARMER', $3)`, [expertId, farmerId, note]);
    await this.notificationService.sendToUsers([expertId], 'Nouvelle demande de suivi', 'Un agriculteur souhaite que vous le suiviez', { type: 'EXPERT_FOLLOW_REQUEST' });

    try {
      const farmerRow = await this.dataSource.query(`SELECT name FROM users WHERE id = $1`, [farmerId]);
      const farmerName = farmerRow[0]?.name || 'Un agriculteur';
      this.expertGateway.emitNewPendingRequest(expertId, farmerName);
    } catch (e) {
      this.logger.error('Error emitting new_pending_request', e);
    }

    try {
      const stats = await this.getDashboardStats(expertId);
      this.expertGateway.emitStatsUpdate(expertId, stats);
    } catch (e) {
      this.logger.error('Error emitting stats update in requestExpertLink', e);
    }

    return { success: true };
  }

  async getAvailableExperts(governorate?: string) {
    let query = `
      SELECT u.id, u.name, u.governorate, u.profile_picture_url,
             ep.expert_type, ep.professional_status, ep.crda_zone_id,
             ep.affiliation_name, ep.institution_name, ep.accepts_remote_consultations,
             ep.bio, ep.governorate_zones, ep.certifications,
             ep.consultation_rate_tnd, ep.tarif_note, ep.expert_score,
             (SELECT COUNT(*) FROM expert_farmer_relations WHERE expert_id = u.id AND status = 'ACCEPTED') as farmers_count,
             (SELECT AVG(satisfaction_score) FROM expert_consultations WHERE expert_id = u.id AND status = 'COMPLETED') as avg_satisfaction
      FROM users u
      JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'EXPERT' AND ep.is_profile_completed = true
    `;
    const params: any[] = [];
    if (governorate) {
      query += ` AND (u.governorate = $1 OR ep.governorate_zones::jsonb @> jsonb_build_array($1))`;
      params.push(governorate);
    }
    query += ` ORDER BY ep.expert_score DESC NULLS LAST`;
    return this.dataSource.query(query, params);
  }

  async getPublicProfile(expertId: string) {
    const rows = await this.dataSource.query(`
      SELECT 
        u.id, u.name, ep.expert_type, ep.professional_status, ep.crda_zone_id,
        ep.affiliation_name, ep.institution_name, ep.accepts_remote_consultations,
        ep.bio, ep.governorate_zones, ep.certifications,
        ep.consultation_rate_tnd, ep.tarif_note, ep.expert_score, ep.created_at,
        (SELECT COUNT(*) FROM expert_farmer_relations WHERE expert_id = u.id AND status = 'ACCEPTED') as farmers_count,
        (SELECT COUNT(*) FROM ai_model_feedbacks WHERE expert_id = u.id) as total_validations,
        (SELECT AVG(satisfaction_score) FROM expert_consultations WHERE expert_id = u.id AND status = 'COMPLETED') as avg_satisfaction
      FROM users u
      JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE u.id = $1 AND ep.is_profile_completed = true
    `, [expertId]);
    if (!rows.length) throw new NotFoundException('Expert introuvable ou profil incomplet');
    return rows[0];
  }

  async updateProfile(expertId: string, dto: {
    name?: string;
    phone?: string;
    email?: string;
    governorate?: string;
    delegation?: string;
    profile_picture_url?: string;
    language?: string;
    speciality?: string;
    bio?: string;
    governorate_zones?: string[];
    certifications?: string[];
    consultation_rate_tnd?: number;
    tarif_note?: string;
    professional_status?: string[];
    crda_zone_id?: string;
    affiliation_name?: string;
    institution_name?: string;
    accepts_remote_consultations?: boolean;
    password?: string;
  }) {
    // Update User entity fields
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: expertId } });
    if (!user) throw new NotFoundException('Expert introuvable');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.governorate !== undefined) user.governorate = dto.governorate;
    if (dto.delegation !== undefined) user.delegation = dto.delegation;
    if (dto.profile_picture_url !== undefined) user.profile_picture_url = dto.profile_picture_url;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.speciality !== undefined) user.speciality = dto.speciality;
    if (dto.password !== undefined) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
    }
    await this.dataSource.getRepository(User).save(user);

    // Update ExpertProfile fields
    const profile = await this.expertProfileRepo.findOne({ where: { user_id: expertId } });
    if (!profile) throw new NotFoundException('Profil expert introuvable');

    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.governorate_zones !== undefined) profile.governorate_zones = dto.governorate_zones;
    if (dto.certifications !== undefined) profile.certifications = dto.certifications;
    if (dto.tarif_note !== undefined) profile.tarif_note = dto.tarif_note;
    if (dto.professional_status !== undefined) profile.professional_status = dto.professional_status;
    if (dto.crda_zone_id !== undefined) profile.crda_zone_id = dto.crda_zone_id;
    if (dto.affiliation_name !== undefined) profile.affiliation_name = dto.affiliation_name;
    if (dto.institution_name !== undefined) profile.institution_name = dto.institution_name;
    if (dto.accepts_remote_consultations !== undefined) profile.accepts_remote_consultations = dto.accepts_remote_consultations;

    if (dto.consultation_rate_tnd !== undefined) {
      const effectiveStatuses: string[] = dto.professional_status ?? profile.professional_status ?? [];
      const isCrdaOnly = effectiveStatuses.length === 1 && effectiveStatuses[0] === 'CRDA_AGENT';
      if (isCrdaOnly && dto.consultation_rate_tnd > 0) {
        throw new BadRequestException('Le taux de consultation est verrouillé à 0 TND pour les agents CRDA exclusifs.');
      }
      profile.consultation_rate_tnd = dto.consultation_rate_tnd;
    }

    await this.expertProfileRepo.save(profile);

    return this.getMyProfile(expertId);
  }

  async getMyProfile(expertId: string) {
    const rows = await this.dataSource.query(`
      SELECT u.id, u.name, u.phone, u.email, u.governorate, u.delegation,
             u.profile_picture_url, u.language, u.speciality,
             ep.expert_type, ep.professional_status, ep.crda_zone_id, ep.affiliation_name,
             ep.institution_name, ep.accepts_remote_consultations,
             ep.bio, ep.governorate_zones, ep.certifications,
             ep.consultation_rate_tnd, ep.tarif_note, ep.expert_score,
             ep.is_profile_completed, ep.created_at
      FROM users u
      LEFT JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE u.id = $1
    `, [expertId]);
    if (!rows.length) throw new NotFoundException('Expert introuvable');
    return rows[0];
  }

  // ─── Messaging ────────────────────────────────────────────────────────────

  async getConversations(expertId: string) {
    // Returns one row per unique conversation partner (farmer side only)
    return this.dataSource.query(`
      WITH threads AS (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
          MAX(created_at)  AS last_message_at,
          (SELECT body FROM expert_messages m2
           WHERE (m2.sender_id = $1 AND m2.receiver_id = CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END)
              OR (m2.receiver_id = $1 AND m2.sender_id = CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END)
           ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
          COUNT(*) FILTER (WHERE receiver_id = $1 AND read_at IS NULL) AS unread_count
        FROM expert_messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY partner_id
      )
      SELECT t.partner_id AS farmer_id, u.name AS farmer_name, u.governorate, u.role,
             t.last_message, t.last_message_at, t.unread_count
      FROM threads t
      JOIN users u ON u.id = t.partner_id
      ORDER BY t.last_message_at DESC
    `, [expertId]);
  }

  async getUnreadCount(expertId: string) {
    const rows = await this.dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM expert_messages
      WHERE receiver_id = $1 AND read_at IS NULL
    `, [expertId]);
    return { unread_count: rows[0]?.cnt || 0 };
  }

  async getMessages(expertId: string, partnerId: string) {
    // Mark as read first
    await this.dataSource.query(`
      UPDATE expert_messages
      SET read_at = now()
      WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL
    `, [expertId, partnerId]);

    return this.dataSource.query(`
      SELECT id, sender_id, receiver_id, body, read_at, created_at
      FROM expert_messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [expertId, partnerId]);
  }

  async sendMessage(senderId: string, receiverId: string, body: string) {
    const receiver = await this.dataSource.query(`SELECT id, role FROM users WHERE id = $1`, [receiverId]);
    if (!receiver.length) throw new BadRequestException('Destinataire introuvable');

    // Verify ACCEPTED relation exists between sender and receiver
    const rel = await this.dataSource.query(`
      SELECT id FROM expert_farmer_relations
      WHERE status = 'ACCEPTED'
        AND ((expert_id = $1 AND farmer_id = $2) OR (expert_id = $2 AND farmer_id = $1))
      LIMIT 1
    `, [senderId, receiverId]);
    if (!rel.length) throw new BadRequestException('Vous devez être en relation avec cet utilisateur pour lui envoyer un message');

    // Expert-to-expert or expert-to-farmer (with accepted relation) — allowed
    const msg = this.messageRepo.create({ sender_id: senderId, receiver_id: receiverId, body });
    const saved = await this.messageRepo.save(msg);

    // Real-time: emit to conversation room + unread count update to receiver
    this.expertGateway.emitNewMessage(senderId, receiverId, {
      id: saved.id,
      sender_id: senderId,
      receiver_id: receiverId,
      body,
      created_at: saved.created_at,
    });

    // Emit new_message_notification to receiver's user room for toast display
    const sender = await this.dataSource.query(`
      SELECT name, profile_picture_url, role FROM users WHERE id = $1
    `, [senderId]);
    if (sender.length) {
      this.expertGateway.emitNewMessageNotification(receiverId, {
        sender_id: senderId,
        sender_name: sender[0].name,
        sender_photo: sender[0].profile_picture_url,
        sender_role: sender[0].role,
        body,
        message_id: saved.id,
      });
    }

    // Update unread count for receiver
    const unread = await this.dataSource.query(`
      SELECT COUNT(*)::int AS cnt FROM expert_messages
      WHERE receiver_id = $1 AND read_at IS NULL
    `, [receiverId]);
    this.expertGateway.emitStatsUpdate(receiverId, {
      unread_messages_count: unread[0]?.cnt || 0,
    });

    return saved;
  }

  async getEarningsDashboard(expertId: string) {
    const [totals, monthly, recent] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(gross_amount_tnd), 0)::numeric          AS gross_amount_tnd,
          COALESCE(SUM(net_to_expert_tnd), 0)::numeric         AS net_to_expert_tnd,
          COALESCE(SUM(platform_commission_tnd), 0)::numeric   AS platform_commission_tnd,
          COUNT(*)                                             AS consultation_count
        FROM expert_consultations
        WHERE expert_id = $1 AND status = 'COMPLETED'
      `, [expertId]),

      this.dataSource.query(`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS period,
          COALESCE(SUM(gross_amount_tnd), 0)::numeric          AS gross_amount_tnd,
          COALESCE(SUM(net_to_expert_tnd), 0)::numeric         AS net_to_expert_tnd,
          COALESCE(SUM(platform_commission_tnd), 0)::numeric   AS platform_commission_tnd,
          COUNT(*)                                             AS consultation_count
        FROM expert_consultations
        WHERE expert_id = $1 AND status = 'COMPLETED'
        GROUP BY period
        ORDER BY period DESC
        LIMIT 12
      `, [expertId]),

      this.dataSource.query(`
        SELECT ec.id, ec.gross_amount_tnd, ec.net_to_expert_tnd,
               ec.consultation_type, ec.created_at, u.name AS farmer_name
        FROM expert_consultations ec
        JOIN users u ON u.id = ec.farmer_id
        WHERE ec.expert_id = $1 AND ec.status = 'COMPLETED' AND ec.net_to_expert_tnd IS NOT NULL
        ORDER BY ec.created_at DESC
        LIMIT 10
      `, [expertId]),
    ]);

    return {
      ...totals[0],
      monthly_breakdown: monthly,
      recent_consultations: recent,
    };
  }

  async getPrescriptionSuggestions(diseaseName: string) {
    if (!diseaseName) return [];
    return this.dataSource.query(`
      SELECT * FROM product_prescription_rules
      WHERE LOWER(disease_name) = LOWER($1)
    `, [diseaseName]);
  }

  @Cron('0 0 1 * *')
  async monthlyExpertScoreCalculation() {
    this.logger.log('Starting monthly expert score calculation...');
    try {
      const experts = await this.dataSource.query(`SELECT id FROM users WHERE role = 'EXPERT'`);
      for (const exp of experts) {
        const expertId = exp.id;

        const avgSatRes = await this.dataSource.query(`
          SELECT AVG(satisfaction_score) as avg_score
          FROM expert_consultations
          WHERE expert_id = $1 AND status = 'COMPLETED' AND completed_at >= now() - interval '30 days'
        `, [expertId]);
        const avgSat = avgSatRes[0]?.avg_score ? parseFloat(avgSatRes[0].avg_score) : null;

        const validationsRes = await this.dataSource.query(`
          SELECT COUNT(*) as count
          FROM disease_detections
          WHERE assigned_expert_id = $1 AND is_expert_validated = true AND created_at >= now() - interval '30 days'
        `, [expertId]);
        const validationsCount = parseInt(validationsRes[0]?.count || 0, 10);

        const prescriptionsRes = await this.dataSource.query(`
          SELECT COUNT(*) as count
          FROM prescriptions
          WHERE expert_id = $1 AND created_at >= now() - interval '30 days'
        `, [expertId]);
        const prescriptionsCount = parseInt(prescriptionsRes[0]?.count || 0, 10);

        let score = avgSat !== null ? avgSat * 20 : 80;
        const validationBonus = Math.min(10, validationsCount * 1.0);
        const prescriptionBonus = Math.min(10, prescriptionsCount * 1.0);
        score = Math.min(100, score + validationBonus + prescriptionBonus);

        await this.dataSource.query(`
          UPDATE expert_profiles
          SET expert_score = $1, updated_at = now()
          WHERE user_id = $2
        `, [score, expertId]);

        this.logger.log(`Expert ${expertId} score updated to ${score}`);
      }
      this.logger.log('Monthly expert score calculation completed successfully.');
    } catch (err) {
      this.logger.error('Error during monthly expert score calculation:', err);
    }
  }

  async getCropKcValues() {
    return this.dataSource.query(`SELECT * FROM crop_kc_values ORDER BY crop_type ASC`);
  }

  async getAnimalNutritionalNorms() {
    return this.dataSource.query(`SELECT * FROM animal_nutritional_norms ORDER BY species ASC, stage ASC`);
  }

  async getSeasonalRisks(month: number) {
    return this.dataSource.query(`
      SELECT * FROM seasonal_crop_risks
      WHERE month = $1
      ORDER BY crop_type ASC
    `, [month]);
  }

  // ── New reference routes ────────────────────────────────────────────────────

  async getNpkCalculation(crop: string, area: number, ph: number) {
    // INRAT Tunisia norms (kg/ha base values)
    const NPK_NORMS: Record<string, { n: number; p: number; k: number }> = {
      ble: { n: 100, p: 60, k: 40 },
      ble_dur: { n: 100, p: 60, k: 40 },
      orge: { n: 80, p: 50, k: 30 },
      tomate: { n: 180, p: 80, k: 200 },
      olivier: { n: 60, p: 40, k: 80 },
      vigne: { n: 70, p: 50, k: 90 },
      pomme_de_terre: { n: 150, p: 120, k: 180 },
      mais: { n: 160, p: 70, k: 80 },
      sorgho: { n: 100, p: 50, k: 40 },
      autres: { n: 90, p: 50, k: 60 },
    };
    const cropKey = (crop || 'autres').toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
    const norms = NPK_NORMS[cropKey] || NPK_NORMS['autres'];
    const n_total = Math.round(norms.n * area);
    const p_total = Math.round(norms.p * area);
    const k_total = Math.round(norms.k * area);
    let ph_note = '';
    if (ph < 6.5) ph_note = `Sol acide (pH ${ph}). Recommander un amendement calcique avant apport d'engrais.`;
    else if (ph > 7.5) ph_note = `Sol alcalin (pH ${ph}). Vérifier la disponibilité du fer et du phosphore.`;
    else ph_note = `pH optimal (${ph}). Conditions favorables à l'absorption des nutriments.`;
    return {
      crop, area, ph,
      n_total_kg: n_total,
      p_total_kg: p_total,
      k_total_kg: k_total,
      ph_note,
      recommendation: `Pour ${area} ha de ${crop} : N = ${n_total} kg, P = ${p_total} kg, K = ${k_total} kg. ${ph_note}`,
    };
  }

  async getVaccineTypes() {
    try {
      return await this.dataSource.query(`SELECT * FROM vaccine_types ORDER BY species ASC, disease_prevented ASC`);
    } catch (error) {
      this.logger.error('Error in getVaccineTypes:', error);
      return [];
    }
  }

  async getGovernorateCentroids() {
    try {
      return await this.dataSource.query(`SELECT governorate as name_fr, latitude as lat, longitude as lng FROM governorate_centroids ORDER BY governorate ASC`);
    } catch (error) {
      this.logger.error('Error in getGovernorateCentroids:', error);
      return [];
    }
  }

  async getAllHerdRecords(expertId: string) {
    try {
      return await this.herdRecordRepo
        .createQueryBuilder('hr')
        .select('hr.*')
        .addSelect('u.name', 'farmer_name')
        .innerJoin('hr.farmer', 'u')
        .where('hr.expert_id = :expertId', { expertId })
        .orderBy('hr.created_at', 'DESC')
        .getRawMany();
    } catch (error) {
      this.logger.error('Error in getAllHerdRecords:', error);
      return [];
    }
  }

  async deletePrescription(expertId: string, prescriptionId: string) {
    const rows = await this.dataSource.query(`SELECT id FROM prescriptions WHERE id = $1 AND expert_id = $2`, [prescriptionId, expertId]);
    if (!rows.length) throw new NotFoundException('Prescription introuvable ou non autorisé');
    await this.dataSource.query(`DELETE FROM prescriptions WHERE id = $1`, [prescriptionId]);
    return { success: true };
  }

  async getSoilAnalyses(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.soil_analyses') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT sa.*, u.name as farmer_name
        FROM soil_analyses sa
        JOIN users u ON u.id = sa.farmer_id
        WHERE sa.expert_id = $1
        ORDER BY sa.analysis_date DESC, sa.created_at DESC
      `, [expertId]);
    } catch (error) {
      this.logger.error('Error in getSoilAnalyses:', error);
      return [];
    }
  }

  async createSoilAnalysis(expertId: string, dto: any) {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS soil_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expert_id UUID NOT NULL, farmer_id UUID, parcel_id UUID,
          analysis_date DATE, ph NUMERIC(4,2), organic_matter_pct NUMERIC(6,3),
          nitrogen_ppm NUMERIC(8,2), phosphorus_ppm NUMERIC(8,2), potassium_ppm NUMERIC(8,2),
          calcium_ppm NUMERIC(8,2), magnesium_ppm NUMERIC(8,2), conductivity_ms NUMERIC(6,3),
          notes TEXT, lab_report_url TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      const res = await this.dataSource.query(`
        INSERT INTO soil_analyses (expert_id, farmer_id, parcel_id, analysis_date, ph, organic_matter_pct,
          nitrogen_ppm, phosphorus_ppm, potassium_ppm, calcium_ppm, magnesium_ppm, conductivity_ms, notes, lab_report_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [expertId, dto.farmer_id || null, dto.parcel_id || null, dto.analysis_date || null,
          dto.ph || null, dto.organic_matter_pct || null, dto.nitrogen_ppm || null,
          dto.phosphorus_ppm || null, dto.potassium_ppm || null, dto.calcium_ppm || null,
          dto.magnesium_ppm || null, dto.conductivity_ms || null, dto.notes || null, dto.lab_report_url || null]);
      return res[0];
    } catch (e) { this.logger.error('createSoilAnalysis error', e); throw e; }
  }

  async getWells(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.wells') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT w.*, u.name as farmer_name
        FROM wells w
        JOIN users u ON u.id = w.farmer_id
        WHERE w.expert_id = $1
        ORDER BY w.created_at DESC
      `, [expertId]);
    } catch (error) {
      this.logger.error('Error in getWells:', error);
      return [];
    }
  }

  async createWell(expertId: string, dto: any) {
    const waterLevel = dto.water_level_m != null ? Number(dto.water_level_m) : null;
    const salinity = dto.salinity_g_l != null ? Number(dto.salinity_g_l) : null;

    const res = await this.dataSource.query(`
      INSERT INTO wells (expert_id, farmer_id, well_name, lat, lng, depth_m, water_level_m, salinity_g_l, tds_mg_l, status, geological_notes, baseline_water_level_m, anomaly_drawdown, anomaly_salinity)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [expertId, dto.farmer_id||null, dto.well_name||null, dto.lat||null, dto.lng||null,
        dto.depth_m||null, waterLevel, salinity, dto.tds_mg_l||null,
        dto.status||'ACTIVE', dto.geological_notes||null,
        waterLevel,
        false,
        salinity != null && salinity > 3.0]);
    return res[0];
  }

  async addWellMeasurement(wellId: string, dto: any) {
    const res = await this.dataSource.query(`
      INSERT INTO well_measurements (well_id, water_level_m, salinity_g_l, notes, measured_at)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [wellId, dto.water_level_m||null, dto.salinity_g_l||null, dto.notes||null, dto.measured_at || new Date()]);

    await this.recomputeWellAnomalies(wellId);

    return res[0];
  }

  async recomputeWellAnomalies(wellId: string) {
    const wellRows = await this.dataSource.query(`SELECT baseline_water_level_m FROM wells WHERE id = $1`, [wellId]);
    if (!wellRows.length) return;
    const baseline = wellRows[0].baseline_water_level_m != null ? Number(wellRows[0].baseline_water_level_m) : null;

    const latestMeasurement = await this.dataSource.query(`
      SELECT water_level_m, salinity_g_l FROM well_measurements
      WHERE well_id = $1 ORDER BY measured_at DESC LIMIT 1
    `, [wellId]);

    let currentWaterLevel: number | null = null;
    let currentSalinity: number | null = null;
    if (latestMeasurement.length) {
      currentWaterLevel = latestMeasurement[0].water_level_m != null ? Number(latestMeasurement[0].water_level_m) : null;
      currentSalinity = latestMeasurement[0].salinity_g_l != null ? Number(latestMeasurement[0].salinity_g_l) : null;
    }

    let anomalyDrawdown = false;
    if (baseline != null && currentWaterLevel != null && baseline > 0) {
      const dropPct = ((baseline - currentWaterLevel) / baseline) * 100;
      anomalyDrawdown = dropPct > 15;
    }

    const anomalySalinity = currentSalinity != null && currentSalinity > 3.0;

    await this.dataSource.query(`
      UPDATE wells
      SET anomaly_drawdown = $1, anomaly_salinity = $2, updated_at = now()
      WHERE id = $3
    `, [anomalyDrawdown, anomalySalinity, wellId]);
  }

  async getWellMeasurements(wellId: string) {
    try {
      return await this.dataSource.query(`
        SELECT * FROM well_measurements WHERE well_id = $1 ORDER BY measured_at DESC LIMIT 50
      `, [wellId]);
    } catch (error) {
      this.logger.error(`Error in getWellMeasurements for wellId=${wellId}:`, error);
      return [];
    }
  }

  async getHerdRecords(expertId: string, farmerId: string) {
    try {
      return await this.herdRecordRepo
        .createQueryBuilder('hr')
        .select('hr.*')
        .addSelect('u.name', 'farmer_name')
        .innerJoin('hr.farmer', 'u')
        .where('hr.expert_id = :expertId AND hr.farmer_id = :farmerId', { expertId, farmerId })
        .orderBy('hr.created_at', 'DESC')
        .getRawMany();
    } catch (error) {
      this.logger.error(`Error in getHerdRecords for expertId=${expertId} farmerId=${farmerId}:`, error);
      return [];
    }
  }

  async createOrUpdateHerdRecord(expertId: string, dto: any) {
    const record = this.herdRecordRepo.create({
      expert_id: expertId,
      farmer_id: dto.farmer_id,
      species: dto.species || null,
      breed: dto.breed || null,
      herd_size: dto.herd_size || null,
      daily_milk_yield_kg: dto.daily_milk_yield_kg || null,
      birth_rate_pct: dto.birth_rate_pct || null,
      mortality_rate_pct: dto.mortality_rate_pct || null,
      last_visit_date: dto.last_visit_date || null,
      feed_program: dto.feed_program || null,
      notes: dto.notes || null,
      performance_alert: dto.performance_alert || false,
    });
    return await this.herdRecordRepo.save(record);
  }

  async getRationCalculation(species: string, stage: string, herdSize: number) {
    // INRAT/INRA Tunisia norms (per head per day)
    const RATIONS: Record<string, Record<string, { ufl: number; pdin: number; pdie: number; example: string }>> = {
      BOVINE: {
        ENTRETIEN: { ufl: 5.5, pdin: 350, pdie: 350, example: '5 kg foin + 2 kg concentré' },
        GESTATION: { ufl: 7.0, pdin: 450, pdie: 450, example: '6 kg foin + 2.5 kg concentré + minéraux' },
        LACTATION: { ufl: 12.0, pdin: 800, pdie: 800, example: '8 kg foin + 5 kg concentré + 2 kg tourteau' },
        CROISSANCE: { ufl: 4.5, pdin: 400, pdie: 380, example: '4 kg foin + 1.5 kg concentré de croissance' },
      },
      OVINE: {
        ENTRETIEN: { ufl: 0.9, pdin: 70, pdie: 70, example: '1.2 kg foin + 0.3 kg orge' },
        GESTATION: { ufl: 1.2, pdin: 90, pdie: 90, example: '1.5 kg foin + 0.4 kg concentré' },
        LACTATION: { ufl: 2.0, pdin: 150, pdie: 150, example: '1.5 kg foin + 0.7 kg concentré + sel' },
        CROISSANCE: { ufl: 1.0, pdin: 85, pdie: 80, example: '1 kg foin + 0.35 kg concentré croissance' },
      },
      CAPRINE: {
        ENTRETIEN: { ufl: 0.85, pdin: 65, pdie: 65, example: '1 kg foin + 0.25 kg orge' },
        GESTATION: { ufl: 1.1, pdin: 85, pdie: 85, example: '1.3 kg foin + 0.35 kg concentré' },
        LACTATION: { ufl: 1.8, pdin: 140, pdie: 140, example: '1.4 kg foin + 0.65 kg concentré' },
        CROISSANCE: { ufl: 0.9, pdin: 78, pdie: 75, example: '0.9 kg foin + 0.3 kg concentré' },
      },
      CAMEL: {
        ENTRETIEN: { ufl: 6.0, pdin: 400, pdie: 400, example: '8 kg halfa + 2 kg dattes + eau' },
        GESTATION: { ufl: 7.5, pdin: 500, pdie: 500, example: '10 kg halfa + 2.5 kg dattes + sel' },
        LACTATION: { ufl: 10.0, pdin: 700, pdie: 700, example: '12 kg halfa + 3.5 kg concentré' },
        CROISSANCE: { ufl: 4.5, pdin: 350, pdie: 340, example: '6 kg halfa + 1.5 kg concentré' },
      },
    };
    const spKey = (species || 'BOVINE').toUpperCase();
    const stKey = (stage || 'ENTRETIEN').toUpperCase();
    const norm = RATIONS[spKey]?.[stKey] || RATIONS['BOVINE']['ENTRETIEN'];
    const hs = Math.max(1, Number(herdSize) || 1);
    return {
      species: spKey, stage: stKey, herd_size: hs,
      ufl_per_head: norm.ufl,
      ufl_total: Math.round(norm.ufl * hs * 10) / 10,
      pdin_per_head_g: norm.pdin,
      pdin_total_g: norm.pdin * hs,
      pdie_per_head_g: norm.pdie,
      pdie_total_g: norm.pdie * hs,
      example_ration: norm.example,
      note: `Ration journalière pour ${hs} têtes de ${spKey} en ${stKey}. Valeurs INRAT/INRA Tunisie.`,
    };
  }

  async getVaccinations(expertId: string) {
    try {
      return await this.vaccinationRecordRepo
        .createQueryBuilder('vr')
        .select('vr.*')
        .addSelect('u.name', 'farmer_name')
        .addSelect('EXTRACT(DAY FROM (vr.next_reminder_date - NOW()))::int', 'days_until_reminder')
        .addSelect("(vr.next_reminder_date IS NOT NULL AND vr.next_reminder_date <= NOW() + INTERVAL '14 days')", 'upcoming_reminder')
        .innerJoin('vr.farmer', 'u')
        .where('vr.expert_id = :expertId', { expertId })
        .orderBy('vr.vaccination_date', 'DESC')
        .getRawMany();
    } catch (error) {
      this.logger.error('Error in getVaccinations:', error);
      return [];
    }
  }

  async createVaccination(expertId: string, dto: any) {
    const record = this.vaccinationRecordRepo.create({
      expert_id: expertId,
      farmer_id: dto.farmer_id,
      species: dto.species || null,
      animal_count: dto.animal_count || null,
      vaccine_name: dto.vaccine_name || null,
      batch_number: dto.batch_number || null,
      vaccination_date: dto.vaccination_date || null,
      next_reminder_date: dto.next_reminder_date || null,
      notes: dto.notes || null,
    });
    return await this.vaccinationRecordRepo.save(record);
  }

  async getEtcCalculation(crop: string, stage: string, governorate: string) {
    // Get Kc for crop+stage
    const kcRows = await this.dataSource.query(`
      SELECT kc_ini as kc_initial, kc_mid, kc_end FROM crop_kc_values WHERE LOWER(crop_type) = LOWER($1) LIMIT 1
    `, [crop]).catch((error) => {
      this.logger.error('Error query crop_kc_values for crop ' + crop, error);
      return [];
    });
    const kc_map: Record<string, number> = {
      INITIAL: kcRows[0]?.kc_initial || 0.3,
      MI_SAISON: kcRows[0]?.kc_mid || 1.0,
      FIN: kcRows[0]?.kc_end || 0.5,
    };
    const stKey = (stage || 'MI_SAISON').toUpperCase();
    const kc = kc_map[stKey] || 1.0;
    // ETo average for Tunisia (approx by governorate)
    const ETO_GOVS: Record<string, number> = {
      kasserine: 5.5, sfax: 6.0, gabes: 6.2, tozeur: 7.0, kebili: 7.5,
      beja: 4.5, jendouba: 4.8, siliana: 5.0, kef: 5.2, sousse: 5.8,
      monastir: 5.9, mahdia: 5.7, kairouan: 6.1, sidi_bouzid: 6.3,
      gafsa: 7.2, medenine: 6.8, tataouine: 7.8, nabeul: 5.3,
      bizerte: 4.4, ariana: 4.6, tunis: 4.7, ben_arous: 4.8, manouba: 4.7, zaghouan: 5.1
    };
    const govKey = (governorate || 'kasserine').toLowerCase().replace(/ /g, '_');
    const eto = ETO_GOVS[govKey] || 5.5;
    const etc = Math.round(kc * eto * 10) / 10;
    const m3_per_ha = Math.round(etc * 10); // 1 mm = 10 m3/ha
    return {
      crop, stage: stKey, governorate, kc, eto,
      etc_mm_day: etc,
      m3_per_ha_day: m3_per_ha,
      recommendation: `ETc = ${etc} mm/jour. Besoin en eau: ${m3_per_ha} m³/ha/jour. Fréquence recommandée: tous les ${etc < 4 ? '3-4' : etc < 6 ? '2-3' : '1-2'} jours selon le sol.`,
    };
  }

  async getWaterProjects(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.water_projects') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT wp.*, u.name as farmer_name FROM water_projects wp
        JOIN users u ON u.id = wp.farmer_id
        WHERE wp.expert_id = $1 ORDER BY wp.created_at DESC
      `, [expertId]);
    } catch (error) {
      this.logger.error('Error in getWaterProjects:', error);
      return [];
    }
  }

  async updateWaterProjectStatus(expertId: string, projectId: string, status: string) {
    const validStatuses = ['DESIGN', 'INSTALLATION', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`);
    }
    const rows = await this.dataSource.query(
      `SELECT id FROM water_projects WHERE id = $1 AND expert_id = $2`,
      [projectId, expertId]
    );
    if (!rows.length) throw new NotFoundException('Projet introuvable ou non autorisé');
    const res = await this.dataSource.query(
      `UPDATE water_projects SET status = $1, updated_at = now() WHERE id = $2 AND expert_id = $3 RETURNING *`,
      [status, projectId, expertId]
    );
    return res[0];
  }

  async updateWell(expertId: string, wellId: string, dto: { well_name?: string; status?: string; geological_notes?: string }) {
    const validStatuses = ['ACTIVE', 'INACTIVE'];
    if (dto.status && !validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`);
    }
    const rows = await this.dataSource.query(
      `SELECT id FROM wells WHERE id = $1 AND expert_id = $2`,
      [wellId, expertId]
    );
    if (!rows.length) throw new NotFoundException('Puits introuvable ou non autorisé');

    const updates: string[] = [];
    const params: any[] = [wellId, expertId];
    let idx = 3;
    if (dto.well_name !== undefined) { updates.push(`well_name = $${idx++}`); params.push(dto.well_name); }
    if (dto.status !== undefined) { updates.push(`status = $${idx++}`); params.push(dto.status); }
    if (dto.geological_notes !== undefined) { updates.push(`geological_notes = $${idx++}`); params.push(dto.geological_notes); }
    if (!updates.length) return { success: true };
    updates.push('updated_at = now()');

    const res = await this.dataSource.query(
      `UPDATE wells SET ${updates.join(', ')} WHERE id = $1 AND expert_id = $2 RETURNING *`,
      params
    );
    return res[0];
  }

  async deleteWell(expertId: string, wellId: string) {
    const rows = await this.dataSource.query(
      `SELECT id FROM wells WHERE id = $1 AND expert_id = $2`,
      [wellId, expertId]
    );
    if (!rows.length) throw new NotFoundException('Puits introuvable ou non autorisé');
    await this.dataSource.query(`DELETE FROM wells WHERE id = $1 AND expert_id = $2`, [wellId, expertId]);
    return { success: true };
  }

  async createWaterProject(expertId: string, dto: any) {
    const res = await this.dataSource.query(`
      INSERT INTO water_projects (expert_id, farmer_id, project_name, irrigation_type, status, area_ha, installation_date, estimated_completion_date, notes, design_pdf_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [expertId, dto.farmer_id, dto.project_name||null, dto.irrigation_type||null,
        dto.status||'DESIGN', dto.area_ha||null, dto.installation_date||null,
        dto.estimated_completion_date||null, dto.notes||null, dto.design_pdf_url||null]);
    return res[0];
  }

  async getCropJournals(expertId: string, farmerId: string, season?: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.crop_journals') as t`);
      if (!t[0]?.t) return [];
      let q = `SELECT cj.*, u.name as farmer_name FROM crop_journals cj JOIN users u ON u.id = cj.farmer_id WHERE cj.expert_id = $1 AND cj.farmer_id = $2`;
      const params: any[] = [expertId, farmerId];
      if (season) { q += ` AND cj.season = $3`; params.push(season); }
      q += ` ORDER BY cj.created_at DESC`;
      return await this.dataSource.query(q, params);
    } catch (error) {
      this.logger.error(`Error in getCropJournals for expertId=${expertId} farmerId=${farmerId}:`, error);
      return [];
    }
  }

  async createCropJournal(expertId: string, dto: any) {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS crop_journals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL, farmer_id UUID NOT NULL, parcel_id UUID,
        season VARCHAR(20), crop_type VARCHAR(100), sowing_date DATE, harvest_date DATE,
        yield_kg_ha NUMERIC(10,2), fertilizer_used TEXT, pesticides_used TEXT,
        observations TEXT, recommendations TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    const res = await this.dataSource.query(`
      INSERT INTO crop_journals (expert_id, farmer_id, parcel_id, season, crop_type, sowing_date, harvest_date, yield_kg_ha, fertilizer_used, pesticides_used, observations, recommendations)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [expertId, dto.farmer_id, dto.parcel_id||null, dto.season||null, dto.crop_type||null,
        dto.sowing_date||null, dto.harvest_date||null, dto.yield_kg_ha||null,
        dto.fertilizer_used||null, dto.pesticides_used||null, dto.observations||null, dto.recommendations||null]);
    return res[0];
  }

  // ── Phase 1: CRDA Zones Reference ──────────────────────────────────────────
  async getCrdaZones() {
    return this.crdaZoneRepo.find({ order: { region_name: 'ASC', district_name: 'ASC' } });
  }

  async getGovernorateBoundaries() {
    return this.govBoundaryRepo.find({ order: { name_fr: 'ASC' } });
  }

  // ── Phase 2: Expert Discovery with Relevance Scoring ────────────────────────
  async discoverExperts(
    farmerId: string,
    farmerLat: number,
    farmerLng: number,
    problemCategory?: string,
    type?: string,
    expertType?: string
  ) {
    // Get farmer's governorate
    const farmer = await this.dataSource.query(`SELECT id, governorate, lat, lng FROM users WHERE id = $1`, [farmerId]);
    if (!farmer.length) throw new NotFoundException('Agriculteur introuvable');
    const fLat = farmerLat ?? farmer[0].lat;
    const fLng = farmerLng ?? farmer[0].lng;
    const fGov = farmer[0].governorate;

    // Get all completed experts (excluding already-linked ones)
    const experts = await this.dataSource.query(`
      SELECT u.id, u.name, u.governorate, u.profile_picture_url,
             ep.expert_type, ep.professional_status, ep.crda_zone_id,
             ep.affiliation_name, ep.institution_name, ep.accepts_remote_consultations,
             ep.governorate_zones, ep.bio, ep.certifications,
             ep.consultation_rate_tnd, ep.tarif_note, ep.expert_score
      FROM users u
      JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE u.role = 'EXPERT' AND ep.is_profile_completed = true
        AND NOT EXISTS (
          SELECT 1 FROM expert_farmer_relations efr
          WHERE efr.expert_id = u.id AND efr.farmer_id = $1
            AND efr.status IN ('PENDING', 'ACCEPTED')
        )
    `, [farmerId]);

    const scored: any[] = [];
    for (const expert of experts) {
      const score = await this.scoreExpert(expert, fLat, fLng, fGov, problemCategory, type, expertType);
      if (score !== null) {
        scored.push({ ...expert, relevance_score: score });
      }
    }

    scored.sort((a, b) => b.relevance_score - a.relevance_score || 0);
    return scored;
  }

  private async scoreExpert(
    expert: any,
    farmerLat: number,
    farmerLng: number,
    farmerGov: string,
    problemCategory?: string,
    type?: string,
    expertTypeFilter?: string
  ): Promise<number | null> {
    // Type filter: if expertType specified, only match that type
    if (expertTypeFilter && expert.expert_type !== expertTypeFilter) return null;

    // Type filter: CRDA vs liberal
    const statuses: string[] = expert.professional_status || [];
    const isCrda = statuses.includes('CRDA_AGENT');
    if (type === 'crda' && !isCrda) return null;
    if (type === 'liberal' && isCrda) return null;

    const cnt = 0;
    // Distance component (40 points)
    let distScore = 0;
    let isContained = false;

    try {
      const spatial = await this.dataSource.query(`
        SELECT ST_Contains(
          (SELECT ST_Union(gb.polygon) FROM tunisian_governorate_boundaries gb
           WHERE gb.name_fr = ANY($1::text[])),
          ST_SetSRID(ST_MakePoint($2, $3), 4326)
        ) as contained,
        ST_Distance(
          ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
          (SELECT ST_Centroid(ST_Union(gb.polygon))::geography FROM tunisian_governorate_boundaries gb
           WHERE gb.name_fr = ANY($1::text[]))
        ) as dist_meters
      `, [expert.governorate_zones || [], farmerLng, farmerLat]);
      if (spatial.length) {
        isContained = spatial[0].contained;
        const distKm = (spatial[0].dist_meters || 999999) / 1000;

        if (isContained) {
          distScore = 40;
        } else if (distKm < 30) {
          distScore = 35;
        } else if (distKm < 50) {
          distScore = 28;
        } else if (distKm < 100) {
          distScore = 18;
        } else if (distKm >= 100 && expert.accepts_remote_consultations) {
          distScore = 8;
        } else {
          distScore = 0;
        }
      }
    } catch (e) {
      this.logger.error('Error computing distance for expert', expert.id, e);
      distScore = 0;
    }

    // Type match component (30 points)
    let typeScore = 0;
    if (problemCategory) {
      const mapped = this.getProblemExpertTypes(problemCategory);
      if (mapped.primary.includes(expert.expert_type)) {
        typeScore = 30;
      } else if (mapped.secondary.includes(expert.expert_type)) {
        typeScore = 15;
      } else if (mapped.future) {
        // Future type: return 0 score for now
        return null;
      } else {
        typeScore = 0;
      }
    }

    // Activity component (20 points)
    const activityScore = Math.min(20, (expert.expert_score || 0) * 0.20);

    // Institutional bonus (10 points)
    let instScore = 0;
    if ((expert.professional_status || []).includes('CRDA_AGENT') && isContained) {
      instScore = 10;
    } else if (expert.governorate === farmerGov && farmerGov) {
      instScore = 5;
    }

    return distScore + typeScore + activityScore + instScore;
  }

  private getProblemExpertTypes(category: string): { primary: string[]; secondary: string[]; future?: boolean } {
    const map: Record<string, { primary: string[]; secondary: string[]; future?: boolean }> = {
      cultures: { primary: ['PHYTOPATHOLOGIST', 'AGRONOMIST'], secondary: [] },
      irrigation: { primary: ['HYDRAULIC_ENGINEER', 'HYDROGEOLOGIST'], secondary: [] },
      animaux: { primary: ['ZOOTECHNICIAN', 'VETERINARY_EPIDEMIOLOGIST'], secondary: [] },
      technicien: { primary: ['AGRONOMIST'], secondary: [] },
      financier: { primary: [], secondary: [], future: true },
      materiel: { primary: [], secondary: [], future: true },
    };
    return map[category] || { primary: [], secondary: [] };
  }

  // ── Phase 3: Farmer Cancel Pending Request ──────────────────────────────────
  async cancelPendingFarmerLink(farmerId: string, expertId: string) {
    const result = await this.dataSource.query(`
      DELETE FROM expert_farmer_relations
      WHERE expert_id = $1 AND farmer_id = $2 AND status = 'PENDING' AND requested_by = 'FARMER'
      RETURNING id
    `, [expertId, farmerId]);
    if (!result.length) throw new NotFoundException('Demande en attente introuvable');
    return { success: true };
  }

  // ── Phase 4: Consultation AWAITING_INFO Flow ────────────────────────────────
  async requestAdditionalInfo(consultationId: string, expertId: string, chips: string[], text?: string) {
    const consultation = await this.expertConsultationRepo.findOne({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundException('Consultation introuvable');
    if (consultation.expert_id !== expertId) throw new BadRequestException('Vous n\'êtes pas l\'expert assigné');
    if (consultation.status !== ConsultationStatus.IN_PROGRESS) {
      throw new BadRequestException('La consultation n\'est pas en cours');
    }

    consultation.status = ConsultationStatus.AWAITING_INFO;
    await this.expertConsultationRepo.save(consultation);

    // Create the additional info request
    const info = this.consultAddInfoRepo.create({
      consultation_id: consultationId,
      farmer_id: consultation.farmer_id,
      requested_chips: chips,
      requested_text: text ?? null,
    } as any);
    await this.consultAddInfoRepo.save(info);

    await this.notificationService.sendToUsers(
      [consultation.farmer_id],
      'Informations complémentaires requises',
      'L\'expert a demandé des informations supplémentaires pour votre consultation.',
      { type: 'CONSULTATION_AWAITING_INFO', consultation_id: consultationId }
    );

    return { success: true };
  }

  async submitAdditionalInfo(consultationId: string, farmerId: string, text?: string, photoUrls?: string[]) {
    const info = await this.consultAddInfoRepo.findOne({ where: { consultation_id: consultationId, farmer_id: farmerId } });
    if (!info) throw new NotFoundException('Demande d\'informations introuvable');
    if (info.submitted_at) throw new BadRequestException('Informations déjà soumises');

    info.additional_text = text ?? null;
    info.additional_photos = photoUrls ?? null;
    info.submitted_at = new Date();
    await this.consultAddInfoRepo.save(info);

    // Set consultation back to IN_PROGRESS
    const consultation = await this.expertConsultationRepo.findOne({ where: { id: consultationId } });
    if (consultation) {
      consultation.status = ConsultationStatus.IN_PROGRESS;
      await this.expertConsultationRepo.save(consultation);

      if (consultation.expert_id) {
        await this.notificationService.sendToUsers(
          [consultation.expert_id],
          'Informations reçues',
          'L\'agriculteur a fourni les informations demandées.',
          { type: 'CONSULTATION_INFO_SUBMITTED', consultation_id: consultationId }
        );
      }
    }

    return { success: true };
  }

  async getConsultationAdditionalInfo(consultationId: string) {
    return this.consultAddInfoRepo.findOne({ where: { consultation_id: consultationId } });
  }

  // ── Phase 5: Commission Agreements ──────────────────────────────────────────
  async getCommissionAgreements(expertId: string) {
    return this.commissionAgreementRepo.find({ where: { expert_id: expertId, active: true } });
  }

  async createCommissionAgreement(expertId: string, dto: { supplier_id: string; commission_percentage: number }) {
    if (dto.commission_percentage < 0 || dto.commission_percentage > 100) {
      throw new BadRequestException('Le pourcentage de commission doit être entre 0 et 100');
    }
    const existing = await this.commissionAgreementRepo.findOne({
      where: { expert_id: expertId, supplier_id: dto.supplier_id, active: true }
    });
    if (existing) throw new BadRequestException('Un accord existe déjà avec ce fournisseur');

    const agreement = this.commissionAgreementRepo.create({
      expert_id: expertId,
      supplier_id: dto.supplier_id,
      commission_percentage: dto.commission_percentage,
    });
    return this.commissionAgreementRepo.save(agreement);
  }

  async removeCommissionAgreement(expertId: string, agreementId: string) {
    const agreement = await this.commissionAgreementRepo.findOne({ where: { id: agreementId, expert_id: expertId } });
    if (!agreement) throw new NotFoundException('Accord introuvable');
    agreement.active = false;
    return this.commissionAgreementRepo.save(agreement);
  }

  // ── Phase 5: Prescription Purchase Tracking ─────────────────────────────────
  async createPrescriptionPurchase(dto: {
    prescription_id: string;
    farmer_id: string;
    expert_id: string;
    supplier_id?: string;
    product_id?: string;
    quantity?: number;
    unit_price?: number;
    commission_percentage?: number;
  }) {
    let commissionAmount = 0;
    if (dto.commission_percentage && dto.unit_price && dto.quantity) {
      commissionAmount = (dto.unit_price * dto.quantity) * (dto.commission_percentage / 100);
    }

    const purchase = this.prescriptionPurchaseRepo.create({
      ...dto,
      commission_amount: commissionAmount,
      status: 'PENDING',
    });
    return this.prescriptionPurchaseRepo.save(purchase);
  }

  async markPrescriptionPurchaseDelivered(purchaseId: string) {
    const purchase = await this.prescriptionPurchaseRepo.findOne({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('Achat introuvable');

    purchase.status = 'DELIVERED';
    const saved = await this.prescriptionPurchaseRepo.save(purchase);

    // Create FinancialRecord for the expert's commission
    if (Number(saved.commission_amount) > 0) {
      await this.commissionService.recordCommission(
        this.dataSource.createQueryRunner(),
        {
          type: CommissionTransactionType.REFERRAL_COMMISSION,
          grossTnd: Number(saved.commission_amount),
          payerUserId: saved.farmer_id,
          payeeUserId: saved.expert_id,
          relatedEntityId: saved.id,
          rate: Number(saved.commission_percentage) / 100,
          category: RecordCategory.REFERRAL_COMMISSION,
        }
      );
    }

    return saved;
  }

  async getPrescriptionPurchases(expertId: string) {
    return this.dataSource.query(`
      SELECT pp.*, p.product_name, u.name as farmer_name, pr.product_name as order_product
      FROM prescription_purchases pp
      LEFT JOIN prescriptions p ON p.id = pp.prescription_id
      LEFT JOIN users u ON u.id = pp.farmer_id
      LEFT JOIN product pr ON pr.id = pp.product_id
      WHERE pp.expert_id = $1
      ORDER BY pp.created_at DESC
    `, [expertId]);
  }

  // ── Phase 7: Farmer's Accepted Experts ──────────────────────────────────────
  async getMyLinkedExperts(farmerId: string) {
    return this.dataSource.query(`
      SELECT u.id, u.name, u.governorate, u.profile_picture_url,
             ep.expert_type, ep.professional_status, ep.crda_zone_id,
             ep.affiliation_name, ep.institution_name,
             ep.consultation_rate_tnd, ep.expert_score,
             efr.status, efr.requested_by, efr.created_at as relation_created_at,
             efr.accepted_at,
             (SELECT body FROM expert_messages
              WHERE (sender_id = u.id AND receiver_id = $1)
                 OR (receiver_id = u.id AND sender_id = $1)
              ORDER BY created_at DESC LIMIT 1
             ) as last_message
      FROM expert_farmer_relations efr
      JOIN users u ON u.id = efr.expert_id
      LEFT JOIN expert_profiles ep ON ep.user_id = u.id
      WHERE efr.farmer_id = $1 AND efr.status IN ('PENDING', 'ACCEPTED')
      ORDER BY
        CASE WHEN efr.status = 'ACCEPTED' AND ep.professional_status::jsonb @> '["CRDA_AGENT"]'::jsonb THEN 0 ELSE 1 END,
        efr.accepted_at DESC NULLS LAST,
        efr.created_at DESC
    `, [farmerId]);
  }

  async checkCrdaAutoAssignment(farmerId: string) {
    const farmer = await this.dataSource.query(`SELECT id, lat, lng, governorate FROM users WHERE id = $1`, [farmerId]);
    if (!farmer.length) return null;

    const f = farmer[0];
    if (!f.lat || !f.lng) return null;

    // Find CRDA experts whose zone contains the farmer's location
    const agents = await this.dataSource.query(`
      SELECT u.id, u.name, u.governorate, u.profile_picture_url,
             ep.crda_zone_id, ep.expert_type, ep.consultation_rate_tnd,
             cz.region_name, cz.district_name
      FROM expert_profiles ep
      JOIN users u ON u.id = ep.user_id
      JOIN crda_zones cz ON cz.id = ep.crda_zone_id
      WHERE u.role = 'EXPERT'
        AND ep.is_profile_completed = true
        AND ep.professional_status::jsonb @> '["CRDA_AGENT"]'::jsonb
        AND NOT EXISTS (
          SELECT 1 FROM expert_farmer_relations efr
          WHERE efr.expert_id = u.id AND efr.farmer_id = $1 AND efr.status = 'ACCEPTED'
        )
    `, [farmerId]);

    // Find which CRDA zone the farmer falls in
    const zoneMatch = await this.dataSource.query(`
      SELECT cz.id, cz.region_name, cz.district_name
      FROM crda_zones cz
      JOIN expert_profiles ep ON ep.crda_zone_id = cz.id
      WHERE ep.professional_status::jsonb @> '["CRDA_AGENT"]'::jsonb
      GROUP BY cz.id
      LIMIT 1
    `);

    if (!zoneMatch.length) return null;

    // Find agent for this zone
    const matchingAgent = agents.find((a: any) => a.crda_zone_id === zoneMatch[0].id);
    if (!matchingAgent) return null;

    // Check existing relations
    const hasRelation = await this.dataSource.query(`
      SELECT id FROM expert_farmer_relations
      WHERE expert_id = $1 AND farmer_id = $2 AND status = 'ACCEPTED'
    `, [matchingAgent.id, farmerId]);
    if (hasRelation.length) return null;

    return matchingAgent;
  }

  // ── Sprint 3: Water Calculation History ──────────────────────────────────────
  async saveWaterCalculation(expertId: string, dto: any) {
    const res = await this.dataSource.query(`
      INSERT INTO water_calculations (expert_id, farmer_id, crop_type, stage, governorate, area_ha, kc, eto, etc_mm_day, m3_per_ha_day, total_m3_day, recommendation)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [
      expertId, dto.farmer_id || null, dto.crop_type || null, dto.stage || null,
      dto.governorate || null, dto.area_ha || null, dto.kc || null, dto.eto || null,
      dto.etc_mm_day || null, dto.m3_per_ha_day || null, dto.total_m3_day || null, dto.recommendation || null
    ]);
    return res[0];
  }

  async getWaterCalculations(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.water_calculations') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT wc.*, u.name as farmer_name
        FROM water_calculations wc
        LEFT JOIN users u ON u.id = wc.farmer_id
        WHERE wc.expert_id = $1
        ORDER BY wc.created_at DESC LIMIT 50
      `, [expertId]);
    } catch (e) {
      this.logger.error('getWaterCalculations error', e);
      return [];
    }
  }

  // ── Sprint 3: Reproduction Calendar ──────────────────────────────────────────
  async getReproductionRecords(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.reproduction_records') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT rr.*, u.name as farmer_name
        FROM reproduction_records rr
        LEFT JOIN users u ON u.id = rr.farmer_id
        WHERE rr.expert_id = $1
        ORDER BY rr.created_at DESC
      `, [expertId]);
    } catch (e) {
      this.logger.error('getReproductionRecords error', e);
      return [];
    }
  }

  async createReproductionRecord(expertId: string, dto: any) {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS reproduction_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL,
        farmer_id UUID,
        species VARCHAR(50),
        animal_tag VARCHAR(100),
        insemination_date DATE,
        gestation_days INTEGER,
        expected_birth_date DATE,
        actual_birth_date DATE,
        gestation_confirmed BOOLEAN DEFAULT false,
        status VARCHAR(30) DEFAULT 'PLANNED',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    const res = await this.dataSource.query(`
      INSERT INTO reproduction_records (expert_id, farmer_id, species, animal_tag, insemination_date, gestation_days, expected_birth_date, gestation_confirmed, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [
      expertId, dto.farmer_id || null, dto.species || null, dto.animal_tag || null,
      dto.insemination_date || null, dto.gestation_days || null, dto.expected_birth_date || null,
      dto.gestation_confirmed || false, dto.status || 'PLANNED', dto.notes || null
    ]);
    return res[0];
  }

  async updateReproductionRecord(expertId: string, id: string, dto: any) {
    const rows = await this.dataSource.query(`SELECT id FROM reproduction_records WHERE id = $1 AND expert_id = $2`, [id, expertId]);
    if (!rows.length) throw new Error('Enregistrement introuvable');
    const updates = Object.entries(dto)
      .filter(([k]) => ['actual_birth_date','gestation_confirmed','status','notes'].includes(k))
      .map(([k, v], i) => `${k} = $${i + 3}`)
      .join(', ');
    if (!updates) return { success: true };
    const vals = Object.entries(dto)
      .filter(([k]) => ['actual_birth_date','gestation_confirmed','status','notes'].includes(k))
      .map(([, v]) => v);
    const res = await this.dataSource.query(
      `UPDATE reproduction_records SET ${updates} WHERE id = $1 AND expert_id = $2 RETURNING *`,
      [id, expertId, ...vals]
    );
    return res[0];
  }

  // ── Sprint 3: Clinical Dossiers ───────────────────────────────────────────────
  async getClinicalDossiers(expertId: string) {
    try {
      const t = await this.dataSource.query(`SELECT to_regclass('public.clinical_dossiers') as t`);
      if (!t[0]?.t) return [];
      return this.dataSource.query(`
        SELECT cd.*, u.name as farmer_name
        FROM clinical_dossiers cd
        LEFT JOIN users u ON u.id = cd.farmer_id
        WHERE cd.expert_id = $1
        ORDER BY cd.created_at DESC
      `, [expertId]);
    } catch (e) {
      this.logger.error('getClinicalDossiers error', e);
      return [];
    }
  }

  async createClinicalDossier(expertId: string, dto: any) {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS clinical_dossiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expert_id UUID NOT NULL,
        farmer_id UUID,
        species VARCHAR(50),
        animal_tag VARCHAR(100),
        animal_count INTEGER,
        visit_date DATE,
        symptoms TEXT,
        diagnosis TEXT,
        treatment TEXT,
        exams_requested TEXT,
        prescription_id UUID,
        follow_up_date DATE,
        status VARCHAR(30) DEFAULT 'OPEN',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    const res = await this.dataSource.query(`
      INSERT INTO clinical_dossiers (expert_id, farmer_id, species, animal_tag, animal_count, visit_date, symptoms, diagnosis, treatment, exams_requested, follow_up_date, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [
      expertId, dto.farmer_id || null, dto.species || null, dto.animal_tag || null,
      dto.animal_count || null, dto.visit_date || null, dto.symptoms || null,
      dto.diagnosis || null, dto.treatment || null, dto.exams_requested || null,
      dto.follow_up_date || null, dto.status || 'OPEN', dto.notes || null
    ]);
    return res[0];
  }

  async updateClinicalDossier(expertId: string, id: string, dto: any) {
    const rows = await this.dataSource.query(`SELECT id FROM clinical_dossiers WHERE id = $1 AND expert_id = $2`, [id, expertId]);
    if (!rows.length) throw new Error('Dossier introuvable');
    const allowed = ['diagnosis','treatment','exams_requested','follow_up_date','status','notes'];
    const updates = Object.entries(dto).filter(([k]) => allowed.includes(k)).map(([k], i) => `${k} = $${i + 3}`).join(', ');
    if (!updates) return { success: true };
    const vals = Object.entries(dto).filter(([k]) => allowed.includes(k)).map(([, v]) => v);
    const res = await this.dataSource.query(
      `UPDATE clinical_dossiers SET ${updates} WHERE id = $1 AND expert_id = $2 RETURNING *`,
      [id, expertId, ...vals]
    );
    return res[0];
  }

  // ── Sprint 3: Farmer-facing livestock reads ────────────────────────────────
  async getHerdRecordsByFarmer(farmerId: string) {
    return this.herdRecordRepo.find({
      where: { farmer_id: farmerId },
      order: { updated_at: 'DESC' },
    });
  }

  async getVaccinationsByFarmer(farmerId: string) {
    return this.vaccinationRecordRepo.find({
      where: { farmer_id: farmerId },
      order: { vaccination_date: 'DESC' },
    });
  }
}
