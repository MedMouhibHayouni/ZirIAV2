import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity('product_orders')
export class ProductOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  order_batch_id: string | null;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyer_id: string;

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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity_ordered: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  unit_price_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_tnd: number;

  @Column({ type: 'text', nullable: true })
  delivery_address: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'ordered_at' })
  ordered_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
