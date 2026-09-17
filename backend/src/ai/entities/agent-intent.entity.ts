import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AgentConversation } from './agent-conversation.entity';

@Entity('agent_intents')
export class AgentIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgentConversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: AgentConversation;

  @Column({ name: 'conversation_id', nullable: true })
  conversation_id: string;

  @Column({ name: 'intent_type', type: 'varchar', nullable: true })
  intent_type: string; // SELL, BUY, RENT, HIRE, DIAGNOSE, INFO

  @Column({ name: 'status', type: 'varchar', default: 'COLLECTING', nullable: true })
  status: string; // COLLECTING, COMPLETE, EXECUTED

  @Column({ name: 'collected_data', type: 'jsonb', default: {}, nullable: true })
  collected_data: Record<string, any>;

  @Column({ name: 'missing_fields', type: 'jsonb', default: [], nullable: true })
  missing_fields: string[];

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidence: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
