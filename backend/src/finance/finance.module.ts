import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { MarketInsightsService } from './market-insights.service';
import { CommissionService } from './commission.service';
import { PlatformCommission } from './entities/platform-commission.entity';
import { FinancialRecord } from './entities/financial-record.entity';
import { UserWallet } from './entities/user-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletService } from './wallet.service';
import { FinanceCronService } from './finance-cron.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformCommission, FinancialRecord, UserWallet, WalletTransaction]),
    NotificationModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService, MarketInsightsService, CommissionService, WalletService, FinanceCronService],
  exports: [FinanceService, MarketInsightsService, CommissionService, WalletService],
})
export class FinanceModule {}
