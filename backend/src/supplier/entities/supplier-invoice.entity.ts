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
import { ProductOrder } from './product-order.entity';

export enum SupplierInvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
}

export enum SupplierInvoiceType {
  PLATFORM_ORDER = 'PLATFORM_ORDER',
  MANUAL = 'MANUAL',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  VIREMENT = 'VIREMENT',
  CREDIT = 'CREDIT',
  AUTRE = 'AUTRE',
}

@Entity('supplier_invoices')
export class SupplierInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  invoice_number: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => ProductOrder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: ProductOrder;

  @Column({ type: 'uuid', nullable: true })
  order_id: string;

  @Column({ type: 'enum', enum: SupplierInvoiceType })
  invoice_type: SupplierInvoiceType;

  @Column({ type: 'varchar', length: 255 })
  client_name: string;

  @Column({ type: 'varchar', nullable: true })
  client_phone: string;

  @Column({ type: 'text', nullable: true })
  client_address: string;

  @Column({ type: 'varchar', nullable: true })
  client_email: string;

  @Column({ type: 'varchar', nullable: true })
  client_tax_id: string;

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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount_tnd: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 19 })
  tax_rate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  tax_amount_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_tnd: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: SupplierInvoiceStatus, default: SupplierInvoiceStatus.DRAFT })
  status: SupplierInvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount_paid_tnd: number;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
