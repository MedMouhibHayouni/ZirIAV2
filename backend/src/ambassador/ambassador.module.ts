import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmbassadorController } from './ambassador.controller';
import { AmbassadorService } from './ambassador.service';
import { User } from '../users/entities/user.entity';
import { Zone } from './entities/zone.entity';
import { FieldReport } from './entities/field-report.entity';
import { AmbassadorValidation } from '../workers/entities/ambassador-validation.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Zone, FieldReport, AmbassadorValidation]),
    NotificationModule,
  ],
  controllers: [AmbassadorController],
  providers: [AmbassadorService],
  exports: [AmbassadorService],
})
export class AmbassadorModule {}
