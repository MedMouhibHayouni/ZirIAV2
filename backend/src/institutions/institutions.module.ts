import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity';
import { InstitutionMember } from './entities/institution-member.entity';
import { ProjectCall } from './entities/project-call.entity';
import { InstitutionAppointment } from './entities/institution-appointment.entity';
import { User } from '../users/entities/user.entity';
import { InstitutionsService } from './institutions.service';
import { InstitutionsController } from './institutions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, InstitutionMember, ProjectCall, InstitutionAppointment, User]),
  ],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
