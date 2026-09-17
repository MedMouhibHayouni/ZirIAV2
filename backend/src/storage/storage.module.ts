import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageFacility } from './entities/storage-facility.entity';
import { StorageRoom } from './entities/storage-room.entity';
import { StorageReservation } from './entities/storage-reservation.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { StorageCronService } from './storage-cron.service';
import { NotificationModule } from '../notifications/notification.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StorageFacility, StorageRoom, StorageReservation]),
    NotificationModule,
    FinanceModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageCronService],
  exports: [StorageService],
})
export class StorageModule {}
