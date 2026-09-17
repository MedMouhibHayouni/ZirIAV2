import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { WorkerProfile } from '../workers/entities/worker-profile.entity';
import { JobApplication } from '../workers/entities/job-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, WorkerProfile, JobApplication])],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
