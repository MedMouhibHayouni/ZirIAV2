import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CreditDetails } from './credit-details.entity';
import { User } from '../../users/entities/user.entity';

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID_DECLARED = 'PAID_DECLARED',
  PAID_CONFIRMED = 'PAID_CONFIRMED',
  LATE = 'LATE',
  RESCHEDULED = 'RESCHEDULED',
}

@Entity('repayment_installments')
export class RepaymentInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creditDetailsId: string;

  @ManyToOne(() => CreditDetails, (c) => c.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creditDetailsId' })
  creditDetails: CreditDetails;

  @Column({ type: 'integer' })
  installmentNumber: number;

  @Column({ type: 'timestamptz' })
  dueDate: Date;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  amountTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0.000 })
  principalTnd: number;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0.000 })
  interestTnd: number;

  @Column({ type: 'varchar', length: 50, default: InstallmentStatus.PENDING })
  status: InstallmentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  declaredPaidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  paymentProofUrl: string | null;

  @Column({ type: 'text', nullable: true })
  farmerDeclarationNote: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedPaidAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  confirmedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'confirmedByUserId' })
  confirmedByUser: User | null;

  @Column({ type: 'text', nullable: true })
  reschedulingProposalNote: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rescheduledNewDueDate: Date | null;

  @Column({ type: 'boolean', default: false })
  lateReminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
