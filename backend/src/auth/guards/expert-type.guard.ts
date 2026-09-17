import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DiseaseDetection } from '../../disease-detections/entities/disease-detection.entity';
import { FieldReport } from '../../ambassador/entities/field-report.entity';
import { ExpertConsultation } from '../../expert/entities/expert-consultation.entity';
import { Role } from '../../common/enums/role.enum';
import { ExpertType } from '../../common/enums/expert-type.enum';

@Injectable()
export class ExpertTypeGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (user.role !== Role.EXPERT) {
      throw new ForbiddenException('Accès réservé aux experts');
    }

    const { id } = request.params;
    if (!id) {
      return true;
    }

    const url = request.url;
    let requiredExpertType: ExpertType | null = null;

    if (url.includes('disease-detections')) {
      const repo = this.dataSource.getRepository(DiseaseDetection);
      const entity = await repo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Détection introuvable');
      requiredExpertType = entity.required_expert_type;
    } else if (url.includes('field-reports')) {
      const repo = this.dataSource.getRepository(FieldReport);
      const entity = await repo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Rapport terrain introuvable');
      requiredExpertType = entity.required_expert_type;
    } else if (url.includes('consultations')) {
      const repo = this.dataSource.getRepository(ExpertConsultation);
      const entity = await repo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Consultation introuvable');
      requiredExpertType = entity.expert_type;
    }

    if (requiredExpertType && user.expert_type !== requiredExpertType) {
      throw new ForbiddenException(
        `Accès refusé. Spécialité requise : ${requiredExpertType}`
      );
    }

    return true;
  }
}
