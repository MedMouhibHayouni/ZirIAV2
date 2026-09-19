import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CrdaCampaign } from './entities/crda-campaign.entity';
import { CrdaCampaignEnrollment } from './entities/crda-campaign-enrollment.entity';
import { CrdaServiceRequest } from './entities/crda-service-request.entity';
import { SubsidyProgram } from './entities/subsidy-program.entity';
import { SubsidyApplication } from './entities/subsidy-application.entity';
import { CrdaService } from './crda.service';
import { CrdaController } from './crda.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CrdaCampaign,
      CrdaCampaignEnrollment,
      CrdaServiceRequest,
      SubsidyProgram,
      SubsidyApplication,
    ]),
  ],
  providers: [CrdaService],
  controllers: [CrdaController],
  exports: [CrdaService],
})
export class CrdaModule {}
