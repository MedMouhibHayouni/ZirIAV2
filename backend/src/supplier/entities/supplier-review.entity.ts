import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('supplier_reviews')
@Unique(['supplier_id', 'reviewer_id'])
export class SupplierReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ type: 'uuid' })
  reviewer_id: string;

  @Column({ type: 'int' })
  rating: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'boolean', default: false })
  is_verified_purchase: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
