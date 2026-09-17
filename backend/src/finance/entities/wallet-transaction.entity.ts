import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserWallet } from './user-wallet.entity';
import { WalletTransactionType } from './wallet-transaction-type.enum';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: UserWallet;

  @Column({ name: 'wallet_id', type: 'uuid' })
  wallet_id: string;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: WalletTransactionType,
  })
  transaction_type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  amount_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  balance_after_tnd: number;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  reference_type: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  gross_amount_tnd: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  commission_amount_tnd: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
