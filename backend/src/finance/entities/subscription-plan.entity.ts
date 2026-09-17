import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Check } from 'typeorm';

@Entity('subscription_plans')
@Check(`"price_monthly_tnd" >= 0`)
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ name: 'price_monthly_tnd', type: 'decimal', precision: 10, scale: 3 })
  price_monthly_tnd: number;

  @Column({ name: 'features_jsonb', type: 'jsonb' })
  features_jsonb: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
