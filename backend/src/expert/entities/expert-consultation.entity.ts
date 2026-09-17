import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExpertType } from '../../common/enums/expert-type.enum';

export enum ConsultationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_INFO = 'AWAITING_INFO',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

@Entity('expert_consultations')
export class ExpertConsultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert: User | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expert_id: string | null;

  @Column({ name: 'expert_type', type: 'enum', enum: ExpertType })
  expert_type: ExpertType;

  @Column({ name: 'consultation_type', type: 'varchar' })
  consultation_type: string;

  @Column({ type: 'enum', enum: ConsultationStatus, default: ConsultationStatus.OPEN })
  status: ConsultationStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  expert_response: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  gross_amount_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  net_to_expert_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  platform_commission_tnd: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'integer', nullable: true })
  satisfaction_score: number | null;

  @Column({ name: 'consultation_photo_url', type: 'varchar', length: 500, nullable: true })
  consultation_photo_url: string | null;
}
