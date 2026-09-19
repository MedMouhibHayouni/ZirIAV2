import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { CrdaCampaignEnrollment } from './crda-campaign-enrollment.entity';

export enum CampaignType {
  VACCINATION = 'VACCINATION',
  PHYTOSANITARY_TREATMENT = 'PHYTOSANITARY_TREATMENT',
  SOWING_DECLARATION = 'SOWING_DECLARATION',
  HARVEST_DECLARATION = 'HARVEST_DECLARATION',
  WATER_MANAGEMENT = 'WATER_MANAGEMENT',
}

export enum CampaignStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('crda_campaigns')
export class CrdaCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  institutionId: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 50, default: CampaignType.PHYTOSANITARY_TREATMENT })
  type: CampaignType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100 })
  targetCropOrLivestock: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text', array: true, default: '{}' })
  targetDelegations: string[];

  @Column({ type: 'varchar', length: 50, default: CampaignStatus.PLANNED })
  status: CampaignStatus;

  @Column({ type: 'integer', default: 0 })
  targetParticipantsCount: number;

  @OneToMany(() => CrdaCampaignEnrollment, (e) => e.campaign, { cascade: true })
  enrollments: CrdaCampaignEnrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
