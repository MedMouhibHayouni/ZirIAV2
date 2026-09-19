import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Institution } from './institutions/entities/institution.entity';
import { InstitutionMember } from './institutions/entities/institution-member.entity';
import { InstitutionMessagesModule } from './institution-messages/institution-messages.module';
import { InstitutionMessage } from './institution-messages/entities/institution-message.entity';
import { InstitutionMessageRead } from './institution-messages/entities/institution-message-read.entity';
import { ProjectCall } from './institutions/entities/project-call.entity';
import { InstitutionAppointment } from './institutions/entities/institution-appointment.entity';
import { InstitutionsModule } from './institutions/institutions.module';
import { DataSharingConsent } from './privacy/entities/data-sharing-consent.entity';
import { DataAccessLog } from './privacy/entities/data-access-log.entity';
import { PrivacyModule } from './privacy/privacy.module';
import { InstitutionDossier } from './dossiers/entities/dossier.entity';
import { DossierDocument } from './dossiers/entities/dossier-document.entity';
import { DossierStatusHistory } from './dossiers/entities/dossier-status-history.entity';
import { CreditDetails } from './dossiers/entities/credit-details.entity';
import { CreditDisbursement } from './dossiers/entities/credit-disbursement.entity';
import { RepaymentInstallment } from './dossiers/entities/repayment-installment.entity';
import { ProjectMilestone } from './dossiers/entities/project-milestone.entity';
import { FieldVisit } from './dossiers/entities/field-visit.entity';
import { DossiersModule } from './dossiers/dossiers.module';
import { CrdaCampaign } from './crda/entities/crda-campaign.entity';
import { CrdaCampaignEnrollment } from './crda/entities/crda-campaign-enrollment.entity';
import { CrdaServiceRequest } from './crda/entities/crda-service-request.entity';
import { SubsidyProgram } from './crda/entities/subsidy-program.entity';
import { SubsidyApplication } from './crda/entities/subsidy-application.entity';
import { CrdaModule } from './crda/crda.module';

// ─── Entités Phase 1 (fondation) ─────────────────────────────────────────────
import { User } from './users/entities/user.entity';
import { Cooperative } from './cooperatives/entities/cooperative.entity';
import { CrdaZone } from './expert/entities/crda-zone.entity';
import { GovernorateBoundary } from './expert/entities/governorate-boundary.entity';
import { ConsultationAdditionalInfo } from './expert/entities/consultation-additional-info.entity';
import { CommissionAgreement } from './expert/entities/commission-agreement.entity';
import { PrescriptionPurchase } from './expert/entities/prescription-purchase.entity';
import { Parcel } from './parcels/entities/parcel.entity';
import { MarketplaceListing } from './marketplace/entities/marketplace-listing.entity';
import { MarketplaceConnection } from './marketplace/entities/marketplace-connection.entity';
import { Equipment } from './equipment/entities/equipment.entity';
import { StorageFacility } from './storage/entities/storage-facility.entity';
import { StorageRoom } from './storage/entities/storage-room.entity';
import { StorageReservation } from './storage/entities/storage-reservation.entity';
import { Job } from './jobs/entities/job.entity';
import { DiseaseDetection } from './disease-detections/entities/disease-detection.entity';
import { DiagnosisResolutionLog } from './ai/entities/diagnosis-resolution-log.entity';

// ─── Entités Phase V1.0 (boucle économique complète) ─────────────────────────
import { WorkerProfile } from './workers/entities/worker-profile.entity';
import { JobOffer } from './workers/entities/job-offer.entity';
import { JobApplication } from './workers/entities/job-application.entity';
import { WorkerCertification } from './workers/entities/worker-certification.entity';
import { WorkerEarnings } from './workers/entities/worker-earnings.entity';
import { WorkerSpecialtyStats } from './workers/entities/worker-specialty-stats.entity';
import { SpecialtyReference } from './workers/entities/specialty-reference.entity';
import { DriverProfile } from './drivers/entities/driver-profile.entity';
import { TransportRequest } from './drivers/entities/transport-request.entity';
import { GpsTrackingEvent } from './drivers/entities/gps-tracking-event.entity';
import { LandListing } from './land/entities/land-listing.entity';
import { LandAuction } from './land/entities/land-auction.entity';
import { LandBid } from './land/entities/land-bid.entity';
import { PlatformCommission } from './finance/entities/platform-commission.entity';
import { FinancialRecord } from './finance/entities/financial-record.entity';
import { UserWallet } from './finance/entities/user-wallet.entity';
import { WalletTransaction } from './finance/entities/wallet-transaction.entity';
import { ZirpulsePost } from './zirpulse/entities/zirpulse-post.entity';
import { PlatformRevenueDaily } from './finance/entities/platform-revenue-daily.entity';
import { FinancialTransaction } from './finance/entities/financial-transaction.entity';
import { CropZone } from './parcels/entities/crop-zone.entity';
import { Inventory } from './inventory/entities/inventory.entity';
import { InventoryMovement } from './inventory/entities/inventory-movement.entity';
import { EquipmentReservation } from './equipment/entities/equipment-reservation.entity';
import { NotificationRecord } from './notifications/entities/notification-record.entity';
import { Message } from './messages/entities/message.entity';
import { MarketPrice } from './market-prices/entities/market-price.entity';
import { PhytoAlert } from './expert/entities/phyto-alert.entity';
import { ExpertProfile } from './expert/entities/expert-profile.entity';
import { ExpertConsultation } from './expert/entities/expert-consultation.entity';
import { Zone } from './ambassador/entities/zone.entity';
import { FieldReport } from './ambassador/entities/field-report.entity';
import { AmbassadorValidation } from './workers/entities/ambassador-validation.entity';
import { Prescription } from './expert/entities/prescription.entity';
import { ExpertFarmerRelation } from './expert/entities/expert-farmer-relation.entity';
import { ExpertMessage } from './expert/entities/expert-message.entity';
import { NameDictionary } from './name-dictionary/entities/name-dictionary.entity';
import { MissionContract } from './contracts/entities/mission-contract.entity';
import { MissionMessage } from './contracts/entities/mission-message.entity';
import { MissionContractDocument } from './contracts/entities/mission-contract-document.entity';
import { DisputeRecord } from './contracts/entities/dispute-record.entity';
import { MissionNegotiation } from './contracts/entities/mission-negotiation.entity';
import { NegotiationRound } from './contracts/entities/negotiation-round.entity';
import { MissionEvaluationBadge } from './contracts/entities/mission-evaluation-badge.entity';
import { PlatformConfig } from './common/entities/platform-config.entity';
import { GovernorateCentroid } from './expert/entities/governorate-centroid.entity';
import { CropKcValue } from './expert/entities/crop-kc-value.entity';
import { AnimalNutritionalNorm } from './expert/entities/animal-nutritional-norm.entity';
import { SeasonalCropRisk } from './expert/entities/seasonal-crop-risk.entity';
import { ProductPrescriptionRule } from './expert/entities/product-prescription-rule.entity';
import { VaccineType } from './expert/entities/vaccine-type.entity';
import { HerdRecord } from './expert/entities/herd-record.entity';
import { VaccinationRecord } from './expert/entities/vaccination-record.entity';

// ─── Entités AI / Agent (Phase Sentinel) ───────────────────────────────────
import { Prediction } from './ai/entities/prediction.entity';
import { AiModelFeedback } from './ai/entities/ai-model-feedback.entity';
import { AgentConversation } from './ai/entities/agent-conversation.entity';
import { AgentMessage } from './ai/entities/agent-message.entity';
import { AgentIntent } from './ai/entities/agent-intent.entity';
import { AgentAction } from './ai/entities/agent-action.entity';
import { PlantIdentification } from './ai/entities/plant-identification.entity';
import { DiseaseKnowledgeEntry } from './ai/entities/disease-knowledge.entity';

// ─── Entités Monetization & Subscriptions ──────────────────────────────────
import { SubscriptionPlan } from './subscriptions/entities/subscription-plan.entity';
import { UserSubscription } from './subscriptions/entities/user-subscription.entity';
import { FeaturePurchase } from './subscriptions/entities/feature-purchase.entity';

// ─── Entités Supplier ──────────────────────────────────────────────────────
import { Product } from './supplier/entities/product.entity';
import { SupplierPromotion } from './supplier/entities/supplier-promotion.entity';
import { ProductOrder } from './supplier/entities/product-order.entity';
import { SupplierReview } from './supplier/entities/supplier-review.entity';
import { SupplierPlanFeature } from './supplier/entities/supplier-plan-feature.entity';
import { SupplierSubscription } from './supplier/entities/supplier-subscription.entity';
import { SupplierInvoice } from './supplier/entities/supplier-invoice.entity';
import { SupplierPurchaseOrder } from './supplier/entities/supplier-purchase-order.entity';
import { SupplierStockMovement } from './supplier/entities/supplier-stock-movement.entity';
import { SupplierCrmClient } from './supplier/entities/supplier-crm-client.entity';
import { SupplierCrmNote } from './supplier/entities/supplier-crm-note.entity';
import { SupplierCrmReminder } from './supplier/entities/supplier-crm-reminder.entity';

// ─── Modules Fonctionnels (Phases 1-2-3) ─────────────────────────────────────
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CooperativesModule } from './cooperatives/cooperatives.module';
import { ParcelsModule } from './parcels/parcels.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { EquipmentModule } from './equipment/equipment.module';
import { JobsModule } from './jobs/jobs.module';
import { DiseaseDetectionsModule } from './disease-detections/disease-detections.module';
import { WeatherModule } from './weather/weather.module';

// ─── Modules Action Services (Phase 4) ───────────────────────────────────────
import { UploadModule } from './upload/upload.module';
import { NotificationModule } from './notifications/notification.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';

// ─── Modules V1.0 (boucle économique complète) ───────────────────────────────
import { WorkersModule } from './workers/workers.module';
import { DriversModule } from './drivers/drivers.module';
import { LandModule } from './land/land.module';
import { FinanceModule } from './finance/finance.module';
import { ZirpulseModule } from './zirpulse/zirpulse.module';
import { MlopsModule } from './mlops/mlops.module';
import { ExpertModule } from './expert/expert.module';
import { InventoryModule } from './inventory/inventory.module';
import { MessagesModule } from './messages/messages.module';
import { MarketPricesModule } from './market-prices/market-prices.module';
import { SubscriptionModule } from './subscriptions/subscription.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SupplierModule } from './supplier/supplier.module';
import { AmbassadorModule } from './ambassador/ambassador.module';
import { NameDictionaryModule } from './name-dictionary/name-dictionary.module';
import { ZirFeedModule } from './zirfeed/zirfeed.module';
import { ContractsModule } from './contracts/contracts.module';
import { StorageModule } from './storage/storage.module';
import {
  ZirfeedUserProfile,
  ZirfeedFollow,
  ZirfeedPage,
  ZirfeedGroup,
  ZirfeedGroupMember,
  ZirfeedPost,
  ZirfeedComment,
  ZirfeedReaction,
  ZirfeedSavedCollection,
  ZirfeedSavedPost,
  ZirfeedEvent,
  ZirfeedEventAttendee,
  ZirfeedExternalNews,
  ZirfeedHashtag,
  ZirfeedModeration,
  ZirfeedModerationRestriction,
  ZirfeedNotification,
  ZirfeedStory
} from './zirfeed/entities/zirfeed.entities';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration globale depuis .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Cache (Redis en prod, In-Memory en dev)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const Redis = require('ioredis');
          return {
            store: {
              create: () => new Redis(redisUrl),
            } as any,
          } as any;
        } else {
          return {
            ttl: 30000,
          } as any;
        }
      },
    }),

    // Rate Limiting Global
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Cron jobs (@Cron) pour le moteur GDD
    ScheduleModule.forRoot(),

    // Connexion PostgreSQL via TypeORM avec autoSynchronize en dev
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_DATABASE', 'ziria_db'),
        entities: [
          // Phase 1 — Fondation
          User,
          Cooperative,
          Parcel,
          MarketplaceListing,
          MarketplaceConnection,
          Equipment,
          Job,
          DiseaseDetection,
          // Phase V1.0 — Boucle économique complète
          WorkerProfile,
          JobOffer,
          JobApplication,
          WorkerCertification,
          WorkerEarnings,
          DriverProfile,
          TransportRequest,
          GpsTrackingEvent,
          LandListing,
          LandAuction,
          LandBid,
          PlatformCommission,
          FinancialRecord,
          UserWallet,
          WalletTransaction,
          ZirpulsePost,
          CropZone,
          Inventory,
          InventoryMovement,
          EquipmentReservation,
          StorageFacility,
          StorageRoom,
          StorageReservation,
          NotificationRecord,
          PlatformRevenueDaily,
          FinancialTransaction,
          Message,
          MarketPrice,
          PhytoAlert,
          // Phase Sentinel — AI / Agent
          Prediction,
          AiModelFeedback,
          AgentConversation,
          AgentMessage,
          AgentIntent,
          AgentAction,
          PlantIdentification,
          DiseaseKnowledgeEntry,
          DiagnosisResolutionLog,
          // Phase Sentinel — Monetization
          SubscriptionPlan,
          UserSubscription,
          FeaturePurchase,
          Product,
          SupplierPromotion,
          ProductOrder,
          SupplierReview,
          SupplierPlanFeature,
          SupplierSubscription,
          SupplierInvoice,
          SupplierPurchaseOrder,
          SupplierStockMovement,
          SupplierCrmClient,
          SupplierCrmNote,
          SupplierCrmReminder,
          // Phase Ambassador & Expert
          Zone,
          FieldReport,
          AmbassadorValidation,
          Prescription,
          NameDictionary,
          ExpertProfile,
          ExpertConsultation,
          ExpertFarmerRelation,
          ExpertMessage,
          MissionContract,
          MissionMessage,
          MissionContractDocument,
          DisputeRecord,
          MissionNegotiation,
          NegotiationRound,
          MissionEvaluationBadge,
          PlatformConfig,
          WorkerSpecialtyStats,
          SpecialtyReference,
          GovernorateCentroid,
          CropKcValue,
          AnimalNutritionalNorm,
          SeasonalCropRisk,
          ProductPrescriptionRule,
          VaccineType,
          HerdRecord,
          VaccinationRecord,
          CrdaZone,
          GovernorateBoundary,
          ConsultationAdditionalInfo,
          CommissionAgreement,
          PrescriptionPurchase,
          // ZirFeed Social Entities
          ZirfeedUserProfile,
          ZirfeedFollow,
          ZirfeedPage,
          ZirfeedGroup,
          ZirfeedGroupMember,
          ZirfeedPost,
          ZirfeedComment,
          ZirfeedReaction,
          ZirfeedSavedCollection,
          ZirfeedSavedPost,
          ZirfeedEvent,
          ZirfeedEventAttendee,
          ZirfeedExternalNews,
          ZirfeedHashtag,
          ZirfeedModeration,
          ZirfeedModerationRestriction,
          ZirfeedNotification,
          ZirfeedStory,
          Institution,
          InstitutionMember,
          DataSharingConsent,
          DataAccessLog,
          InstitutionDossier,
          DossierDocument,
          DossierStatusHistory,
          CreditDetails,
          CreditDisbursement,
          RepaymentInstallment,
          ProjectMilestone,
          FieldVisit,
          CrdaCampaign,
          CrdaCampaignEnrollment,
          CrdaServiceRequest,
          SubsidyProgram,
          SubsidyApplication,
          // Institution Messages
          InstitutionMessage,
          InstitutionMessageRead,
          // Institution Project Calls & Appointments
          ProjectCall,
          InstitutionAppointment,
        ],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
        ssl: false,
        extra: { max: 20, min: 2, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 },
      }),
    }),

    // ─── Phases 1-2-3 : Fondation ────────────────────────────────────────────

    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    CooperativesModule,
    ParcelsModule,
    MarketplaceModule,
    EquipmentModule,
    JobsModule,
    DiseaseDetectionsModule,
    WeatherModule,

    // ─── Phase 4 : Action Services ────────────────────────────────────────────
    UploadModule,
    NotificationModule,
    AiModule,
    AdminModule,

    // ─── Phase V1.0 : Boucle Économique Complète ──────────────────────────────
    WorkersModule,
    DriversModule,
    LandModule,
    FinanceModule,
    ZirpulseModule,
    MlopsModule,
    ExpertModule,
    InventoryModule,
    MessagesModule,
    InstitutionMessagesModule,
    MarketPricesModule,
    SubscriptionModule,
    TransactionsModule,
    SupplierModule,
    AmbassadorModule,
    NameDictionaryModule,
    ZirFeedModule,
    ContractsModule,
    StorageModule,
    InstitutionsModule,
    PrivacyModule,
    DossiersModule,
    CrdaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
