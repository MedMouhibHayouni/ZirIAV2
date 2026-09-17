import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverProfile } from './entities/driver-profile.entity';
import { TransportRequest } from './entities/transport-request.entity';
import { GpsTrackingEvent } from './entities/gps-tracking-event.entity';
import { DriverLocationUpdate } from './entities/driver-location-update.entity';
import { MissionContract } from '../contracts/entities/mission-contract.entity';
import { GpsTrackingGateway } from './gps-tracking.gateway';
import { NotificationModule } from '../notifications/notification.module';
import { FinanceModule } from '../finance/finance.module';
import { ContractsModule } from '../contracts/contracts.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverProfile, TransportRequest, GpsTrackingEvent, DriverLocationUpdate, MissionContract]),
    NotificationModule,
    FinanceModule,
    ContractsModule,
    JwtModule.register({}),
  ],
  controllers: [DriversController],
  providers: [DriversService, GpsTrackingGateway],
  exports: [DriversService, GpsTrackingGateway],
})
export class DriversModule {}

