import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { WalletService } from './wallet.service';

@Injectable()
export class FinanceCronService {
  private readonly logger = new Logger(FinanceCronService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoReleasePendingFunds() {
    this.logger.log('Starting hourly auto-release of pending funds...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const pendingTxs = await queryRunner.query(`
        SELECT tx.*, w.user_id 
        FROM wallet_transactions tx
        JOIN user_wallets w ON w.id = tx.wallet_id
        WHERE tx.transaction_type IN ('MISSION_PENDING', 'CONSULTATION_PENDING')
          AND tx.created_at < NOW() - INTERVAL '48 hours'
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions rx
            WHERE rx.wallet_id = tx.wallet_id
              AND rx.reference_id = tx.reference_id
              AND rx.transaction_type IN ('RELEASED', 'CONSULTATION_RELEASED')
          )
      `);

      this.logger.log(`Found ${pendingTxs.length} pending transactions to auto-release.`);

      for (const tx of pendingTxs) {
        await queryRunner.startTransaction();
        try {
          await this.walletService.releaseToAvailable(tx.user_id, tx.reference_id, queryRunner.manager);
          await queryRunner.commitTransaction();
          this.logger.log(`[INFO] Auto-released funds for user ${tx.user_id}, reference ${tx.reference_id}`);
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed to auto-release funds for transaction ${tx.id}`, err.stack);
        }
      }
    } catch (err) {
      this.logger.error('Error during auto-release cron execution', err.stack);
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyRevenue() {
    this.logger.log('Starting daily financial aggregation...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let volume = 0;
      let commission = 0;
      try {
        const result = await queryRunner.query(`
          SELECT 
            COALESCE(SUM(amount_tnd), 0) as total_volume,
            COUNT(*) as transaction_count
          FROM financial_transactions 
          WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' AND status = 'COMPLETED'
        `);
        volume = parseFloat(result[0].total_volume);
        commission = volume * 0.05;
      } catch (e) {}

      let subRevenue = 0;
      try {
        const subResult = await queryRunner.query(`
          SELECT COALESCE(SUM(price_tnd), 0) as total_subs
          FROM user_subscriptions us
          JOIN subscription_plans sp ON us.plan_id = sp.id
          WHERE DATE(us.created_at) = CURRENT_DATE - INTERVAL '1 day'
        `);
        subRevenue = parseFloat(subResult[0].total_subs);
      } catch (e) {}

      const totalDailyRevenue = commission + subRevenue;

      await queryRunner.query(`
        INSERT INTO platform_revenue_daily (date, total_revenue_tnd, subscriptions_tnd, commissions_tnd)
        VALUES (CURRENT_DATE - INTERVAL '1 day', $1, $2, $3)
        ON CONFLICT (date) DO UPDATE SET 
          total_revenue_tnd = EXCLUDED.total_revenue_tnd,
          subscriptions_tnd = EXCLUDED.subscriptions_tnd,
          commissions_tnd = EXCLUDED.commissions_tnd
      `, [totalDailyRevenue, subRevenue, commission]);

      await queryRunner.commitTransaction();
      this.logger.log(`Daily aggregation completed. Total revenue: ${totalDailyRevenue} TND`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to aggregate daily revenue', error.stack);
    } finally {
      await queryRunner.release();
    }
  }
}
