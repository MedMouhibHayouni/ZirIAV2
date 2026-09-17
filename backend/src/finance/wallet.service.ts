import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletTransactionType } from './entities/wallet-transaction-type.enum';
import { NotificationGateway } from '../notifications/notification.gateway';
import { MissionContract } from '../contracts/entities/mission-contract.entity';
import { ContractStatus } from '../contracts/entities/contract-status.enum';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationGateway: NotificationGateway,
    @InjectRepository(UserWallet) private readonly walletRepo: Repository<UserWallet>,
    @InjectRepository(WalletTransaction) private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  async getOrCreateWallet(userId: string, manager?: EntityManager): Promise<UserWallet> {
    const mgr = manager || this.dataSource.manager;
    let wallet = await mgr.findOne(UserWallet, { where: { user_id: userId } });
    if (!wallet) {
      try {
        wallet = mgr.create(UserWallet, {
          user_id: userId,
          balance_available_tnd: 0,
          balance_pending_tnd: 0,
          total_earned_all_time_tnd: 0,
          total_platform_commission_deducted_tnd: 0,
        });
        wallet = await mgr.save(UserWallet, wallet);
      } catch (err) {
        wallet = await mgr.findOne(UserWallet, { where: { user_id: userId } });
        if (!wallet) throw err;
      }
    }
    return wallet;
  }

  async creditPending(
    userId: string,
    grossAmount: number,
    commissionRate: number,
    referenceId: string,
    referenceType: string,
    description: string,
    manager: EntityManager
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(userId, manager);
    const commission = grossAmount * commissionRate;
    const netAmount = grossAmount - commission;

    wallet.balance_pending_tnd = Number(wallet.balance_pending_tnd) + netAmount;
    await manager.save(UserWallet, wallet);

    const txType = referenceType === 'EXPERT_CONSULTATION' 
      ? WalletTransactionType.CONSULTATION_PENDING 
      : WalletTransactionType.MISSION_PENDING;

    const tx = manager.create(WalletTransaction, {
      wallet_id: wallet.id,
      transaction_type: txType,
      amount_tnd: netAmount,
      balance_after_tnd: wallet.balance_available_tnd,
      reference_id: referenceId,
      reference_type: referenceType,
      description,
      gross_amount_tnd: grossAmount,
      commission_amount_tnd: commission,
    });
    await manager.save(WalletTransaction, tx);
  }

  async releaseToAvailable(
    userId: string,
    referenceId: string,
    manager: EntityManager
  ): Promise<void> {
    const wallet = await manager.findOne(UserWallet, { where: { user_id: userId }, lock: { mode: 'pessimistic_write' } });
    if (!wallet) return;

    // Check if contract is disputed before releasing
    const disputedContract = await manager.findOne(MissionContract, {
      where: { reference_id: referenceId, status: ContractStatus.DISPUTED }
    });
    if (disputedContract) {
      this.logger.warn(`[Wallet] Freezing release for reference ${referenceId} due to DISPUTED status`);
      throw new BadRequestException('Fonds gelés : ce contrat fait l\'objet d\'un litige actif.');
    }

    const pendingTx = await manager.findOne(WalletTransaction, {
      where: [
        { wallet_id: wallet.id, reference_id: referenceId, transaction_type: WalletTransactionType.MISSION_PENDING },
        { wallet_id: wallet.id, reference_id: referenceId, transaction_type: WalletTransactionType.CONSULTATION_PENDING }
      ]
    });

    if (!pendingTx) return;

    const netAmount = Number(pendingTx.amount_tnd);
    const grossAmount = Number(pendingTx.gross_amount_tnd);
    const commission = Number(pendingTx.commission_amount_tnd);

    wallet.balance_pending_tnd = Math.max(0, Number(wallet.balance_pending_tnd) - netAmount);
    wallet.balance_available_tnd = Number(wallet.balance_available_tnd) + netAmount;
    wallet.total_earned_all_time_tnd = Number(wallet.total_earned_all_time_tnd) + grossAmount;
    wallet.total_platform_commission_deducted_tnd = Number(wallet.total_platform_commission_deducted_tnd) + commission;
    await manager.save(UserWallet, wallet);

    const releaseType = pendingTx.transaction_type === WalletTransactionType.CONSULTATION_PENDING
      ? WalletTransactionType.CONSULTATION_RELEASED
      : WalletTransactionType.RELEASED;

    const tx = manager.create(WalletTransaction, {
      wallet_id: wallet.id,
      transaction_type: releaseType,
      amount_tnd: netAmount,
      balance_after_tnd: wallet.balance_available_tnd,
      reference_id: referenceId,
      reference_type: pendingTx.reference_type,
      description: `Libération de fonds pour référence ${referenceId}`,
      gross_amount_tnd: grossAmount,
      commission_amount_tnd: commission,
    });
    await manager.save(WalletTransaction, tx);

    this.notificationGateway.sendToUser(userId, 'wallet_balance_updated', {
      balance_available_tnd: wallet.balance_available_tnd,
      balance_pending_tnd: wallet.balance_pending_tnd,
    });
  }

  async creditAmbassador(
    ambassadorId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    description: string,
    manager: EntityManager
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(ambassadorId, manager);
    wallet.balance_available_tnd = Number(wallet.balance_available_tnd) + amount;
    wallet.total_earned_all_time_tnd = Number(wallet.total_earned_all_time_tnd) + amount;
    await manager.save(UserWallet, wallet);

    const tx = manager.create(WalletTransaction, {
      wallet_id: wallet.id,
      transaction_type: WalletTransactionType.AMBASSADOR_COMMISSION,
      amount_tnd: amount,
      balance_after_tnd: wallet.balance_available_tnd,
      reference_id: referenceId,
      reference_type: referenceType,
      description,
      gross_amount_tnd: amount,
      commission_amount_tnd: 0,
    });
    await manager.save(WalletTransaction, tx);

    this.notificationGateway.sendToUser(ambassadorId, 'wallet_balance_updated', {
      balance_available_tnd: wallet.balance_available_tnd,
      balance_pending_tnd: wallet.balance_pending_tnd,
    });
  }

  async getWalletSummary(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const txs = await this.txRepo.find({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
      take: 20,
    });
    return {
      balance_available_tnd: wallet.balance_available_tnd,
      balance_pending_tnd: wallet.balance_pending_tnd,
      total_earned_all_time_tnd: wallet.total_earned_all_time_tnd,
      total_platform_commission_deducted_tnd: wallet.total_platform_commission_deducted_tnd,
      transactions: txs,
    };
  }
}
