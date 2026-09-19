import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { InstitutionDossier } from './dossier.entity';
import { CreditDisbursement } from './credit-disbursement.entity';
import { RepaymentInstallment } from './repayment-installment.entity';

export enum CreditStatus {
  PREPARATION = 'PREPARATION',
  SUBMITTED_TO_BANK = 'SUBMITTED_TO_BANK',
  BANK_APPROVED = 'BANK_APPROVED',
  BANK_REJECTED = 'BANK_REJECTED',
  DISBURSED = 'DISBURSED',
  REPAYMENT = 'REPAYMENT',
  CLOSED = 'CLOSED',
  DEFAULTED = 'DEFAULTED',
}

@Entity('credit_details')
export class CreditDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dossierId: string;

  @OneToOne(() => InstitutionDossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossierId' })
  dossier: InstitutionDossier;

  @Column({ type: 'varchar', length: 150 })
  financingInstitution: string; // e.g. BNA, BFPME, BTS, etc.

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  requestedAmountTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, nullable: true })
  approvedAmountTnd: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  interestRatePct: number;

  @Column({ type: 'integer', default: 12 })
  durationMonths: number;

  @Column({ type: 'text', nullable: true })
  guaranteesDescription: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankContactName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankContactPhone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  bankContactEmail: string | null;

  @Column({ type: 'text', nullable: true })
  bankDecisionLetterUrl: string | null;

  @Column({ type: 'varchar', length: 50, default: CreditStatus.PREPARATION })
  status: CreditStatus;

  @OneToMany(() => CreditDisbursement, (d) => d.creditDetails, { cascade: true })
  disbursements: CreditDisbursement[];

  @OneToMany(() => RepaymentInstallment, (i) => i.creditDetails, { cascade: true })
  installments: RepaymentInstallment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
