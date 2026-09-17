import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SupplierSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('supplier_subscriptions')
export class SupplierSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @Column({ type: 'varchar' })
  plan_code: string;

  @Column({ type: 'enum', enum: SupplierSubscriptionStatus, default: SupplierSubscriptionStatus.ACTIVE })
  status: SupplierSubscriptionStatus;

  @CreateDateColumn({ name: 'started_at' })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;
}
