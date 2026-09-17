import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ProductCategory {
  SEED = 'SEED',
  FERTILIZER = 'FERTILIZER',
  PESTICIDE = 'PESTICIDE',
  FUNGICIDE = 'FUNGICIDE',
  HERBICIDE = 'HERBICIDE',
  TOOL = 'TOOL',
  OTHER = 'OTHER',
}

@Entity('products')
@Index(['supplier_id', 'category'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplier_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price_tnd: number;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  stock_qty: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_stock_alert_qty: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  governorate_target: string | null;

  @Column({ type: 'varchar', nullable: true })
  photo_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
