import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AgentController } from './agent.controller';
import { PredictionService } from './prediction.service';
import { AgentService } from './agent.service';

// ─── Sub-services du Sentinel ─────────────────────────────────────────────
import { VisionService } from './services/vision.service';
import { ReasoningService } from './services/reasoning.service';
import { PredictiveService } from './services/predictive.service';
import { LogisticsService } from './services/logistics.service';
import { AudioProcessingService } from './services/audio.service';
import { ExpertGateway } from './gateways/expert.gateway';
import { DiseaseKnowledgeService } from './services/disease-knowledge.service';

// ─── Entités TypeORM ──────────────────────────────────────────────────────
import { DiseaseDetection } from '../disease-detections/entities/disease-detection.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { MarketplaceListing } from '../marketplace/entities/marketplace-listing.entity';
import { User } from '../users/entities/user.entity';
import { Prediction } from './entities/prediction.entity';
import { AiModelFeedback } from './entities/ai-model-feedback.entity';
import { AgentConversation } from './entities/agent-conversation.entity';
import { AgentMessage } from './entities/agent-message.entity';
import { AgentIntent } from './entities/agent-intent.entity';
import { AgentAction } from './entities/agent-action.entity';
import { PlantIdentification } from './entities/plant-identification.entity';
import { DiseaseKnowledgeEntry } from './entities/disease-knowledge.entity';
import { DiagnosisResolutionLog } from './entities/diagnosis-resolution-log.entity';
import { NameDictionary } from '../name-dictionary/entities/name-dictionary.entity';

// ─── Modules Externes ─────────────────────────────────────────────────────
import { AuthModule } from '../auth/auth.module';
import { WeatherModule } from '../weather/weather.module';
import { NotificationModule } from '../notifications/notification.module';
import { UploadModule } from '../upload/upload.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { WorkersModule } from '../workers/workers.module';
import { ParcelsModule } from '../parcels/parcels.module';
import { FinanceModule } from '../finance/finance.module';

import { GeminiModule } from './services/gemini.module';

/**
 * AiModule — Module ZirIA Sentinel
 *
 * Orchestre le pipeline d'intelligence multimodale :
 * Vision (PyTorch) → Météo (Open-Meteo) → Reasoning (Gemini) → DB → Logistique
 */
@Module({
  imports: [
    HttpModule.register({ timeout: 15000, maxRedirects: 3 }),
    TypeOrmModule.forFeature([
      DiseaseDetection,
      Parcel,
      Equipment,
      MarketplaceListing,
      User,
      Prediction,
      AiModelFeedback,
      AgentConversation,
      AgentMessage,
      AgentIntent,
      AgentAction,
      PlantIdentification,
      DiseaseKnowledgeEntry,
      DiagnosisResolutionLog,
      NameDictionary,
    ]),
    AuthModule,
    WeatherModule,
    NotificationModule,
    UploadModule,
    MarketplaceModule,
    WorkersModule,
    ParcelsModule,
    FinanceModule,
    GeminiModule,
  ],
  providers: [
    AiService,            // Orchestrateur central
    VisionService,        // Pipeline hybride KB + Gemini + PyTorch
    ReasoningService,     // Moteur Gemini contextuel
    PredictiveService,    // Calcul dates de récolte
    LogisticsService,     // Alertes équipements météo
    AudioProcessingService, // ZirPulse Audio Parser
    ExpertGateway,        // WebSockets Expert Dashboard
    PredictionService,
    AgentService,
    DiseaseKnowledgeService, // Base de connaissances locale
  ],
  controllers: [AiController, AgentController],
  exports: [AiService, ExpertGateway, GeminiModule, DiseaseKnowledgeService],
})
export class AiModule {}
