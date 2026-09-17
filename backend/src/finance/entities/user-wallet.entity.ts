import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_wallets')
export class UserWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  user_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  balance_available_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  balance_pending_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  total_earned_all_time_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  total_platform_commission_deducted_tnd: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
