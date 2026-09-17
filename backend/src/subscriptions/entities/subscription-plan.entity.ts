import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SubscriptionPlanCode {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlanCode,
    unique: true,
  })
  code: SubscriptionPlanCode;

  @Column({ type: 'varchar', length: 100 })
  name_fr: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  price_tnd: number;

  @Column({ type: 'int', default: 3 })
  max_active_listings: number; // -1 for unlimited

  @Column({ type: 'int', default: 1 })
  max_parcels: number; // -1 for unlimited

  @Column({ type: 'int', default: 5 })
  diagnostics_per_month: number; // -1 for unlimited

  @Column({ type: 'boolean', default: false })
  has_crm: boolean;

  @Column({ type: 'boolean', default: false })
  has_financial_dashboard: boolean;

  @Column({ type: 'boolean', default: false })
  has_gdd_detailed: boolean;

  @Column({ type: 'boolean', default: false })
  has_api_access: boolean;

  @Column({ type: 'boolean', default: false })
  has_group_orders: boolean;

  @CreateDateColumn()
  created_at: Date;
}
