import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('supplier_crm_clients')
@Unique(['supplier_id', 'buyer_id'])
export class SupplierCrmClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User | null;

  @Column({ name: 'buyer_id', type: 'uuid', nullable: true })
  buyer_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  company_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  tax_id: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  governorate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column('text', { array: true, nullable: true })
  tags: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  segment: 'VIP' | 'FIDELE' | 'OCCASIONNEL' | 'INACTIF' | 'NOUVEAU' | null;

  @Column({ type: 'timestamp', nullable: true })
  segment_updated_at: Date | null;

  @Column({ type: 'int', default: 0 })
  total_orders_count: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_spent_tnd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_order_value_tnd: number;

  @Column({ type: 'date', nullable: true })
  first_order_date: Date | null;

  @Column({ type: 'date', nullable: true })
  last_order_date: Date | null;

  @Column({ type: 'int', nullable: true })
  days_since_last_order: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  lifetime_value_score: number;

  @Column({ type: 'boolean', default: false })
  is_archived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
