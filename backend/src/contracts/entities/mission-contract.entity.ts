import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  BeforeUpdate, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { ContractType } from './contract-type.enum';
import { ContractStatus } from './contract-status.enum';
import { CancelledBy } from './contract-enums';

@Entity('mission_contracts')
@Index(['reference_id', 'contract_type'], { unique: true })
@Index(['farmer_id'])
@Index(['provider_id'])
export class MissionContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contract_type: ContractType | null;

  @Column({ type: 'varchar', length: 50, default: 'DRAFT' })
  status: ContractStatus;

  @Column({ type: 'uuid' })
  @Index()
  reference_id: string;

  @Column({ type: 'uuid' })
  initiator_id: string;

  @Column({ type: 'uuid' })
  counterparty_id: string;

  @Column({ name: 'farmer_id', type: 'uuid', nullable: true })
  farmer_id: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  provider_id: string | null;

  @Column({ name: 'parcel_id', type: 'uuid', nullable: true })
  parcel_id: string | null;

  @Column({ name: 'proposed_amount_tnd', type: 'decimal', precision: 12, scale: 3, nullable: true })
  proposed_amount_tnd: number | null;

  @Column({ name: 'final_amount_tnd', type: 'decimal', precision: 12, scale: 3, nullable: true })
  final_amount_tnd: number | null;

  @Column({ name: 'platform_commission_tnd', type: 'decimal', precision: 12, scale: 3, nullable: true })
  platform_commission_tnd: number | null;

  @Column({ name: 'net_to_provider_tnd', type: 'decimal', precision: 12, scale: 3, nullable: true })
  net_to_provider_tnd: number | null;

  @Column({ type: 'jsonb' })
  terms_snapshot: Record<string, any>;

  @Column({ name: 'navigation_deep_link', type: 'varchar', nullable: true })
  navigation_deep_link: string | null;

  @Column({ name: 'total_amount_tnd', type: 'decimal', precision: 12, scale: 3, default: 0 })
  total_amount_tnd: number;

  @Column({ name: 'commission_amount_tnd', type: 'decimal', precision: 12, scale: 3, default: 0 })
  commission_amount_tnd: number;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  start_date: Date | null;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  end_date: Date | null;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  duration_days: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'provider_notes', type: 'text', nullable: true })
  provider_notes: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellation_reason: string | null;

  @Column({ name: 'cancelled_by', type: 'enum', enum: CancelledBy, nullable: true })
  cancelled_by: CancelledBy | null;

  @Column({ name: 'dispute_reason', type: 'text', nullable: true })
  dispute_reason: string | null;

  @Column({ name: 'dispute_opened_at', type: 'timestamptz', nullable: true })
  dispute_opened_at: Date | null;

  @Column({ name: 'disputed_at', type: 'timestamptz', nullable: true })
  disputed_at: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  accepted_at: Date | null;

  @Column({ name: 'farmer_rated_provider', type: 'int', nullable: true })
  farmer_rated_provider: number | null;

  @Column({ name: 'provider_rated_farmer', type: 'int', nullable: true })
  provider_rated_farmer: number | null;

  @Column({ name: 'farmer_rating_comment', type: 'text', nullable: true })
  farmer_rating_comment: string | null;

  @Column({ name: 'provider_rating_comment', type: 'text', nullable: true })
  provider_rating_comment: string | null;

  // ─── Workplace Evaluation Fields ───

  @Column({ name: 'employer_rating', type: 'int', nullable: true })
  employer_rating: number | null;

  @Column({ name: 'employer_rating_badges', type: 'jsonb', nullable: true })
  employer_rating_badges: string[] | null;

  @Column({ name: 'employer_comment', type: 'varchar', length: 300, nullable: true })
  employer_comment: string | null;

  @Column({ name: 'worker_reply', type: 'varchar', length: 200, nullable: true })
  worker_reply: string | null;

  @Column({ name: 'employer_rating_submitted_at', type: 'timestamptz', nullable: true })
  employer_rating_submitted_at: Date | null;

  @Column({ name: 'worker_visible', default: true })
  worker_visible: boolean;

  @Column({ name: 'daily_rate_agreed', type: 'decimal', precision: 8, scale: 2, nullable: true })
  daily_rate_agreed: number | null;

  @Column({ name: 'total_days', type: 'int', nullable: true })
  total_days: number | null;

  @Column({ name: 'total_amount_agreed', type: 'decimal', precision: 12, scale: 3, nullable: true })
  total_amount_agreed: number | null;

  @Column({ name: 'conditions_text', type: 'varchar', length: 500, nullable: true })
  conditions_text: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, nullable: true })
  payment_method: string | null;

  @Column({ name: 'specialty_code', type: 'varchar', length: 50, nullable: true })
  specialty_code: string | null;

  @Column({ name: 'worker_marked_complete', default: false })
  worker_marked_complete: boolean;

  @Column({ name: 'worker_marked_complete_at', type: 'timestamptz', nullable: true })
  worker_marked_complete_at: Date | null;

  @Column({ type: 'jsonb', default: '[]' })
  audit_log: Array<{ at: string; action: string; by: string; diff?: Record<string, any> }>;

  @Column({ type: 'jsonb', default: '[]' })
  status_history: Array<{ status: string; changed_by_id: string; changed_at: string; note: string }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
