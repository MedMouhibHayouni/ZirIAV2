import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('prescription_purchases')
export class PrescriptionPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prescription_id', type: 'uuid' })
  prescription_id: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmer_id: string;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplier_id: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 3, nullable: true })
  unit_price: number;

  @Column({ name: 'commission_percentage', type: 'numeric', precision: 5, scale: 2, nullable: true })
  commission_percentage: number;

  @Column({ name: 'commission_amount', type: 'numeric', precision: 12, scale: 3, nullable: true })
  commission_amount: number;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
