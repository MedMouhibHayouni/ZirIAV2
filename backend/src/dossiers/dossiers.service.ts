import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InstitutionDossier, DossierType, InvestmentStatus } from './entities/dossier.entity';
import { DossierDocument, DocumentReviewStatus } from './entities/dossier-document.entity';
import { DossierStatusHistory } from './entities/dossier-status-history.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { User } from '../users/entities/user.entity';
import { UploadService } from '../upload/upload.service';
import { CreditDetails, CreditStatus } from './entities/credit-details.entity';
import { CreditDisbursement } from './entities/credit-disbursement.entity';
import { RepaymentInstallment, InstallmentStatus } from './entities/repayment-installment.entity';
import { ProjectMilestone, MilestoneStatus } from './entities/project-milestone.entity';
import { FieldVisit } from './entities/field-visit.entity';
import {
  CreateDossierDto,
  UpdateDossierStatusDto,
  ReviewDocumentDto,
  AssignAgentDto,
  AddInternalNoteDto,
  CreateCreditDetailsDto,
  UpdateCreditStatusDto,
  RecordDisbursementDto,
  GenerateScheduleDto,
  DeclarePaymentDto,
  ConfirmPaymentDto,
  ProposeReschedulingDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateFieldVisitDto,
} from './dto/dossier.dto';
import { Role } from '../common/enums/role.enum';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DossiersService {
  constructor(
    @InjectRepository(InstitutionDossier)
    private readonly dossierRepo: Repository<InstitutionDossier>,
    @InjectRepository(DossierDocument)
    private readonly docRepo: Repository<DossierDocument>,
    @InjectRepository(DossierStatusHistory)
    private readonly historyRepo: Repository<DossierStatusHistory>,
    @InjectRepository(CreditDetails)
    private readonly creditRepo: Repository<CreditDetails>,
    @InjectRepository(CreditDisbursement)
    private readonly disbursementRepo: Repository<CreditDisbursement>,
    @InjectRepository(RepaymentInstallment)
    private readonly installmentRepo: Repository<RepaymentInstallment>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(FieldVisit)
    private readonly visitRepo: Repository<FieldVisit>,
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly uploadService: UploadService,
    private readonly dataSource: DataSource,
  ) {}

  /** Generate a unique reference number e.g. APIA-2026-000123 */
  private async generateReferenceNumber(type: DossierType): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = type === DossierType.INVESTMENT || type === DossierType.CREDIT ? 'APIA' : 'CRDA';
    const count = await this.dossierRepo.count();
    return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /** Farmer: create a new dossier (DRAFT → SUBMITTED) */
  async createDossier(farmerId: string, dto: CreateDossierDto): Promise<InstitutionDossier> {
    const institution = await this.institutionRepo.findOne({ where: { id: dto.institutionId } });
    if (!institution) throw new NotFoundException('Institution introuvable');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const referenceNumber = await this.generateReferenceNumber(dto.type);

      const dossier = queryRunner.manager.create(InstitutionDossier, {
        farmerId,
        institutionId: dto.institutionId,
        type: dto.type,
        programName: dto.programName,
        requestedAmountTnd: dto.requestedAmountTnd,
        projectSummary: dto.projectSummary || null,
        referenceNumber,
        status: InvestmentStatus.SUBMITTED,
      });

      const saved = await queryRunner.manager.save(InstitutionDossier, dossier);

      // Log initial status history
      const history = queryRunner.manager.create(DossierStatusHistory, {
        dossierId: saved.id,
        previousStatus: null,
        newStatus: InvestmentStatus.SUBMITTED,
        changedByUserId: farmerId,
        reason: 'Dossier soumis par l\'agriculteur',
      });
      await queryRunner.manager.save(DossierStatusHistory, history);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** Farmer: view their own dossiers */
  async getFarmerDossiers(farmerId: string): Promise<InstitutionDossier[]> {
    return this.dossierRepo.find({
      where: { farmerId },
      relations: ['institution', 'documents', 'statusHistory'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Farmer: get single dossier */
  async getFarmerDossier(farmerId: string, dossierId: string): Promise<InstitutionDossier> {
    const dossier = await this.dossierRepo.findOne({
      where: { id: dossierId, farmerId },
      relations: ['institution', 'documents', 'statusHistory', 'statusHistory.changedByUser', 'assignedAgent'],
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable');
    return dossier;
  }

  /** Institution: list dossiers for the institution (scoped to institutionId) */
  async getInstitutionDossiers(
    institutionId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: InstitutionDossier[]; total: number }> {
    const qb = this.dossierRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.farmer', 'farmer')
      .leftJoinAndSelect('d.assignedAgent', 'agent')
      .leftJoinAndSelect('d.documents', 'docs')
      .where('d.institutionId = :institutionId', { institutionId })
      .orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('d.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Institution agent: update dossier status with audit trail */
  async updateDossierStatus(
    dossierId: string,
    actorUser: any,
    dto: UpdateDossierStatusDto,
  ): Promise<InstitutionDossier> {
    const dossier = await this.dossierRepo.findOne({
      where: { id: dossierId },
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    // Ensure institution member can only update dossiers from their institution
    if (actorUser.role === Role.INSTITUTION) {
      const member = actorUser.institutionMember;
      if (!member || member.institutionId !== dossier.institutionId) {
        throw new ForbiddenException('Accès refusé : dossier hors de votre périmètre');
      }
    }

    const previousStatus = dossier.status;
    dossier.status = dto.status;
    if (dto.approvedAmountTnd !== undefined) {
      dossier.approvedAmountTnd = dto.approvedAmountTnd;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(InstitutionDossier, dossier);

      const history = queryRunner.manager.create(DossierStatusHistory, {
        dossierId: dossier.id,
        previousStatus,
        newStatus: dto.status,
        changedByUserId: actorUser.id,
        reason: dto.note || null,
      });
      await queryRunner.manager.save(DossierStatusHistory, history);

      await queryRunner.commitTransaction();
      return dossier;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /** Institution agent: assign an agent to a dossier */
  async assignAgent(dossierId: string, actorUser: any, dto: AssignAgentDto): Promise<InstitutionDossier> {
    const dossier = await this.dossierRepo.findOne({ where: { id: dossierId } });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    if (actorUser.role === Role.INSTITUTION) {
      const member = actorUser.institutionMember;
      if (!member || member.institutionId !== dossier.institutionId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const agent = await this.userRepo.findOne({ where: { id: dto.agentId } });
    if (!agent) throw new NotFoundException('Agent introuvable');

    dossier.assignedAgentId = dto.agentId;
    return this.dossierRepo.save(dossier);
  }

  /** Institution agent: add internal note */
  async addInternalNote(dossierId: string, actorUser: any, dto: AddInternalNoteDto): Promise<InstitutionDossier> {
    const dossier = await this.dossierRepo.findOne({ where: { id: dossierId } });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    if (actorUser.role === Role.INSTITUTION) {
      const member = actorUser.institutionMember;
      if (!member || member.institutionId !== dossier.institutionId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    dossier.internalAgentNotes = dto.note;
    return this.dossierRepo.save(dossier);
  }

  /** Upload and attach document to dossier */
  async uploadDocument(
    dossierId: string,
    actorUser: any,
    file: Express.Multer.File,
    documentName: string,
  ): Promise<DossierDocument> {
    const dossier = await this.dossierRepo.findOne({ where: { id: dossierId } });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    // Farmer can only upload to their own dossier, institution to their scope
    if (actorUser.role === Role.FARMER && dossier.farmerId !== actorUser.id) {
      throw new ForbiddenException('Accès refusé');
    }
    if (actorUser.role === Role.INSTITUTION) {
      const member = actorUser.institutionMember;
      if (!member || member.institutionId !== dossier.institutionId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const fileUrl = await this.uploadService.uploadImage(file, 'ziria/dossiers');
    const ext = file.originalname.split('.').pop()?.toUpperCase() || 'PDF';

    const doc = this.docRepo.create({
      dossierId,
      documentName: documentName || file.originalname,
      documentType: ext,
      fileUrl,
      reviewStatus: DocumentReviewStatus.PENDING,
    });

    return this.docRepo.save(doc);
  }

  /** Institution agent: review a document */
  async reviewDocument(
    docId: string,
    actorUser: any,
    dto: ReviewDocumentDto,
  ): Promise<DossierDocument> {
    const doc = await this.docRepo.findOne({
      where: { id: docId },
      relations: ['dossier'],
    });
    if (!doc) throw new NotFoundException('Document introuvable');

    if (actorUser.role === Role.INSTITUTION) {
      const member = actorUser.institutionMember;
      if (!member || member.institutionId !== doc.dossier.institutionId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    if (dto.reviewStatus === DocumentReviewStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est requis');
    }

    doc.reviewStatus = dto.reviewStatus;
    doc.rejectionReason = dto.rejectionReason || null;
    return this.docRepo.save(doc);
  }

  /** Institution dashboard: aggregated KPIs */
  async getInstitutionKpis(institutionId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    pendingReview: number;
    approved: number;
    rejectionRate: number;
  }> {
    const rows = await this.dossierRepo
      .createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('d.institutionId = :institutionId', { institutionId })
      .groupBy('d.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    }

    const approved = byStatus[InvestmentStatus.APPROVED] || 0;
    const rejected = byStatus[InvestmentStatus.REJECTED] || 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const pendingReview = byStatus[InvestmentStatus.UNDER_REVIEW] || 0;

    return { total, byStatus, pendingReview, approved, rejectionRate };
  }

  // ─── Sprint 4: Crédit & Financement ───────────────────────────────────────

  /** Get credit details by dossier ID */
  async getCreditDetails(dossierId: string): Promise<CreditDetails> {
    const credit = await this.creditRepo.findOne({
      where: { dossierId },
      relations: ['disbursements', 'installments', 'dossier'],
      order: {
        installments: { installmentNumber: 'ASC' },
        disbursements: { disbursementDate: 'ASC' },
      },
    });
    if (!credit) throw new NotFoundException('Détails de crédit introuvables');
    return credit;
  }

  /** Create or initialize credit details for a CREDIT dossier */
  async createCreditDetails(dto: CreateCreditDetailsDto): Promise<CreditDetails> {
    const dossier = await this.dossierRepo.findOne({ where: { id: dto.dossierId } });
    if (!dossier) throw new NotFoundException('Dossier introuvable');

    const credit = this.creditRepo.create({
      ...dto,
      status: CreditStatus.PREPARATION,
    });
    return await this.creditRepo.save(credit);
  }

  /** Update credit status (e.g. SUBMITTED_TO_BANK, BANK_APPROVED, DISBURSED) */
  async updateCreditStatus(creditId: string, status: CreditStatus): Promise<CreditDetails> {
    const credit = await this.creditRepo.findOne({ where: { id: creditId } });
    if (!credit) throw new NotFoundException('Crédit introuvable');
    credit.status = status;
    return await this.creditRepo.save(credit);
  }

  /** Record a disbursement */
  async recordDisbursement(creditId: string, actorUserId: string, dto: RecordDisbursementDto): Promise<CreditDisbursement> {
    const credit = await this.creditRepo.findOne({ where: { id: creditId } });
    if (!credit) throw new NotFoundException('Crédit introuvable');

    const disbursement = this.disbursementRepo.create({
      creditDetailsId: creditId,
      amountTnd: dto.amountTnd,
      disbursementDate: new Date(dto.disbursementDate),
      transactionReference: dto.transactionReference || null,
      notes: dto.notes || null,
      recordedByUserId: actorUserId,
    });
    const saved = await this.disbursementRepo.save(disbursement);

    // Auto-advance credit status to DISBURSED/REPAYMENT if not already
    if (credit.status !== CreditStatus.REPAYMENT) {
      credit.status = CreditStatus.DISBURSED;
      await this.creditRepo.save(credit);
    }

    return saved;
  }

  /** Generate repayment schedule */
  async generateSchedule(creditId: string, dto: GenerateScheduleDto): Promise<RepaymentInstallment[]> {
    const credit = await this.creditRepo.findOne({ where: { id: creditId } });
    if (!credit) throw new NotFoundException('Crédit introuvable');

    // Remove existing installments if any in preparation
    await this.installmentRepo.delete({ creditDetailsId: creditId });

    const totalAmount = Number(credit.approvedAmountTnd || credit.requestedAmountTnd);
    const count = dto.installmentsCount;
    const installmentAmount = Math.round((totalAmount / count) * 1000) / 1000;
    const firstDate = new Date(dto.firstDueDate);

    const installments: RepaymentInstallment[] = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(firstDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const installment = this.installmentRepo.create({
        creditDetailsId: creditId,
        installmentNumber: i,
        dueDate,
        amountTnd: installmentAmount,
        principalTnd: installmentAmount,
        interestTnd: 0.000,
        status: InstallmentStatus.PENDING,
      });
      installments.push(installment);
    }

    const saved = await this.installmentRepo.save(installments);
    credit.status = CreditStatus.REPAYMENT;
    await this.creditRepo.save(credit);
    return saved;
  }

  /** Farmer declares repayment payment with proof photo */
  async declarePayment(installmentId: string, farmerId: string, dto: DeclarePaymentDto): Promise<RepaymentInstallment> {
    const installment = await this.installmentRepo.findOne({
      where: { id: installmentId },
      relations: ['creditDetails', 'creditDetails.dossier'],
    });
    if (!installment) throw new NotFoundException('Échéance introuvable');
    if (installment.creditDetails?.dossier?.farmerId !== farmerId) {
      throw new ForbiddenException('Seul l\'agriculteur titulaire peut déclarer le paiement');
    }

    installment.status = InstallmentStatus.PAID_DECLARED;
    installment.paymentProofUrl = dto.paymentProofUrl;
    installment.farmerDeclarationNote = dto.farmerDeclarationNote || null;
    installment.declaredPaidAt = new Date();
    return await this.installmentRepo.save(installment);
  }

  /** Institution agent confirms payment declaration */
  async confirmPayment(installmentId: string, agentUserId: string): Promise<RepaymentInstallment> {
    const installment = await this.installmentRepo.findOne({ where: { id: installmentId } });
    if (!installment) throw new NotFoundException('Échéance introuvable');

    installment.status = InstallmentStatus.PAID_CONFIRMED;
    installment.confirmedPaidAt = new Date();
    installment.confirmedByUserId = agentUserId;
    return await this.installmentRepo.save(installment);
  }

  /** Propose rescheduling of installment */
  async proposeRescheduling(installmentId: string, dto: ProposeReschedulingDto): Promise<RepaymentInstallment> {
    const installment = await this.installmentRepo.findOne({ where: { id: installmentId } });
    if (!installment) throw new NotFoundException('Échéance introuvable');

    installment.status = InstallmentStatus.RESCHEDULED;
    installment.rescheduledNewDueDate = new Date(dto.newDueDate);
    installment.reschedulingProposalNote = dto.proposalNote;
    return await this.installmentRepo.save(installment);
  }

  /** Idempotent daily scheduled job for LATE detection */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRepaymentJob(): Promise<{ markedLateCount: number }> {
    const now = new Date();
    const result = await this.installmentRepo
      .createQueryBuilder()
      .update(RepaymentInstallment)
      .set({ status: InstallmentStatus.LATE })
      .where('dueDate < :now', { now })
      .andWhere('status = :pending', { pending: InstallmentStatus.PENDING })
      .execute();

    return { markedLateCount: result.affected || 0 };
  }

  // ─── Sprint 4: Suivi des Projets (Milestones & Field Visits) ────────────────

  /** List milestones for a dossier */
  async getMilestones(dossierId: string): Promise<ProjectMilestone[]> {
    return await this.milestoneRepo.find({
      where: { dossierId },
      order: { targetDate: 'ASC' },
    });
  }

  /** Create project milestone */
  async createMilestone(dossierId: string, dto: CreateMilestoneDto): Promise<ProjectMilestone> {
    const milestone = this.milestoneRepo.create({
      dossierId,
      title: dto.title,
      description: dto.description || null,
      targetDate: dto.targetDate,
      status: MilestoneStatus.ON_TRACK,
    });
    return await this.milestoneRepo.save(milestone);
  }

  /** Update project milestone */
  async updateMilestone(milestoneId: string, dto: UpdateMilestoneDto): Promise<ProjectMilestone> {
    const milestone = await this.milestoneRepo.findOne({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Jalon introuvable');

    if (dto.status) milestone.status = dto.status;
    if (dto.actualDate) milestone.actualDate = dto.actualDate;
    return await this.milestoneRepo.save(milestone);
  }

  /** List field visits for a dossier */
  async getFieldVisits(dossierId: string): Promise<FieldVisit[]> {
    return await this.visitRepo.find({
      where: { dossierId },
      relations: ['agent'],
      order: { visitDate: 'DESC' },
    });
  }

  /** Log a field visit */
  async createFieldVisit(dossierId: string, agentId: string, dto: CreateFieldVisitDto): Promise<FieldVisit> {
    const visit = this.visitRepo.create({
      dossierId,
      agentId,
      visitDate: new Date(dto.visitDate),
      gpsLatitude: dto.gpsLatitude || null,
      gpsLongitude: dto.gpsLongitude || null,
      reportText: dto.reportText,
      photoUrls: dto.photoUrls || [],
      outcome: dto.outcome || 'CONFORME',
    });
    return await this.visitRepo.save(visit);
  }
}
