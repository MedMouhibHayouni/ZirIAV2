import {
  Injectable, Logger, NotFoundException, ForbiddenException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { MissionContract } from './entities/mission-contract.entity';
import { MissionMessage } from './entities/mission-message.entity';
import { MissionContractDocument } from './entities/mission-contract-document.entity';
import { DisputeRecord } from './entities/dispute-record.entity';
import { PlatformConfig } from '../common/entities/platform-config.entity';
import { MissionEvaluationBadge } from './entities/mission-evaluation-badge.entity';
import { WorkerProfile } from '../workers/entities/worker-profile.entity';
import { WorkerSpecialtyStats } from '../workers/entities/worker-specialty-stats.entity';
import { ContractType } from './entities/contract-type.enum';
import { ContractStatus, STATUS_TRANSITIONS } from './entities/contract-status.enum';
import { ContractMessageType, DocumentType, DisputeReasonType, CancelledBy } from './entities/contract-enums';
import { NotificationGateway } from '../notifications/notification.gateway';
import { WalletService } from '../finance/wallet.service';

export interface CreateContractDto {
  contract_type: ContractType;
  reference_id: string;
  initiator_id: string;
  counterparty_id: string;
  farmer_id?: string;
  provider_id?: string;
  proposed_amount_tnd?: number;
  total_amount_tnd?: number;
  commission_amount_tnd?: number;
  terms_snapshot: Record<string, any>;
  description?: string;
  parcel_id?: string;
  start_date?: Date;
  duration_days?: number;
  navigation_deep_link?: string | null;
}

@Injectable()
export class MissionContractService {
  private readonly logger = new Logger(MissionContractService.name);

  constructor(
    @InjectRepository(MissionContract)
    private readonly contractRepo: Repository<MissionContract>,
    @InjectRepository(MissionMessage)
    private readonly messageRepo: Repository<MissionMessage>,
    @InjectRepository(MissionContractDocument)
    private readonly documentRepo: Repository<MissionContractDocument>,
    @InjectRepository(DisputeRecord)
    private readonly disputeRepo: Repository<DisputeRecord>,
    @InjectRepository(PlatformConfig)
    private readonly configRepo: Repository<PlatformConfig>,
    @InjectRepository(MissionEvaluationBadge)
    private readonly badgeRepo: Repository<MissionEvaluationBadge>,
    @InjectRepository(WorkerProfile)
    private readonly workerRepo: Repository<WorkerProfile>,
    @InjectRepository(WorkerSpecialtyStats)
    private readonly specialtyStatsRepo: Repository<WorkerSpecialtyStats>,
    private readonly dataSource: DataSource,
    private readonly notificationGateway: NotificationGateway,
    private readonly walletService: WalletService,
  ) {}

  async getCommissionRate(): Promise<number> {
    const config = await this.configRepo.findOne({ where: { key: 'MISSION_COMMISSION_RATE' } });
    return config ? parseFloat(config.value) : 0.10;
  }

  private appendStatusHistory(contract: MissionContract, status: string, changedById: string, note: string) {
    if (!Array.isArray(contract.status_history)) contract.status_history = [];
    contract.status_history.push({
      status,
      changed_by_id: changedById,
      changed_at: new Date().toISOString(),
      note,
    });
  }

  private async changeStatus(
    contract: MissionContract,
    newStatus: ContractStatus,
    userId: string,
    note: string,
    extra?: Partial<MissionContract>,
    manager?: EntityManager,
  ): Promise<MissionContract> {
    const allowed = STATUS_TRANSITIONS[contract.status as ContractStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(`Transition ${contract.status} → ${newStatus} non autorisée`);
    }
    const prev = contract.status;
    contract.status = newStatus;
    if (extra) Object.assign(contract, extra);
    contract.audit_log = [
      ...(contract.audit_log ?? []),
      { at: new Date().toISOString(), action: `STATUS_${newStatus}`, by: userId, diff: { from: prev, to: newStatus } },
    ];
    this.appendStatusHistory(contract, newStatus, userId, note);

    const mgr = manager ?? this.dataSource.manager;
    const saved = await mgr.save(MissionContract, contract);

    const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
    this.notificationGateway.sendToUser(other, 'contract_status_changed', {
      contract_id: saved.id,
      status: newStatus,
      previous_status: prev,
      note,
    });
    this.notificationGateway.sendToUser(userId, 'contract_status_changed', {
      contract_id: saved.id,
      status: newStatus,
      previous_status: prev,
      note,
    });

    this.logger.log(`[Contract] ${saved.id} ${prev} → ${newStatus} by ${userId}`);
    return saved;
  }

  async createContract(dto: CreateContractDto, manager?: EntityManager): Promise<MissionContract> {
    const mgr = manager ?? this.dataSource.manager;
    const existing = await mgr.findOne(MissionContract, {
      where: { reference_id: dto.reference_id, contract_type: dto.contract_type },
    });
    if (existing) return existing;

    const contract = mgr.create(MissionContract, {
      ...dto,
      farmer_id: dto.farmer_id ?? dto.initiator_id,
      provider_id: dto.provider_id ?? dto.counterparty_id,
      proposed_amount_tnd: dto.proposed_amount_tnd ?? dto.total_amount_tnd ?? 0,
      total_amount_tnd: dto.total_amount_tnd ?? dto.proposed_amount_tnd ?? 0,
      commission_amount_tnd: dto.commission_amount_tnd ?? 0,
      status: ContractStatus.NEGOTIATING,
      audit_log: [{ at: new Date().toISOString(), action: 'CREATED', by: dto.initiator_id }],
      status_history: [{ status: ContractStatus.NEGOTIATING, changed_by_id: dto.initiator_id, changed_at: new Date().toISOString(), note: 'Contrat créé' }],
    });
    const saved = await mgr.save(MissionContract, contract);

    this.notificationGateway.sendToUser(dto.counterparty_id, 'contract_offer_received', {
      contract_id: saved.id,
      contract_type: saved.contract_type,
      proposed_amount_tnd: saved.proposed_amount_tnd,
    });

    this.logger.log(`[Contract] Created ${dto.contract_type} contract ${saved.id}`);
    return saved;
  }

  async sendMessage(contractId: string, senderId: string, content: string, type: ContractMessageType = ContractMessageType.TEXT, offerAmount?: number): Promise<MissionMessage> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (![contract.initiator_id, contract.counterparty_id].includes(senderId)) {
      throw new ForbiddenException('Accès interdit');
    }
    // FIX B (Phase 2/3) — source unique du prix : les contrats nés d'une négociation
    // structurée (rounds, AGREED) ne peuvent plus recevoir de nouveau montant via le
    // chat libre. OFFER/COUNTER_OFFER post-accord sont rejetés ; TEXT/SYSTEM restent
    // autorisés (discussion logistique). L'historique existant n'est pas modifié.
    if (type === ContractMessageType.OFFER || type === ContractMessageType.COUNTER_OFFER) {
      const auditLog = (contract as any).audit_log as Array<{ action?: string }> | null;
      const fromNegotiation = Array.isArray(auditLog) &&
        auditLog.some((e) => e && e.action === 'CREATED_FROM_NEGOTIATION');
      if (fromNegotiation) {
        throw new BadRequestException(
          'Le prix de cette mission a été fixé par négociation. Les montants ne peuvent plus être proposés dans le chat — TEXT uniquement.'
        );
      }
    }
    const msg = this.messageRepo.create({
      contract_id: contractId,
      sender_id: senderId,
      content,
      message_type: type,
      offer_amount_tnd: offerAmount ?? null,
    });
    const saved = await this.messageRepo.save(msg);

    const other = contract.initiator_id === senderId ? contract.counterparty_id : contract.initiator_id;
    this.notificationGateway.sendToUser(other, 'contract_new_message', {
      contract_id: contractId,
      message_id: saved.id,
      sender_id: senderId,
      message_type: type,
    });

    return saved;
  }

  async getMessages(contractId: string, userId: string): Promise<MissionMessage[]> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
      throw new ForbiddenException('Accès interdit');
    }
    return this.messageRepo.find({ where: { contract_id: contractId }, order: { created_at: 'ASC' } });
  }

  async acceptOffer(contractId: string, userId: string, messageId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
        throw new ForbiddenException('Accès interdit');
      }

      const msg = await manager.findOne(MissionMessage, { where: { id: messageId } });
      if (!msg || msg.contract_id !== contractId) throw new NotFoundException('Offre introuvable');
      if (msg.message_type !== ContractMessageType.OFFER && msg.message_type !== ContractMessageType.COUNTER_OFFER) {
        throw new ConflictException('Ce message n\'est pas une offre');
      }

      const offerAmount = msg.offer_amount_tnd ?? contract.proposed_amount_tnd ?? contract.total_amount_tnd ?? 0;
      const rate = await this.getCommissionRate();
      const commission = offerAmount * rate;

      const prev = { status: contract.status };
      contract.status = ContractStatus.ACCEPTED;
      contract.accepted_at = new Date();
      contract.final_amount_tnd = offerAmount;
      contract.total_amount_tnd = offerAmount;
      contract.platform_commission_tnd = commission;
      contract.net_to_provider_tnd = offerAmount - commission;
      contract.commission_amount_tnd = commission;
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'ACCEPTED', by: userId, diff: { from: prev, to: { status: ContractStatus.ACCEPTED }, final_amount: offerAmount } },
      ];
      this.appendStatusHistory(contract, ContractStatus.ACCEPTED, userId, `Offre acceptée: ${offerAmount} TND`);

      const saved = await manager.save(MissionContract, contract);

      const systemMsg = manager.create(MissionMessage, {
        contract_id: contractId,
        sender_id: 'SYSTEM',
        content: `Offre acceptée à ${offerAmount} TND. Le contrat est maintenant actif.`,
        message_type: ContractMessageType.SYSTEM,
        offer_amount_tnd: offerAmount,
      });
      await manager.save(MissionMessage, systemMsg);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_accepted', {
        contract_id: saved.id,
        final_amount_tnd: offerAmount,
      });

      return saved;
    });
  }

  async startMission(contractId: string, userId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.status !== ContractStatus.ACCEPTED) {
        throw new ConflictException(`Le contrat est en statut ${contract.status}`);
      }
      if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
        throw new ForbiddenException('Accès interdit');
      }

      const prev = { status: contract.status };
      contract.status = ContractStatus.IN_PROGRESS;
      contract.start_date = new Date();
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'STARTED', by: userId, diff: { from: prev, to: { status: ContractStatus.IN_PROGRESS } } },
      ];
      this.appendStatusHistory(contract, ContractStatus.IN_PROGRESS, userId, 'Mission démarrée');

      const saved = await manager.save(MissionContract, contract);

      const systemMsg = manager.create(MissionMessage, {
        contract_id: contractId,
        sender_id: 'SYSTEM',
        content: 'La mission a démarré.',
        message_type: ContractMessageType.SYSTEM,
      });
      await manager.save(MissionMessage, systemMsg);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_started', { contract_id: saved.id });

      return saved;
    });
  }

  async completeMission(contractId: string, userId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.status !== ContractStatus.IN_PROGRESS) {
        throw new ConflictException(`Le contrat est en statut ${contract.status}`);
      }

      const prev = { status: contract.status };
      contract.status = ContractStatus.COMPLETED;
      contract.completed_at = new Date();
      contract.end_date = new Date();
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'COMPLETED', by: userId, diff: { from: prev, to: { status: ContractStatus.COMPLETED } } },
      ];
      this.appendStatusHistory(contract, ContractStatus.COMPLETED, userId, 'Mission terminée');

      const saved = await manager.save(MissionContract, contract);

      const systemMsg = manager.create(MissionMessage, {
        contract_id: contractId,
        sender_id: 'SYSTEM',
        content: `Mission terminée. Montant: ${contract.final_amount_tnd ?? contract.total_amount_tnd} TND.`,
        message_type: ContractMessageType.SYSTEM,
      });
      await manager.save(MissionMessage, systemMsg);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_completed', { contract_id: saved.id });

      return saved;
    });
  }

  async rateContract(contractId: string, userId: string, rating: number, comment?: string): Promise<MissionContract> {
    if (rating < 1 || rating > 5) throw new ConflictException('La note doit être entre 1 et 5');
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.status !== ContractStatus.COMPLETED) {
      throw new ConflictException('Seul un contrat terminé peut être évalué');
    }

    if (userId === contract.farmer_id) {
      contract.farmer_rated_provider = rating;
      contract.farmer_rating_comment = comment ?? null;
    } else if (userId === contract.provider_id) {
      contract.provider_rated_farmer = rating;
      contract.provider_rating_comment = comment ?? null;
    } else {
      throw new ForbiddenException('Accès interdit');
    }

    contract.audit_log = [
      ...(contract.audit_log ?? []),
      { at: new Date().toISOString(), action: 'RATED', by: userId, diff: { rating, comment } },
    ];
    this.appendStatusHistory(contract, contract.status, userId, `Évaluation: ${rating}/5`);

    const saved = await this.contractRepo.save(contract);

    const other = contract.farmer_id === userId ? contract.provider_id : contract.farmer_id;
    if (other) {
      this.notificationGateway.sendToUser(other, 'contract_rating_received', {
        contract_id: contractId,
        rating,
        comment,
      });
    }

    return saved;
  }

  async cancelContract(contractId: string, userId: string, reason: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');

      let cancelledBy: CancelledBy;
      if (userId === contract.farmer_id) cancelledBy = CancelledBy.FARMER;
      else if (userId === contract.provider_id) cancelledBy = CancelledBy.PROVIDER;
      else throw new ForbiddenException('Accès interdit');

      if ([ContractStatus.COMPLETED, ContractStatus.CANCELLED].includes(contract.status)) {
        throw new ConflictException(`Le contrat est en statut ${contract.status}`);
      }

      contract.status = ContractStatus.CANCELLED;
      contract.cancellation_reason = reason;
      contract.cancelled_by = cancelledBy;
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'CANCELLED', by: userId, diff: { reason, cancelled_by: cancelledBy } },
      ];
      this.appendStatusHistory(contract, ContractStatus.CANCELLED, userId, `Annulé: ${reason}`);

      const saved = await manager.save(MissionContract, contract);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_status_changed', {
        contract_id: saved.id,
        status: ContractStatus.CANCELLED,
        reason,
      });

      return saved;
    });
  }

  async extendMission(contractId: string, userId: string, additionalDays: number, additionalAmount: number): Promise<MissionContract> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.status !== ContractStatus.IN_PROGRESS) {
      throw new ConflictException('Seule une mission en cours peut être prolongée');
    }
    if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
      throw new ForbiddenException('Accès interdit');
    }

    const systemMsg = await this.sendMessage(contractId, userId,
      `Demande de prolongation: +${additionalDays} jours, +${additionalAmount} TND`,
      ContractMessageType.OFFER, additionalAmount);

    return contract;
  }

  async openDispute(contractId: string, userId: string, reasonType: DisputeReasonType, description: string, photoUrls?: string[]): Promise<DisputeRecord> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (![ContractStatus.IN_PROGRESS, ContractStatus.COMPLETED].includes(contract.status)) {
        throw new ConflictException('Seul un contrat actif ou terminé peut être contesté');
      }
      if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
        throw new ForbiddenException('Accès interdit');
      }

      const dispute = manager.create(DisputeRecord, {
        contract_id: contractId,
        opened_by_id: userId,
        reason_type: reasonType,
        description,
        photo_urls: photoUrls ?? null,
      });
      const savedDispute = await manager.save(DisputeRecord, dispute);

      contract.status = ContractStatus.DISPUTED;
      contract.dispute_opened_at = new Date();
      contract.dispute_reason = description;
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'DISPUTED', by: userId, diff: { reasonType, description } },
      ];
      this.appendStatusHistory(contract, ContractStatus.DISPUTED, userId, `Litige: ${reasonType}`);
      await manager.save(MissionContract, contract);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_dispute_opened', {
        contract_id: contractId,
        reason_type: reasonType,
      });

      return savedDispute;
    });
  }

  async getContractDocuments(contractId: string): Promise<MissionContractDocument[]> {
    return this.documentRepo.find({ where: { contract_id: contractId }, order: { generated_at: 'DESC' } });
  }

  async getContractHistory(contractId: string): Promise<any[]> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    return contract.status_history ?? [];
  }

  async acceptContract(contractId: string, userId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.counterparty_id !== userId) throw new ForbiddenException('Vous n\'êtes pas la contrepartie');
      if (contract.status !== ContractStatus.NEGOTIATING && contract.status !== ContractStatus.DRAFT) {
        throw new ConflictException(`Le contrat est en statut: ${contract.status}`);
      }

      const prev = { status: contract.status };
      contract.status = ContractStatus.ACCEPTED;
      contract.accepted_at = new Date();
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'ACCEPTED', by: userId, diff: { from: prev, to: { status: ContractStatus.ACCEPTED } } },
      ];
      this.appendStatusHistory(contract, ContractStatus.ACCEPTED, userId, 'Contrat accepté');

      const saved = await manager.save(MissionContract, contract);

      this.notificationGateway.sendToUser(contract.initiator_id, 'contract_activated', {
        contract_id: saved.id,
      });

      return saved;
    });
  }

  async signContract(contractId: string, userId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
        throw new ForbiddenException('Accès interdit');
      }

      const role = userId === contract.farmer_id ? 'FARMER' : 'WORKER';
      const signedBy = (contract.terms_snapshot?.signed_by as string[]) ?? [];

      if (signedBy.includes(role)) {
        throw new ConflictException('Vous avez déjà signé ce contrat');
      }

      const newSignedBy = [...signedBy, role];
      const isFullySigned = newSignedBy.length >= 2;

      const systemMsg = manager.create(MissionMessage, {
        contract_id: contractId,
        sender_id: 'SYSTEM',
        content: isFullySigned
          ? `${role === 'FARMER' ? 'Le fermier' : 'Le travailleur'} a signé le contrat. Contrat maintenant ACTIF.`
          : `${role === 'FARMER' ? 'Le fermier' : 'Le travailleur'} a signé le contrat. En attente de la signature de ${role === 'FARMER' ? 'du travailleur' : 'du fermier'}.`,
        message_type: ContractMessageType.SYSTEM,
      });
      await manager.save(MissionMessage, systemMsg);

      const extra: Partial<MissionContract> = {
        accepted_at: contract.accepted_at ?? new Date(),
        terms_snapshot: { ...contract.terms_snapshot, signed_by: newSignedBy },
      };

      if (isFullySigned) {
        return this.changeStatus(contract, ContractStatus.ACTIF, userId,
          `Contrat signé par les deux parties`, extra, manager);
      }

      Object.assign(contract, extra);
      this.appendStatusHistory(contract, contract.status, userId, `${role} a signé`);
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: `SIGNED_BY_${role}`, by: userId },
      ];
      const saved = await manager.save(MissionContract, contract);

      const unsigner = contract.farmer_id === userId ? contract.counterparty_id : contract.farmer_id;
      if (unsigner) {
        this.notificationGateway.sendToUser(unsigner, 'contract_ready_to_sign', {
          contract_id: saved.id,
          signed_by: role,
        });
      }

      return saved;
    });
  }

  async workerMarkComplete(contractId: string, workerId: string): Promise<MissionContract> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.provider_id !== workerId) throw new ForbiddenException('Seul le travailleur peut marquer la fin');
    if (contract.status !== ContractStatus.EN_COURS && contract.status !== ContractStatus.IN_PROGRESS && contract.status !== ContractStatus.ACTIF) {
      throw new ConflictException(`Mission non active (${contract.status})`);
    }

    contract.worker_marked_complete = true;
    contract.worker_marked_complete_at = new Date();
    await this.contractRepo.save(contract);

    this.notificationGateway.sendToUser(contract.farmer_id!, 'worker_marked_complete', {
      contract_id: contractId,
      message: 'Le travailleur a marqué la mission comme terminée. Veuillez confirmer.',
    });

    return contract;
  }

  async farmerConfirmComplete(contractId: string, farmerId: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId }, lock: { mode: 'pessimistic_write' } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.farmer_id !== farmerId) throw new ForbiddenException('Seul le fermier peut confirmer');

      const rate = await this.getCommissionRate();
      const grossAmount = Number(contract.final_amount_tnd ?? contract.total_amount_tnd ?? 0);
      const commission = grossAmount * rate;

      await this.walletService.creditPending(
        contract.provider_id || contract.counterparty_id,
        grossAmount, rate, contract.id, 'MISSION',
        `Paiement mission ${contract.id.slice(0, 8)}`, manager,
      );
      await this.walletService.releaseToAvailable(
        contract.provider_id || contract.counterparty_id,
        contract.id, manager,
      );

      const finalExtra: Partial<MissionContract> = {
        completed_at: new Date(),
        end_date: new Date(),
        commission_amount_tnd: commission,
        platform_commission_tnd: commission,
        net_to_provider_tnd: grossAmount - commission,
      };

      return this.changeStatus(contract, ContractStatus.TERMINEE, farmerId,
        `Mission confirmée terminée par le fermier. Paiement : ${grossAmount} TND`,
        finalExtra, manager);
    });
  }

  async raiseDispute(contractId: string, userId: string, reason: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
        throw new ForbiddenException('Accès interdit');
      }

      contract.status = ContractStatus.DISPUTED;
      contract.disputed_at = new Date();
      contract.dispute_reason = reason;
      contract.dispute_opened_at = new Date();
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'DISPUTED', by: userId, diff: { reason } },
      ];
      this.appendStatusHistory(contract, ContractStatus.DISPUTED, userId, `Litige: ${reason}`);

      const saved = await manager.save(MissionContract, contract);

      const other = contract.initiator_id === userId ? contract.counterparty_id : contract.initiator_id;
      this.notificationGateway.sendToUser(other, 'contract_disputed', {
        contract_id: saved.id,
        reason,
      });

      return saved;
    });
  }

  async resolveDispute(contractId: string, adminId: string, resolution: string): Promise<MissionContract> {
    return this.dataSource.transaction(async (manager) => {
      const contract = await manager.findOne(MissionContract, { where: { id: contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.status !== ContractStatus.DISPUTED) {
        throw new ConflictException('Ce contrat n\'est pas en litige');
      }

      contract.status = ContractStatus.COMPLETED;
      contract.audit_log = [
        ...(contract.audit_log ?? []),
        { at: new Date().toISOString(), action: 'RESOLVED', by: adminId, diff: { resolution } },
      ];
      this.appendStatusHistory(contract, ContractStatus.COMPLETED, adminId, `Litige résolu: ${resolution}`);

      const saved = await manager.save(MissionContract, contract);

      for (const uid of [contract.initiator_id, contract.counterparty_id]) {
        this.notificationGateway.sendToUser(uid, 'contract_dispute_resolved', {
          contract_id: saved.id,
          resolution,
        });
      }
      return saved;
    });
  }

  async getContractById(contractId: string, userId: string): Promise<MissionContract> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (![contract.initiator_id, contract.counterparty_id].includes(userId)) {
      throw new ForbiddenException('Accès interdit');
    }
    return contract;
  }

  async getMyContracts(userId: string): Promise<MissionContract[]> {
    return this.contractRepo
      .createQueryBuilder('c')
      .where('c.initiator_id = :uid OR c.counterparty_id = :uid', { uid: userId })
      .orderBy('c.created_at', 'DESC')
      .getMany();
  }

  async getContractsByType(userId: string, contractType: ContractType): Promise<MissionContract[]> {
    return this.contractRepo
      .createQueryBuilder('c')
      .where('(c.initiator_id = :uid OR c.counterparty_id = :uid) AND c.contract_type = :type', { uid: userId, type: contractType })
      .orderBy('c.created_at', 'DESC')
      .getMany();
  }

  async getContractByReference(referenceId: string, contractType: ContractType): Promise<MissionContract | null> {
    return this.contractRepo.findOne({
      where: { reference_id: referenceId, contract_type: contractType },
    });
  }

  async cancelOtherNegotiations(referenceId: string, contractType: ContractType, excludeContractId: string, cancelledByUserId: string): Promise<void> {
    const others = await this.contractRepo.find({
      where: { reference_id: referenceId, contract_type: contractType },
    });
    for (const other of others) {
      if (other.id === excludeContractId) continue;
      if (other.status === ContractStatus.NEGOTIATING || other.status === ContractStatus.DRAFT) {
        other.status = ContractStatus.CANCELLED;
        other.cancellation_reason = 'Demande attribuée à un autre prestataire';
        other.cancelled_by = CancelledBy.FARMER;
        other.audit_log = [
          ...(other.audit_log ?? []),
          { at: new Date().toISOString(), action: 'CANCELLED', by: cancelledByUserId, diff: { reason: 'Demande attribuée à un autre prestataire' } },
        ];
        this.appendStatusHistory(other, ContractStatus.CANCELLED, cancelledByUserId, 'Demande attribuée à un autre prestataire');
        await this.contractRepo.save(other);

        this.notificationGateway.sendToUser(other.counterparty_id, 'contract_status_changed', {
          contract_id: other.id,
          status: ContractStatus.CANCELLED,
          reason: 'Demande attribuée à un autre prestataire',
        });
      }
    }
  }

  async getEvaluationBadges(): Promise<MissionEvaluationBadge[]> {
    return this.badgeRepo.find();
  }

  async evaluateWorker(contractId: string, farmerId: string, rating: number, badges: string[], comment: string, workerVisible: boolean): Promise<void> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.farmer_id !== farmerId) throw new ForbiddenException('Seul le fermier peut évaluer');
    if (contract.employer_rating) throw new BadRequestException('Évaluation déjà soumise');

    contract.employer_rating = rating;
    contract.employer_rating_badges = badges;
    contract.employer_comment = comment || null;
    contract.employer_rating_submitted_at = new Date();
    contract.worker_visible = workerVisible;
    contract.status = ContractStatus.COMPLETED;
    contract.completed_at = new Date();
    contract.audit_log = [
      ...(contract.audit_log ?? []),
      { at: new Date().toISOString(), action: 'EVALUATED', by: farmerId, diff: { rating, badges } },
    ];
    await this.contractRepo.save(contract);

    await this.recalculateWorkerStats(contract.provider_id || contract.counterparty_id);

    this.notificationGateway.sendToUser(contract.provider_id || contract.counterparty_id, 'mission_evaluated', {
      contract_id: contractId, rating,
    });
  }

  private async recalculateWorkerStats(workerId: string): Promise<void> {
    const completedContracts = await this.contractRepo.find({
      where: {
        provider_id: workerId,
        status: ContractStatus.COMPLETED,
        employer_rating: { $ne: null } as any,
      },
    });

    const rated = completedContracts.filter(c => c.employer_rating != null);
    const totalMissions = rated.length;
    const avgRating = totalMissions > 0
      ? rated.reduce((sum, c) => sum + Number(c.employer_rating), 0) / totalMissions
      : 0;
    const avgRounded = Math.round(avgRating * 100) / 100;

    let badge: string | null = null;
    if (totalMissions >= 10 && avgRounded >= 4.2) badge = 'CONFIRMED';
    if (totalMissions >= 20 && avgRounded >= 4.6) badge = 'EXPERT';

    await this.workerRepo.update({ user_id: workerId }, {
      average_rating: avgRounded,
      total_missions_completed: totalMissions,
      worker_badge: badge,
    });

    const specCounts = new Map<string, number>();
    for (const c of completedContracts) {
      const spec = c.specialty_code || c.terms_snapshot?.['task_type'] || 'AUTRE';
      specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
    }

    for (const [code, count] of specCounts) {
      const existing = await this.specialtyStatsRepo.findOne({
        where: { worker_id: workerId, specialty_code: code },
      });
      if (existing) {
        existing.missions_count = count;
        await this.specialtyStatsRepo.save(existing);
      } else {
        await this.specialtyStatsRepo.save(
          this.specialtyStatsRepo.create({ worker_id: workerId, specialty_code: code, missions_count: count })
        );
      }
    }
  }

  async workerReplyToEvaluation(contractId: string, workerId: string, reply: string): Promise<void> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.provider_id !== workerId && contract.counterparty_id !== workerId) {
      throw new ForbiddenException('Accès refusé');
    }
    if (contract.worker_reply) throw new BadRequestException('Réponse déjà soumise');
    if (reply.length > 200) throw new BadRequestException('Maximum 200 caractères');

    contract.worker_reply = reply;
    await this.contractRepo.save(contract);
  }
}
