import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { MissionNegotiation } from './mission-negotiation.entity';

export enum RoundStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COUNTERED = 'COUNTERED',
  DECLINED = 'DECLINED',
}

export enum ProposedBy {
  FARMER = 'FARMER',
  WORKER = 'WORKER',
}

@Entity('negotiation_rounds')
export class NegotiationRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'negotiation_id' })
  negotiation_id: string;

  @ManyToOne(() => MissionNegotiation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'negotiation_id' })
  negotiation: MissionNegotiation;

  @Column({ name: 'proposed_by', type: 'varchar', length: 10 })
  proposed_by: string;

  @Column({ name: 'daily_rate_tnd', type: 'decimal', precision: 8, scale: 2 })
  daily_rate_tnd: number;

  @Column({ name: 'start_date', type: 'date' })
  start_date: Date;

  @Column({ name: 'end_date', type: 'date' })
  end_date: Date;

  @Column({ name: 'working_days', type: 'int' })
  working_days: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 3 })
  total_amount: number;

  @Column({ name: 'conditions_text', type: 'varchar', length: 500, nullable: true })
  conditions_text: string | null;

  @Column({ name: 'status', type: 'varchar', length: 15, default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
