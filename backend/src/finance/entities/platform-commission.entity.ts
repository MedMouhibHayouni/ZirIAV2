import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/** Type de transaction générant une commission plateforme */
export enum CommissionTransactionType {
  MARKETPLACE_SALE = 'MARKETPLACE_SALE',
  TRANSPORT = 'TRANSPORT',
  LAND_RENT = 'LAND_RENT',
  LAND_SALE = 'LAND_SALE',
  JOB_PLACEMENT = 'JOB_PLACEMENT',
  EQUIPMENT_RENTAL = 'EQUIPMENT_RENTAL',
  EXPERT_CONSULTATION = 'EXPERT_CONSULTATION',
  REFERRAL_COMMISSION = 'REFERRAL_COMMISSION',
}

/**
 * Commission perçue par la plateforme ZirIA sur chaque transaction économique.
 * Journal immuable (pas de UpdateDateColumn) — les commissions ne sont pas modifiables.
 * Consultable par l'ADMIN via GET /finance/commissions.
 */
@Entity('platform_commissions')
export class PlatformCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: CommissionTransactionType,
  })
  transaction_type: CommissionTransactionType;

  /** UUID de la transaction source (marketplace_listing, transport_request, etc.) */
  @Column({ name: 'reference_id' })
  reference_id: string;

  /** Montant de la commission perçue en TND */
  @Column({ name: 'amount_tnd', type: 'decimal', precision: 10, scale: 3 })
  amount_tnd: number;

  /** Taux de commission appliqué (ex: 2.5 = 2.5%) */
  @Column({ name: 'rate_pct', type: 'decimal', precision: 5, scale: 2 })
  rate_pct: number;

  /** Valeur totale de la transaction sur laquelle la commission est calculée */
  @Column({ name: 'transaction_value_tnd', type: 'decimal', precision: 10, scale: 3, nullable: true })
  transaction_value_tnd: number | null;

  @CreateDateColumn({ name: 'collected_at' })
  collected_at: Date;
}
