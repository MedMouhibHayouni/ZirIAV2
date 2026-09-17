import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AgentIntent } from './agent-intent.entity';

export enum ActionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

@Entity('agent_actions')
export class AgentAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgentIntent)
  @JoinColumn({ name: 'intent_id' })
  intent: AgentIntent;

  @Column({ name: 'intent_id' })
  intent_id: string;

  @Column({ name: 'action_type', type: 'varchar' })
  action_type: string;

  @Column({ name: 'erp_reference_id', type: 'varchar', nullable: true })
  erp_reference_id: string;

  @Column({ type: 'enum', enum: ActionStatus, default: ActionStatus.PENDING })
  status: ActionStatus;

  @Column({ name: 'error_details', type: 'text', nullable: true })
  error_details: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
