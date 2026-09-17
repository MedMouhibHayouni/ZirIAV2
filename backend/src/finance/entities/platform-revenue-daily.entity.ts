import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Check } from 'typeorm';

@Entity('platform_revenue_daily')
@Check(`"total_revenue_tnd" >= 0`)
export class PlatformRevenueDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'date', type: 'date' })
  @Index({ unique: true })
  date: Date;

  @Column({ name: 'total_revenue_tnd', type: 'decimal', precision: 14, scale: 3, default: 0 })
  total_revenue_tnd: number;

  @Column({ name: 'subscriptions_tnd', type: 'decimal', precision: 14, scale: 3, default: 0 })
  subscriptions_tnd: number;

  @Column({ name: 'commissions_tnd', type: 'decimal', precision: 14, scale: 3, default: 0 })
  commissions_tnd: number;

  @Column({ name: 'revenue_sources_jsonb', type: 'jsonb', nullable: true })
  revenue_sources_jsonb: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
