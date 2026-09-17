import { Module } from '@nestjs/common';
import { TransactionCoordinatorService } from './transactions-coordinator.service';
import { FinanceModule } from '../finance/finance.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [FinanceModule, NotificationModule],
  providers: [TransactionCoordinatorService],
  exports: [TransactionCoordinatorService],
})
export class TransactionsModule {}
