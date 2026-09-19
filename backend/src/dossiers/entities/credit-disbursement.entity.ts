import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CreditDetails } from './credit-details.entity';
import { User } from '../../users/entities/user.entity';

@Entity('credit_disbursements')
export class CreditDisbursement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creditDetailsId: string;

  @ManyToOne(() => CreditDetails, (c) => c.disbursements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creditDetailsId' })
  creditDetails: CreditDetails;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  amountTnd: number;

  @Column({ type: 'timestamptz' })
  disbursementDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionReference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  recordedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recordedByUserId' })
  recordedByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
