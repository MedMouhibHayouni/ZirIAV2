import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PurchaseOrderStatus {
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('supplier_purchase_orders')
export class SupplierPurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @Column({ type: 'varchar' })
  vendor_name: string;

  @Column({ type: 'varchar', nullable: true })
  vendor_phone: string;

  @Column({ type: 'text', nullable: true })
  vendor_address: string;

  @Column({ type: 'varchar', nullable: true })
  reference_number: string;

  @Column({ type: 'jsonb' })
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  tax_amount_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_tnd: number;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.ORDERED })
  status: PurchaseOrderStatus;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  received_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
