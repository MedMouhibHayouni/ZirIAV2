import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialtyReference } from './entities/specialty-reference.entity';

const SPECIALTIES = [
  { code: 'RECOLTE_OLIVES', name_fr: 'Récolte olives', name_darija: 'جني الزيتون', icon_name: 'lucideFlower2', color_token: 'emerald' },
  { code: 'RECOLTE_CEREALES', name_fr: 'Récolte céréales', name_darija: 'جني الحبوب', icon_name: 'lucideWheat', color_token: 'amber' },
  { code: 'TAILLE_ARBRES', name_fr: 'Taille arbres fruitiers', name_darija: 'تشذيب الأشجار', icon_name: 'lucideScissors', color_token: 'teal' },
  { code: 'MARACHAGE_SERRE', name_fr: 'Maraîchage sous serre', name_darija: 'الزراعة تحت البيوت البلاستيكية', icon_name: 'lucideSprout', color_token: 'green' },
  { code: 'IRRIGATION', name_fr: 'Irrigation et entretien réseau', name_darija: 'السقي وصيانة الشبكات', icon_name: 'lucideDroplets', color_token: 'blue' },
  { code: 'CONDUITE_TRACTEUR', name_fr: 'Conduite de tracteur', name_darija: 'سياقة الجرار', icon_name: 'lucideTractor', color_token: 'orange' },
  { code: 'TRAITEMENT_PHYTO', name_fr: 'Traitement phytosanitaire', name_darija: 'المعالجة النباتية', icon_name: 'lucideShieldCheck', color_token: 'purple' },
  { code: 'ELEVAGE', name_fr: 'Élevage et soins animaux', name_darija: 'تربية ورعاية الحيوانات', icon_name: 'lucideCat', color_token: 'rose' },
  { code: 'MACONNERIE_AGRICOLE', name_fr: 'Maçonnerie agricole', name_darija: 'البناء الفلاحي', icon_name: 'lucideHammer', color_token: 'stone' },
  { code: 'AUTRE', name_fr: 'Autre', name_darija: 'آخر', icon_name: 'lucideMoreHorizontal', color_token: 'gray' },
];

@Injectable()
export class SpecialtySeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SpecialtySeedService.name);

  constructor(
    @InjectRepository(SpecialtyReference)
    private readonly repo: Repository<SpecialtyReference>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.repo.count();
    if (count > 0) {
      this.logger.log(`Specialty reference already seeded (${count} entries)`);
      return;
    }
    await this.repo.save(SPECIALTIES.map(s => this.repo.create(s)));
    this.logger.log(`Seeded ${SPECIALTIES.length} specialty references`);
  }
}
