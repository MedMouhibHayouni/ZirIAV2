import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id' })
  sender_id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({ name: 'receiver_id' })
  receiver_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_read', default: false })
  is_read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
