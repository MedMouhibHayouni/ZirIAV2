import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';

export enum StockMovementType {
  SALE_PLATFORM = 'SALE_PLATFORM',
  SALE_MANUAL = 'SALE_MANUAL',
  PURCHASE_RECEIVED = 'PURCHASE_RECEIVED',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  RETURN = 'RETURN',
}

@Entity('supplier_stock_movements')
export class SupplierStockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'enum', enum: StockMovementType })
  movement_type: StockMovementType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity_change: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity_after: number;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
