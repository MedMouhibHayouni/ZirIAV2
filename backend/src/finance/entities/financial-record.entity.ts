import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Type de flux financier */
export enum RecordType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

/** Catégorie du flux financier */
export enum RecordCategory {
  SALE = 'SALE',
  COMMISSION = 'COMMISSION',
  TRANSPORT_FEE = 'TRANSPORT_FEE',
  LABOR_COST = 'LABOR_COST',
  EQUIPMENT_RENTAL = 'EQUIPMENT_RENTAL',
  LAND_REVENUE = 'LAND_REVENUE',
  EXPERT_CONSULTATION = 'EXPERT_CONSULTATION',
  REFERRAL_COMMISSION = 'REFERRAL_COMMISSION',
  OTHER = 'OTHER',
}

/**
 * Enregistrement financier individuel par utilisateur.
 * Constitue le grand livre financier de chaque acteur de la plateforme.
 * Utilisé pour le dossier de crédit SMSA et les analyses ADMIN.
 * Journal immuable — pas de modification possible après création.
 */
@Entity('financial_records')
export class FinancialRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({
    name: 'record_type',
    type: 'enum',
    enum: RecordType,
  })
  record_type: RecordType;

  @Column({
    type: 'enum',
    enum: RecordCategory,
    default: RecordCategory.OTHER,
  })
  category: RecordCategory;

  /** Montant en TND */
  @Column({ name: 'amount_tnd', type: 'decimal', precision: 10, scale: 3 })
  amount_tnd: number;

  /** Description libre de la transaction */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** UUID de la transaction source pour traçabilité */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  reference_id: string | null;

  /** Mois de référence (pour l'agrégation mensuelle) — format YYYY-MM */
  @Column({ name: 'month_ref', type: 'varchar', nullable: true })
  month_ref: string | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recorded_at: Date;
}
