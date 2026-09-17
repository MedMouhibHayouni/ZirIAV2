import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MissionNegotiation } from './entities/mission-negotiation.entity';
import { NegotiationRound } from './entities/negotiation-round.entity';
import { MissionContract } from './entities/mission-contract.entity';
import { ContractType } from './entities/contract-type.enum';
import { ContractStatus } from './entities/contract-status.enum';
import { NotificationGateway } from '../notifications/notification.gateway';

@Injectable()
export class NegotiationService {
  private readonly logger = new Logger(NegotiationService.name);

  constructor(
    @InjectRepository(MissionNegotiation)
    private readonly negotiationRepo: Repository<MissionNegotiation>,
    @InjectRepository(NegotiationRound)
    private readonly roundRepo: Repository<NegotiationRound>,
    @InjectRepository(MissionContract)
    private readonly contractRepo: Repository<MissionContract>,
    private readonly dataSource: DataSource,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async startNegotiation(farmerId: string, workerId: string, missionOfferId: string): Promise<MissionNegotiation> {
    const existing = await this.negotiationRepo.findOne({
      where: { farmer_id: farmerId, worker_id: workerId, mission_offer_id: missionOfferId, status: 'ACTIVE' },
    });
    if (existing) return existing;
    const negotiation = this.negotiationRepo.create({
      farmer_id: farmerId, worker_id: workerId, mission_offer_id: missionOfferId,
    });
    const saved = await this.negotiationRepo.save(negotiation);
    this.notificationGateway.sendToUser(workerId, 'negotiation_started', { negotiation_id: saved.id, mission_offer_id: missionOfferId });
    return saved;
  }

  async proposeRound(actorId: string, negotiationId: string, dto: {
    daily_rate_tnd: number; start_date: string; end_date: string;
    working_days: number; conditions_text?: string;
  }): Promise<NegotiationRound> {
    const negotiation = await this.negotiationRepo.findOne({ where: { id: negotiationId } });
    if (!negotiation) throw new NotFoundException('Négociation introuvable');
    if (negotiation.status !== 'ACTIVE') throw new BadRequestException('Négociation terminée');
    if (negotiation.round_count >= 5) throw new BadRequestException('Maximum 5 rounds atteint');

    const isFarmer = actorId === negotiation.farmer_id;
    const isWorker = actorId === negotiation.worker_id;
    if (!isFarmer && !isWorker) throw new ForbiddenException('Accès refusé');

    const totalAmount = dto.daily_rate_tnd * dto.working_days;
    const round = this.roundRepo.create({
      negotiation_id: negotiationId,
      proposed_by: isFarmer ? 'FARMER' : 'WORKER',
      daily_rate_tnd: dto.daily_rate_tnd,
      start_date: dto.start_date,
      end_date: dto.end_date,
      working_days: dto.working_days,
      total_amount: totalAmount,
      conditions_text: dto.conditions_text ?? null,
    });

    const saved = await this.roundRepo.save(round);
    negotiation.round_count += 1;

    if (negotiation.round_count >= 5) {
      negotiation.status = 'EXPIRED';
      negotiation.closed_at = new Date();
    }
    await this.negotiationRepo.save(negotiation);

    const notifyTarget = isFarmer ? negotiation.worker_id : negotiation.farmer_id;
    this.notificationGateway.sendToUser(notifyTarget, 'negotiation_round_received', {
      negotiation_id: negotiationId, round_id: saved.id,
    });

    return saved;
  }

  async acceptRound(actorId: string, negotiationId: string, roundId: string): Promise<MissionContract> {
    const negotiation = await this.negotiationRepo.findOne({ where: { id: negotiationId } });
    if (!negotiation) throw new NotFoundException('Négociation introuvable');
    if (negotiation.status !== 'ACTIVE') throw new BadRequestException('Négociation terminée');

    const isFarmer = actorId === negotiation.farmer_id;
    const isWorker = actorId === negotiation.worker_id;
    if (!isFarmer && !isWorker) throw new ForbiddenException('Accès refusé');

    const round = await this.roundRepo.findOne({ where: { id: roundId, negotiation_id: negotiationId } });
    if (!round) throw new NotFoundException('Round introuvable');
    if (round.status !== 'PENDING') throw new BadRequestException('Round déjà traité');

    round.status = 'ACCEPTED';
    await this.roundRepo.save(round);

    negotiation.status = 'AGREED';
    negotiation.closed_at = new Date();
    await this.negotiationRepo.save(negotiation);

    const startDate = new Date(round.start_date);
    const endDate = new Date(round.end_date);
    const contract = this.contractRepo.create({
      contract_type: ContractType.JOB_MISSION,
      status: ContractStatus.EN_ATTENTE_SIGNATURE,
      reference_id: negotiation.mission_offer_id,
      initiator_id: negotiation.farmer_id,
      counterparty_id: negotiation.worker_id,
      farmer_id: negotiation.farmer_id,
      provider_id: negotiation.worker_id,
      total_amount_tnd: round.total_amount,
      daily_rate_agreed: round.daily_rate_tnd,
      total_days: round.working_days,
      total_amount_agreed: round.total_amount,
      conditions_text: round.conditions_text,
      start_date: startDate,
      end_date: endDate,
      duration_days: round.working_days,
      accepted_at: new Date(),
      terms_snapshot: {
        daily_rate_tnd: round.daily_rate_tnd,
        start_date: round.start_date,
        end_date: round.end_date,
        working_days: round.working_days,
        conditions_text: round.conditions_text ?? '',
        signed_by: [],
      },
      audit_log: [{ at: new Date().toISOString(), action: 'CREATED_FROM_NEGOTIATION', by: actorId }],
      status_history: [{ status: 'EN_ATTENTE_SIGNATURE', changed_by_id: actorId, changed_at: new Date().toISOString(), note: 'Mission confirmée via négociation - en attente de signature' }],
    });
    const saved = await this.contractRepo.save(contract);

    this.notificationGateway.sendToUser(negotiation.worker_id, 'negotiation_accepted', { contract_id: saved.id, negotiation_id: negotiationId });
    this.notificationGateway.sendToUser(negotiation.farmer_id, 'negotiation_accepted', { contract_id: saved.id, negotiation_id: negotiationId });

    return saved;
  }

  async declineNegotiation(actorId: string, negotiationId: string): Promise<void> {
    const negotiation = await this.negotiationRepo.findOne({ where: { id: negotiationId } });
    if (!negotiation) throw new NotFoundException('Négociation introuvable');
    if (negotiation.status !== 'ACTIVE') throw new BadRequestException('Négociation déjà terminée');

    const isFarmer = actorId === negotiation.farmer_id;
    const isWorker = actorId === negotiation.worker_id;
    if (!isFarmer && !isWorker) throw new ForbiddenException('Accès refusé');

    negotiation.status = 'DECLINED';
    negotiation.closed_at = new Date();
    await this.negotiationRepo.save(negotiation);

    const notifyTarget = isFarmer ? negotiation.worker_id : negotiation.farmer_id;
    this.notificationGateway.sendToUser(notifyTarget, 'negotiation_declined', { negotiation_id: negotiationId });
  }

  async getNegotiation(negotiationId: string): Promise<any> {
    const negotiation = await this.negotiationRepo.findOne({ where: { id: negotiationId } });
    if (!negotiation) throw new NotFoundException('Négociation introuvable');
    const rounds = await this.roundRepo.find({ where: { negotiation_id: negotiationId }, order: { created_at: 'ASC' } });
    return { ...negotiation, rounds };
  }

  async getNegotiationsForUser(userId: string): Promise<MissionNegotiation[]> {
    return this.negotiationRepo.find({
      where: [{ farmer_id: userId }, { worker_id: userId }],
      order: { created_at: 'DESC' },
    });
  }
}
