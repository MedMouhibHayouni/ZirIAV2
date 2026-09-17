import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AgentConversation } from './agent-conversation.entity';

export enum MessageRole {
  USER = 'USER',
  AGENT = 'AGENT'
}

@Entity('agent_messages')
export class AgentMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AgentConversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: AgentConversation;

  @Column({ name: 'conversation_id' })
  conversation_id: string;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'audio_url', type: 'varchar', nullable: true })
  audio_url: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
