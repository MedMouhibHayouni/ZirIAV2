import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('expert_messages')
@Index('idx_expert_messages_sender_receiver', ['sender_id', 'receiver_id'])
@Index('idx_expert_messages_receiver_sender', ['receiver_id', 'sender_id'])
export class ExpertMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sender_id: string;

  @Column({ type: 'uuid' })
  receiver_id: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  read_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;
}
