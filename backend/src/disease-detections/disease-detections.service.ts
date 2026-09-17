import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DiseaseDetection } from './entities/disease-detection.entity';
import { CreateDiseaseDetectionDto } from './dto/disease-detection.dto';

import { PaginatedResult } from '../common/dto/paginated.dto';
import { NotificationService } from '../notifications/notification.service';
import { ProductCategory } from '../supplier/entities/product.entity';
import { ExpertType } from '../common/enums/expert-type.enum';
import { DiseaseKnowledgeService } from '../ai/services/disease-knowledge.service';

@Injectable()
export class DiseaseDetectionsService {
  private readonly logger = new Logger(DiseaseDetectionsService.name);

  constructor(
    @InjectRepository(DiseaseDetection)
    private readonly repo: Repository<DiseaseDetection>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly diseaseKnowledgeService: DiseaseKnowledgeService,
  ) {}

  async create(dto: CreateDiseaseDetectionDto, reporterId: string): Promise<DiseaseDetection> {
    const detection = await this.repo.save(this.repo.create({ ...dto, reporter_id: reporterId, required_expert_type: ExpertType.PHYTOPATHOLOGIST }));
    
    if (detection.confidence_score >= 0.85) {
      // Find reporter to get governorate
      const reporter = await this.dataSource.query(`SELECT governorate FROM users WHERE id = $1`, [reporterId]);
      const gov = reporter[0]?.governorate || null;
      this.triggerSupplierAlert(detection.disease_name, detection.crop_type, detection.lat, detection.lng, gov);
    }
    
    return detection;
  }

  async findByReporter(reporterId: string, page = 1, limit = 20): Promise<PaginatedResult<DiseaseDetection>> {
    const [items, total] = await this.repo.findAndCount({
      where: { reporter_id: reporterId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return {
      items,
      total,
      page,
      limit,
      hasNext: (page * limit) < total
    };
  }

  async linkParcel(id: string, parcelId: string) {
    const detection = await this.findOne(id);
    detection.parcel_id = parcelId;
    return this.repo.save(detection);
  }

  async requestValidation(id: string, expertId?: string) {
    const detection = await this.findOne(id);
    detection.requires_expert_validation = true;
    if (expertId) {
      detection.assigned_expert_id = expertId;
      // Also set required_expert_type to the expert's own type so it passes the type filter
      const expert = await this.dataSource.query(`SELECT expert_type FROM users WHERE id = $1`, [expertId]);
      if (expert.length && expert[0].expert_type) {
        detection.required_expert_type = expert[0].expert_type;
      }
    }
    return this.repo.save(detection);
  }

  findAll(): Promise<DiseaseDetection[]> {
    return this.repo.find({ relations: ['reporter'], order: { created_at: 'DESC' } });
  }

  /** Retourne les données GPS pour la heatmap Admin */
  async getHeatmapData(): Promise<{ lat: number; lng: number; disease_name: string; confidence_score: number }[]> {
    return this.repo.find({ select: ['lat', 'lng', 'disease_name', 'confidence_score'] });
  }

  async findPendingValidation(): Promise<DiseaseDetection[]> {
    return this.repo.find({
      where: { requires_expert_validation: true },
      relations: ['reporter'],
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: string): Promise<DiseaseDetection> {
    const detection = await this.repo.findOne({ where: { id }, relations: ['reporter'] });
    if (!detection) throw new NotFoundException(`Détection ${id} introuvable`);
    return detection;
  }

  /**
   * Enregistre le feedback d'un expert agronome sur une détection IA.
   * Cette donnée alimentera le pipeline de ré-entraînement du modèle MLOps.
   */
  async submitExpertFeedback(
    detectionId: string,
    expertId: string,
    approved: boolean,
    correctionNote?: string,
  ) {
    const detection = await this.findOne(detectionId);

    detection.requires_expert_validation = false;
    detection.is_expert_validated = true;
    if (!approved && correctionNote) {
      // Append correction note to the French recommendation field as MLOps audit trail
      detection.recommendation_fr = `[CORRECTION EXPERT]: ${correctionNote}`;
    }
    await this.repo.save(detection);

    if (approved) {
      this.diseaseKnowledgeService.trainFromExpert(detection.disease_name, detection.crop_type, {
        fr: detection.recommendation_fr,
        darija: detection.recommendation_darija,
      }).catch(err => this.logger.warn(`Failed to train KB from expert feedback: ${err.message}`));
    }

    if (approved && detection.confidence_score >= 0.7) {
      const reporter = await this.dataSource.query(`SELECT governorate FROM users WHERE id = $1`, [detection.reporter_id]);
      const gov = reporter[0]?.governorate || null;
      this.triggerSupplierAlert(detection.disease_name, detection.crop_type, detection.lat, detection.lng, gov);
    }

    return {
      detection_id: detectionId,
      expert_id: expertId,
      expert_approved: approved,
      correction_note: correctionNote ?? null,
      processed_at: new Date().toISOString(),
      message: 'Feedback enregistré. Il sera inclus dans le prochain cycle de ré-entraînement.',
    };
  }

  /**
   * AI Disease Supplier Trigger
   */
  private async triggerSupplierAlert(diseaseType: string, cropType: string, lat: number, lng: number, governorate: string) {
    // Map disease to relevant product categories
    const diseaseNameLower = diseaseType.toLowerCase();
    let targetCategory = ProductCategory.FUNGICIDE; // Default
    
    if (diseaseNameLower.includes('mildiou') || diseaseNameLower.includes('rouille') || diseaseNameLower.includes('oïdium')) {
      targetCategory = ProductCategory.FUNGICIDE;
    } else if (diseaseNameLower.includes('insectes') || diseaseNameLower.includes('puceron')) {
      targetCategory = ProductCategory.PESTICIDE;
    } else if (diseaseNameLower.includes('carence')) {
      targetCategory = ProductCategory.FERTILIZER;
    }

    // Query suppliers within 80km OR matching governorate OR null governorate_target
    // AND who sell products in the targetCategory
    const suppliers = await this.dataSource.query(`
      SELECT DISTINCT u.id 
      FROM users u
      JOIN products p ON p.supplier_id = u.id
      WHERE u.role = 'SUPPLIER'
      AND p.category = $1
      AND p.is_active = true
      AND (
        (u.lat IS NOT NULL AND u.lng IS NOT NULL AND ST_DWithin(u.location::geography, ST_MakePoint($2, $3)::geography, 80000))
        OR p.governorate_target = $4
        OR p.governorate_target IS NULL
      )
    `, [targetCategory, lng, lat, governorate]);

    const supplierIds = suppliers.map((s: any) => s.id);
    if (supplierIds.length > 0) {
      this.notificationService.sendToUsers(
        supplierIds,
        `Opportunité commerciale — ${diseaseType}`,
        `Une ${diseaseType} a été détectée sur ${cropType} dans votre zone. Des agriculteurs sont potentiellement affectés.`,
        { type: 'DISEASE_OPPORTUNITY', disease: diseaseType, crop: cropType, governorate }
      );
    }
  }
}
