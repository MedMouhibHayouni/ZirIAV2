import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { Parcel } from './entities/parcel.entity';
import { CropZone } from './entities/crop-zone.entity';
import { SubscriptionModule } from '../subscriptions/subscription.module';

@Module({
  imports: [TypeOrmModule.forFeature([Parcel, CropZone]), SubscriptionModule],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
