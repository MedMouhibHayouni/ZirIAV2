import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DossiersService } from './dossiers.service';
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

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dossiers Institutionnels')
@ApiBearerAuth()
@Controller('dossiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  // ─── Farmer endpoints ────────────────────────────────────────────────────

  /** POST /dossiers — Farmer submits a new dossier */
  @Post()
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  createDossier(@Req() req: any, @Body() dto: CreateDossierDto) {
    return this.dossiersService.createDossier(req.user.id, dto);
  }

  /** GET /dossiers/mes-dossiers — Farmer views their own dossiers */
  @Get('mes-dossiers')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  getMyDossiers(@Req() req: any) {
    return this.dossiersService.getFarmerDossiers(req.user.id);
  }

  /** GET /dossiers/mes-dossiers/:id */
  @Get('mes-dossiers/:id')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  getMyDossier(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.dossiersService.getFarmerDossier(req.user.id, id);
  }

  /** POST /dossiers/:id/documents — Farmer uploads a document */
  @Post(':id/documents')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.INSTITUTION, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadDocument(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) dossierId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentName') documentName: string,
  ) {
    return this.dossiersService.uploadDocument(dossierId, req.user, file, documentName);
  }

  // ─── Institution endpoints ───────────────────────────────────────────────

  /** GET /dossiers/institution/:institutionId — Institution lists their dossiers */
  @Get('institution/:institutionId')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  getInstitutionDossiers(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Query('status') status: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.dossiersService.getInstitutionDossiers(institutionId, status, page, limit);
  }

  /** GET /dossiers/institution/:institutionId/kpis */
  @Get('institution/:institutionId/kpis')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  getInstitutionKpis(@Param('institutionId', ParseUUIDPipe) institutionId: string) {
    return this.dossiersService.getInstitutionKpis(institutionId);
  }

  /** PATCH /dossiers/:id/status */
  @Patch(':id/status')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  updateStatus(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDossierStatusDto,
  ) {
    return this.dossiersService.updateDossierStatus(id, req.user, dto);
  }

  /** PATCH /dossiers/:id/assign-agent */
  @Patch(':id/assign-agent')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  assignAgent(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAgentDto,
  ) {
    return this.dossiersService.assignAgent(id, req.user, dto);
  }

  /** PATCH /dossiers/:id/internal-note */
  @Patch(':id/internal-note')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  addNote(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddInternalNoteDto,
  ) {
    return this.dossiersService.addInternalNote(id, req.user, dto);
  }

  /** PATCH /dossiers/documents/:docId/review */
  @Patch('documents/:docId/review')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  reviewDocument(
    @Req() req: any,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.dossiersService.reviewDocument(docId, req.user, dto);
  }

  // ─── Sprint 4: Crédit, Échéances, Jalons & Visites ───────────────────────

  /** GET /dossiers/:id/credit */
  @Get(':id/credit')
  @Roles(Role.FARMER, Role.INSTITUTION, Role.ADMIN)
  getCreditDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.dossiersService.getCreditDetails(id);
  }

  /** POST /dossiers/credit */
  @Post('credit')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  createCreditDetails(@Body() dto: CreateCreditDetailsDto) {
    return this.dossiersService.createCreditDetails(dto);
  }

  /** PATCH /dossiers/credit/:creditId/status */
  @Patch('credit/:creditId/status')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  updateCreditStatus(@Param('creditId', ParseUUIDPipe) creditId: string, @Body() dto: UpdateCreditStatusDto) {
    return this.dossiersService.updateCreditStatus(creditId, dto.status);
  }

  /** POST /dossiers/credit/:creditId/disbursements */
  @Post('credit/:creditId/disbursements')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  recordDisbursement(
    @Req() req: any,
    @Param('creditId', ParseUUIDPipe) creditId: string,
    @Body() dto: RecordDisbursementDto,
  ) {
    return this.dossiersService.recordDisbursement(creditId, req.user.id, dto);
  }

  /** POST /dossiers/credit/:creditId/schedule */
  @Post('credit/:creditId/schedule')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  generateSchedule(
    @Param('creditId', ParseUUIDPipe) creditId: string,
    @Body() dto: GenerateScheduleDto,
  ) {
    return this.dossiersService.generateSchedule(creditId, dto);
  }

  /** POST /dossiers/installments/:installmentId/declare-payment (Farmer) */
  @Post('installments/:installmentId/declare-payment')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  declarePayment(
    @Req() req: any,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @Body() dto: DeclarePaymentDto,
  ) {
    return this.dossiersService.declarePayment(installmentId, req.user.id, dto);
  }

  /** PATCH /dossiers/installments/:installmentId/confirm-payment (Agent) */
  @Patch('installments/:installmentId/confirm-payment')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  confirmPayment(
    @Req() req: any,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
  ) {
    return this.dossiersService.confirmPayment(installmentId, req.user.id);
  }

  /** PATCH /dossiers/installments/:installmentId/reschedule */
  @Patch('installments/:installmentId/reschedule')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  proposeRescheduling(
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @Body() dto: ProposeReschedulingDto,
  ) {
    return this.dossiersService.proposeRescheduling(installmentId, dto);
  }

  /** GET /dossiers/:id/milestones */
  @Get(':id/milestones')
  @Roles(Role.FARMER, Role.INSTITUTION, Role.ADMIN)
  getMilestones(@Param('id', ParseUUIDPipe) id: string) {
    return this.dossiersService.getMilestones(id);
  }

  /** POST /dossiers/:id/milestones */
  @Post(':id/milestones')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  createMilestone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMilestoneDto) {
    return this.dossiersService.createMilestone(id, dto);
  }

  /** PATCH /dossiers/milestones/:milestoneId */
  @Patch('milestones/:milestoneId')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  updateMilestone(@Param('milestoneId', ParseUUIDPipe) milestoneId: string, @Body() dto: UpdateMilestoneDto) {
    return this.dossiersService.updateMilestone(milestoneId, dto);
  }

  /** GET /dossiers/:id/visits */
  @Get(':id/visits')
  @Roles(Role.FARMER, Role.INSTITUTION, Role.ADMIN)
  getFieldVisits(@Param('id', ParseUUIDPipe) id: string) {
    return this.dossiersService.getFieldVisits(id);
  }

  /** POST /dossiers/:id/visits */
  @Post(':id/visits')
  @Roles(Role.INSTITUTION, Role.ADMIN)
  createFieldVisit(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFieldVisitDto,
  ) {
    return this.dossiersService.createFieldVisit(id, req.user.id, dto);
  }
}
