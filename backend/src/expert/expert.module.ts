import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { PhytoAlert } from './entities/phyto-alert.entity';
import { Prescription } from './entities/prescription.entity';
import { ExpertProfile } from './entities/expert-profile.entity';
import { ExpertConsultation } from './entities/expert-consultation.entity';
import { User } from '../users/entities/user.entity';
import { ExpertController } from './expert.controller';
import { FarmerController } from './farmer.controller';
import { ExpertService } from './expert.service';
import { DiseaseDetectionsModule } from '../disease-detections/disease-detections.module';
import { NotificationModule } from '../notifications/notification.module';
import { FinanceModule } from '../finance/finance.module';
import { NameDictionary } from '../name-dictionary/entities/name-dictionary.entity';
import { ExpertFarmerRelation } from './entities/expert-farmer-relation.entity';
import { ExpertMessage } from './entities/expert-message.entity';
import { GovernorateCentroid } from './entities/governorate-centroid.entity';
import { CropKcValue } from './entities/crop-kc-value.entity';
import { AnimalNutritionalNorm } from './entities/animal-nutritional-norm.entity';
import { SeasonalCropRisk } from './entities/seasonal-crop-risk.entity';
import { ProductPrescriptionRule } from './entities/product-prescription-rule.entity';
import { VaccineType } from './entities/vaccine-type.entity';
import { CrdaZone } from './entities/crda-zone.entity';
import { GovernorateBoundary } from './entities/governorate-boundary.entity';
import { ConsultationAdditionalInfo } from './entities/consultation-additional-info.entity';
import { CommissionAgreement } from './entities/commission-agreement.entity';
import { PrescriptionPurchase } from './entities/prescription-purchase.entity';
import { HerdRecord } from './entities/herd-record.entity';
import { VaccinationRecord } from './entities/vaccination-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhytoAlert,
      Prescription,
      User,
      NameDictionary,
      ExpertProfile,
      ExpertConsultation,
      ExpertFarmerRelation,
      ExpertMessage,
      GovernorateCentroid,
      CropKcValue,
      AnimalNutritionalNorm,
      SeasonalCropRisk,
      ProductPrescriptionRule,
      VaccineType,
      CrdaZone,
      GovernorateBoundary,
      ConsultationAdditionalInfo,
      CommissionAgreement,
      PrescriptionPurchase,
      HerdRecord,
      VaccinationRecord,
    ]),
    DiseaseDetectionsModule,
    NotificationModule,
    FinanceModule,
    AiModule,
  ],
  controllers: [ExpertController, FarmerController],
  providers: [ExpertService],
  exports: [ExpertService],
})
export class ExpertModule {}
