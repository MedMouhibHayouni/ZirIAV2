import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionContract } from './entities/mission-contract.entity';
import { MissionMessage } from './entities/mission-message.entity';
import { MissionContractDocument } from './entities/mission-contract-document.entity';
import { DisputeRecord } from './entities/dispute-record.entity';
import { MissionEvaluationBadge } from './entities/mission-evaluation-badge.entity';
import { MissionNegotiation } from './entities/mission-negotiation.entity';
import { NegotiationRound } from './entities/negotiation-round.entity';
import { PlatformConfig } from '../common/entities/platform-config.entity';
import { WorkerProfile } from '../workers/entities/worker-profile.entity';
import { WorkerSpecialtyStats } from '../workers/entities/worker-specialty-stats.entity';
import { MissionContractService } from './mission-contract.service';
import { ContractNotificationService } from './contract-notification.service';
import { ContractsController } from './contracts.controller';
import { PdfService } from './pdf.service';
import { NegotiationService } from './negotiation.service';
import { EvaluationBadgeSeedService } from './evaluation-badge-seed.service';
import { NotificationModule } from '../notifications/notification.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionContract, MissionMessage, MissionContractDocument, DisputeRecord, PlatformConfig, MissionEvaluationBadge, MissionNegotiation, NegotiationRound, WorkerProfile, WorkerSpecialtyStats]),
    NotificationModule,
    FinanceModule,
  ],
  controllers: [ContractsController],
  providers: [MissionContractService, ContractNotificationService, PdfService, NegotiationService, EvaluationBadgeSeedService],
  exports: [MissionContractService, ContractNotificationService, PdfService, NegotiationService],
})
export class ContractsModule {}
