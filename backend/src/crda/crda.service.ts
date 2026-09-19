import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CrdaCampaign, CampaignStatus } from './entities/crda-campaign.entity';
import { CrdaCampaignEnrollment, EnrollmentStatus } from './entities/crda-campaign-enrollment.entity';
import { CrdaServiceRequest, ServiceRequestStatus } from './entities/crda-service-request.entity';
import { SubsidyProgram } from './entities/subsidy-program.entity';
import { SubsidyApplication } from './entities/subsidy-application.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import {
  AssignAgentDto,
  ResolveRequestDto,
} from './dto/create-service-request.dto';
import { CreateSubsidyProgramDto, ApplySubsidyDto } from './dto/create-subsidy-program.dto';

@Injectable()
export class CrdaService {
  constructor(
    @InjectRepository(CrdaCampaign)
    private campaignRepo: Repository<CrdaCampaign>,
    @InjectRepository(CrdaCampaignEnrollment)
    private enrollmentRepo: Repository<CrdaCampaignEnrollment>,
    @InjectRepository(CrdaServiceRequest)
    private serviceRequestRepo: Repository<CrdaServiceRequest>,
    @InjectRepository(SubsidyProgram)
    private subsidyProgramRepo: Repository<SubsidyProgram>,
    @InjectRepository(SubsidyApplication)
    private subsidyApplicationRepo: Repository<SubsidyApplication>,
    private dataSource: DataSource,
  ) {}

  // ─── CAMPAIGNS ───────────────────────────────────────────────────────────────

  async createCampaign(institutionId: string, dto: CreateCampaignDto): Promise<CrdaCampaign> {
    const campaign = this.campaignRepo.create({
      institutionId,
      title: dto.title,
      type: dto.type,
      description: dto.description ?? null,
      targetCropOrLivestock: dto.targetCropOrLivestock,
      startDate: dto.startDate,
      endDate: dto.endDate,
      targetDelegations: dto.targetDelegations,
      targetParticipantsCount: dto.targetParticipantsCount ?? 0,
      status: CampaignStatus.PLANNED,
    });
    return this.campaignRepo.save(campaign);
  }

  async listCampaigns(institutionId: string): Promise<CrdaCampaign[]> {
    return this.campaignRepo.find({
      where: { institutionId },
      relations: ['enrollments'],
      order: { startDate: 'DESC' },
    });
  }

  async getCampaign(id: string, institutionId: string): Promise<CrdaCampaign> {
    const c = await this.campaignRepo.findOne({
      where: { id, institutionId },
      relations: ['enrollments', 'enrollments.farmer'],
    });
    if (!c) throw new NotFoundException('Campagne introuvable');
    return c;
  }

  async activateCampaign(id: string, institutionId: string): Promise<CrdaCampaign> {
    const c = await this.getCampaign(id, institutionId);
    if (c.status !== CampaignStatus.PLANNED)
      throw new BadRequestException('Seules les campagnes planifiées peuvent être activées');
    c.status = CampaignStatus.ACTIVE;
    return this.campaignRepo.save(c);
  }

  async closeCampaign(id: string, institutionId: string): Promise<CrdaCampaign> {
    const c = await this.getCampaign(id, institutionId);
    if (c.status === CampaignStatus.CANCELLED || c.status === CampaignStatus.COMPLETED)
      throw new BadRequestException('Campagne déjà terminée');
    c.status = CampaignStatus.COMPLETED;
    return this.campaignRepo.save(c);
  }

  async enrollFarmer(campaignId: string, farmerId: string, institutionId: string): Promise<CrdaCampaignEnrollment> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId, institutionId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    if (campaign.status !== CampaignStatus.ACTIVE)
      throw new BadRequestException('Les inscriptions ne sont ouvertes que pour les campagnes actives');

    const existing = await this.enrollmentRepo.findOne({ where: { campaignId, farmerId } });
    if (existing) throw new BadRequestException("L'agriculteur est déjà inscrit à cette campagne");

    const enrollment = this.enrollmentRepo.create({
      campaignId,
      farmerId,
      status: EnrollmentStatus.OPTED_IN,
    });
    return this.enrollmentRepo.save(enrollment);
  }

  async markEnrollmentComplete(
    enrollmentId: string,
    institutionId: string,
    proofUrl?: string,
    notes?: string,
  ): Promise<CrdaCampaignEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId },
      relations: ['campaign'],
    });
    if (!enrollment) throw new NotFoundException('Inscription introuvable');
    if (enrollment.campaign.institutionId !== institutionId)
      throw new ForbiddenException('Accès refusé');
    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.completedAt = new Date();
    enrollment.completionProofUrl = proofUrl ?? null;
    enrollment.notes = notes ?? null;
    return this.enrollmentRepo.save(enrollment);
  }

  // ─── SERVICE REQUESTS ────────────────────────────────────────────────────────

  async listServiceRequests(institutionId: string, status?: ServiceRequestStatus): Promise<CrdaServiceRequest[]> {
    const qb = this.serviceRequestRepo.createQueryBuilder('sr')
      .leftJoinAndSelect('sr.farmer', 'farmer')
      .leftJoinAndSelect('sr.assignedAgent', 'agent')
      .where('sr.institutionId = :institutionId', { institutionId })
      .orderBy('sr.createdAt', 'DESC');
    if (status) qb.andWhere('sr.status = :status', { status });
    return qb.getMany();
  }

  async getServiceRequest(id: string, institutionId: string): Promise<CrdaServiceRequest> {
    const sr = await this.serviceRequestRepo.findOne({
      where: { id, institutionId },
      relations: ['farmer', 'assignedAgent'],
    });
    if (!sr) throw new NotFoundException('Demande introuvable');
    return sr;
  }

  async assignAgent(id: string, institutionId: string, dto: AssignAgentDto): Promise<CrdaServiceRequest> {
    const sr = await this.getServiceRequest(id, institutionId);
    if (sr.status !== ServiceRequestStatus.RECEIVED && sr.status !== ServiceRequestStatus.ASSIGNED)
      throw new BadRequestException('Statut incompatible avec une assignation');
    sr.assignedAgentId = dto.agentId;
    sr.status = ServiceRequestStatus.ASSIGNED;
    return this.serviceRequestRepo.save(sr);
  }

  async progressRequest(id: string, institutionId: string): Promise<CrdaServiceRequest> {
    const sr = await this.getServiceRequest(id, institutionId);
    if (sr.status !== ServiceRequestStatus.ASSIGNED)
      throw new BadRequestException('La demande doit être assignée avant de passer en cours');
    sr.status = ServiceRequestStatus.IN_PROGRESS;
    return this.serviceRequestRepo.save(sr);
  }

  async resolveRequest(id: string, institutionId: string, dto: ResolveRequestDto): Promise<CrdaServiceRequest> {
    const sr = await this.getServiceRequest(id, institutionId);
    if (sr.status === ServiceRequestStatus.RESOLVED || sr.status === ServiceRequestStatus.REJECTED)
      throw new BadRequestException('Demande déjà traitée');
    sr.status = ServiceRequestStatus.RESOLVED;
    sr.agentResolutionReport = dto.resolutionReport;
    return this.serviceRequestRepo.save(sr);
  }

  async rejectRequest(id: string, institutionId: string, reason: string): Promise<CrdaServiceRequest> {
    const sr = await this.getServiceRequest(id, institutionId);
    if (sr.status === ServiceRequestStatus.RESOLVED || sr.status === ServiceRequestStatus.REJECTED)
      throw new BadRequestException('Demande déjà traitée');
    sr.status = ServiceRequestStatus.REJECTED;
    sr.agentResolutionReport = reason;
    return this.serviceRequestRepo.save(sr);
  }

  async serviceRequestKpis(institutionId: string) {
    const rows = await this.serviceRequestRepo
      .createQueryBuilder('sr')
      .select('sr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('sr.institutionId = :institutionId', { institutionId })
      .groupBy('sr.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byStatus[r.status] = Number(r.count);
      total += Number(r.count);
    }
    const resolved = byStatus[ServiceRequestStatus.RESOLVED] ?? 0;
    const rejected = byStatus[ServiceRequestStatus.REJECTED] ?? 0;
    const pending = (byStatus[ServiceRequestStatus.RECEIVED] ?? 0) + (byStatus[ServiceRequestStatus.ASSIGNED] ?? 0);

    return {
      total,
      byStatus,
      pending,
      resolved,
      rejected,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }

  // ─── SUBSIDY PROGRAMS ─────────────────────────────────────────────────────────

  async createSubsidyProgram(institutionId: string, dto: CreateSubsidyProgramDto): Promise<SubsidyProgram> {
    const program = this.subsidyProgramRepo.create({
      institutionId,
      name: dto.name,
      criteria: dto.criteria,
      totalBudgetTnd: dto.totalBudgetTnd,
      allocatedBudgetTnd: 0,
      applicationWindowStart: dto.applicationWindowStart,
      applicationWindowEnd: dto.applicationWindowEnd,
      isOpen: true,
      beneficiariesPublished: false,
    });
    return this.subsidyProgramRepo.save(program);
  }

  async listSubsidyPrograms(institutionId: string): Promise<SubsidyProgram[]> {
    return this.subsidyProgramRepo.find({
      where: { institutionId },
      order: { applicationWindowStart: 'DESC' },
    });
  }

  async applyForSubsidy(
    programId: string,
    farmerId: string,
    dto: ApplySubsidyDto,
  ): Promise<SubsidyApplication> {
    const program = await this.subsidyProgramRepo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Programme introuvable');
    if (!program.isOpen) throw new BadRequestException('Le programme est fermé');

    const existing = await this.subsidyApplicationRepo.findOne({ where: { programId, farmerId } });
    if (existing) throw new BadRequestException("Vous avez déjà soumis une demande pour ce programme");

    const application = this.subsidyApplicationRepo.create({
      programId,
      farmerId,
      justification: dto.justification,
      requestedAmountTnd: dto.requestedAmountTnd,
      status: 'PENDING',
    });
    return this.subsidyApplicationRepo.save(application);
  }

  async approveSubsidyApplication(appId: string, institutionId: string, grantedAmount: number): Promise<SubsidyApplication> {
    const app = await this.subsidyApplicationRepo.findOne({
      where: { id: appId },
      relations: ['program'],
    });
    if (!app) throw new NotFoundException('Demande introuvable');
    if (app.program.institutionId !== institutionId) throw new ForbiddenException();

    const remaining = app.program.totalBudgetTnd - app.program.allocatedBudgetTnd;
    if (grantedAmount > remaining)
      throw new BadRequestException(`Budget insuffisant. Disponible: ${remaining.toFixed(3)} TND`);

    await this.dataSource.transaction(async (em) => {
      app.status = 'APPROVED';
      app.grantedAmountTnd = grantedAmount;
      app.decidedAt = new Date();
      await em.save(app);
      await em.increment(SubsidyProgram, { id: app.programId }, 'allocatedBudgetTnd', grantedAmount);
    });
    return app;
  }

  async rejectSubsidyApplication(appId: string, institutionId: string, reason: string): Promise<SubsidyApplication> {
    const app = await this.subsidyApplicationRepo.findOne({
      where: { id: appId },
      relations: ['program'],
    });
    if (!app) throw new NotFoundException('Demande introuvable');
    if (app.program.institutionId !== institutionId) throw new ForbiddenException();
    app.status = 'REJECTED';
    app.rejectionReason = reason;
    app.decidedAt = new Date();
    return this.subsidyApplicationRepo.save(app);
  }

  async subsidyProgramKpis(institutionId: string) {
    const programs = await this.subsidyProgramRepo.find({ where: { institutionId } });
    const totalBudget = programs.reduce((s, p) => s + Number(p.totalBudgetTnd), 0);
    const allocated = programs.reduce((s, p) => s + Number(p.allocatedBudgetTnd), 0);

    const appCount = await this.subsidyApplicationRepo
      .createQueryBuilder('a')
      .innerJoin('a.program', 'p', 'p.institutionId = :institutionId', { institutionId })
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    let totalApps = 0;
    for (const r of appCount) {
      byStatus[r.status] = Number(r.count);
      totalApps += Number(r.count);
    }

    return {
      totalPrograms: programs.length,
      openPrograms: programs.filter(p => p.isOpen).length,
      totalBudgetTnd: totalBudget,
      allocatedBudgetTnd: allocated,
      remainingBudgetTnd: totalBudget - allocated,
      utilizationRate: totalBudget > 0 ? Math.round((allocated / totalBudget) * 100) : 0,
      totalApplications: totalApps,
      applicationsByStatus: byStatus,
    };
  }
}
