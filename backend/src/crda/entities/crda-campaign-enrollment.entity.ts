import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CrdaCampaign } from './crda-campaign.entity';
import { User } from '../../users/entities/user.entity';

export enum EnrollmentStatus {
  OPTED_IN = 'OPTED_IN',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
}

@Entity('crda_campaign_enrollments')
export class CrdaCampaignEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => CrdaCampaign, (c) => c.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign: CrdaCampaign;

  @Column({ type: 'uuid' })
  farmerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column({ type: 'varchar', length: 50, default: EnrollmentStatus.OPTED_IN })
  status: EnrollmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  completionProofUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
