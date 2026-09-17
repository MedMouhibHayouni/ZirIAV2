import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionEvaluationBadge } from './entities/mission-evaluation-badge.entity';

const BADGES = [
  { code: 'PONCTUEL', label_fr: 'Ponctuel', label_darija: 'دقيق في المواعيد', icon_name: 'lucideTimer', positive: true },
  { code: 'TRAVAIL_SOIGNE', label_fr: 'Travail soigné', label_darija: 'عمل متقن', icon_name: 'lucideSparkles', positive: true },
  { code: 'RESPECTE_CONSIGNES', label_fr: 'Respecte les consignes', label_darija: 'يحترم التعليمات', icon_name: 'lucideCheckSquare', positive: true },
  { code: 'AUTONOME', label_fr: 'Autonome', label_darija: 'مستقل', icon_name: 'lucideUser', positive: true },
  { code: 'BONNE_CADENCE', label_fr: 'Bonne cadence', label_darija: 'سرعة في العمل', icon_name: 'lucideZap', positive: true },
  { code: 'PREND_SOIN_MATERIEL', label_fr: 'Prend soin du matériel', label_darija: 'يعتني بالمعدات', icon_name: 'lucideShield', positive: true },
  { code: 'RECOMMANDE', label_fr: 'Recommandé', label_darija: 'موصى به', icon_name: 'lucideThumbsUp', positive: true },
  { code: 'RETARDS_FREQUENTS', label_fr: 'Retards fréquents', label_darija: 'تأخير متكرر', icon_name: 'lucideClock', positive: false },
  { code: 'TRAVAIL_BACLE', label_fr: 'Travail bâclé', label_darija: 'عمل غير متقن', icon_name: 'lucideAlertTriangle', positive: false },
  { code: 'MAUVAISE_COMMUNICATION', label_fr: 'Mauvaise communication', label_darija: 'تواصل ضعيف', icon_name: 'lucideMessageX', positive: false },
];

@Injectable()
export class EvaluationBadgeSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EvaluationBadgeSeedService.name);

  constructor(
    @InjectRepository(MissionEvaluationBadge)
    private readonly repo: Repository<MissionEvaluationBadge>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.repo.count();
    if (count > 0) {
      this.logger.log(`Evaluation badges already seeded (${count} entries)`);
      return;
    }
    await this.repo.save(BADGES.map(b => this.repo.create(b)));
    this.logger.log(`Seeded ${BADGES.length} evaluation badges`);
  }
}
