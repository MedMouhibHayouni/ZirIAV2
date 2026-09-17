import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ConversationLanguage {
  DARIJA = 'DARIJA',
  ARABIC = 'ARABIC',
  FRENCH = 'FRENCH'
}

@Entity('agent_conversations')
export class AgentConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'varchar', unique: true })
  session_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ type: 'enum', enum: ConversationLanguage, default: ConversationLanguage.DARIJA })
  language: ConversationLanguage;

  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
