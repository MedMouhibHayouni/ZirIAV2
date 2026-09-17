import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { Equipment } from './entities/equipment.entity';
import { EquipmentReservation } from './entities/equipment-reservation.entity';
import { NotificationModule } from '../notifications/notification.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, EquipmentReservation]),
    NotificationModule,
    ContractsModule,
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
