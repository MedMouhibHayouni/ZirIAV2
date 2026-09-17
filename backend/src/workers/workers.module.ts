import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { FinanceModule } from '../finance/finance.module';
import { WorkerProfile } from './entities/worker-profile.entity';
import { JobOffer } from './entities/job-offer.entity';
import { JobApplication } from './entities/job-application.entity';
import { WorkerCertification } from './entities/worker-certification.entity';
import { WorkerEarnings } from './entities/worker-earnings.entity';
import { SpecialtyReference } from './entities/specialty-reference.entity';
import { WorkerSpecialtyStats } from './entities/worker-specialty-stats.entity';
import { MissionContract } from '../contracts/entities/mission-contract.entity';
import { NotificationModule } from '../notifications/notification.module';
import { ContractsModule } from '../contracts/contracts.module';
import { SpecialtySeedService } from './specialty-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerProfile,
      JobOffer,
      JobApplication,
      WorkerCertification,
      WorkerEarnings,
      SpecialtyReference,
      WorkerSpecialtyStats,
      MissionContract,
    ]),
    NotificationModule,
    FinanceModule,
    ContractsModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService, SpecialtySeedService],
  exports: [WorkersService],
})
export class WorkersModule {}
