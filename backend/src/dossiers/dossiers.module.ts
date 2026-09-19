import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionDossier } from './entities/dossier.entity';
import { DossierDocument } from './entities/dossier-document.entity';
import { DossierStatusHistory } from './entities/dossier-status-history.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { CreditDetails } from './entities/credit-details.entity';
import { CreditDisbursement } from './entities/credit-disbursement.entity';
import { RepaymentInstallment } from './entities/repayment-installment.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { FieldVisit } from './entities/field-visit.entity';
import { User } from '../users/entities/user.entity';
import { DossiersService } from './dossiers.service';
import { DossiersController } from './dossiers.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstitutionDossier,
      DossierDocument,
      DossierStatusHistory,
      CreditDetails,
      CreditDisbursement,
      RepaymentInstallment,
      ProjectMilestone,
      FieldVisit,
      Institution,
      User,
    ]),
    UploadModule,
  ],
  controllers: [DossiersController],
  providers: [DossiersService],
  exports: [DossiersService],
})
export class DossiersModule {}
