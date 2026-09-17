import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { DiseaseDetection } from '../disease-detections/entities/disease-detection.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { FinancialTransaction } from '../finance/entities/financial-transaction.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MarketplaceListing, DiseaseDetection, Equipment, FinancialTransaction]),
    NotificationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
