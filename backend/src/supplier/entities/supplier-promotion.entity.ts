import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';

@Entity('supplier_promotions')
export class SupplierPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  discount_pct: number;

  @Column({ type: 'timestamp' })
  valid_from: Date;

  @Column({ type: 'timestamp' })
  valid_until: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  governorate_target: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
