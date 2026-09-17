import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { MissionContract } from './mission-contract.entity';
import { DisputeReasonType } from './contract-enums';

@Entity('dispute_records')
@Index(['contract_id'])
export class DisputeRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MissionContract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: MissionContract;

  @Column({ name: 'contract_id', type: 'uuid' })
  contract_id: string;

  @Column({ name: 'opened_by_id', type: 'uuid' })
  opened_by_id: string;

  @Column({ name: 'reason_type', type: 'enum', enum: DisputeReasonType })
  reason_type: DisputeReasonType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'photo_urls', type: 'simple-array', nullable: true })
  photo_urls: string[] | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolved_by_id: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
