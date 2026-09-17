import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FeatureType {
  ANNUAL_REPORT = 'ANNUAL_REPORT',
  EXPERT_CONSULTATION = 'EXPERT_CONSULTATION',
  LAND_VALUATION = 'LAND_VALUATION',
  LISTING_BOOST = 'LISTING_BOOST',
  TRANSACTION_EXPORT = 'TRANSACTION_EXPORT',
}

@Entity('feature_purchases')
export class FeaturePurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: FeatureType,
  })
  feature_type: FeatureType;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  price_tnd: number;

  @CreateDateColumn()
  purchased_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;
}
