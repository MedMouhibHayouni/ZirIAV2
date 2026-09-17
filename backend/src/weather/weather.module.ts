import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { GddCronService } from './gdd.cron.service';
import { Parcel } from '../parcels/entities/parcel.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Parcel, MarketplaceListing]),
    NotificationModule,
  ],
  controllers: [WeatherController],
  providers: [WeatherService, GddCronService],
  exports: [WeatherService, GddCronService],
})
export class WeatherModule {}

