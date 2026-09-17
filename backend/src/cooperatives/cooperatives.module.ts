import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativesController } from './cooperatives.controller';
import { CooperativesService } from './cooperatives.service';
import { Cooperative } from './entities/cooperative.entity';
import { User } from '../users/entities/user.entity';
import { NotificationModule } from '../notifications/notification.module';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperative, User]), NotificationModule, ParcelsModule],
  controllers: [CooperativesController],
  providers: [CooperativesService],
  exports: [CooperativesService],
})
export class CooperativesModule {}
