import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

@Entity('financial_transactions')
export class FinancialTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'amount_tnd', type: 'decimal', precision: 12, scale: 3 })
  amount_tnd: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  @Index()
  status: TransactionStatus;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  reference_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  created_at: Date;
}
