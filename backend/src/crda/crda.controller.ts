import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CrdaService } from './crda.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import {
  AssignAgentDto,
  ResolveRequestDto,
} from './dto/create-service-request.dto';
import { CreateSubsidyProgramDto } from './dto/create-subsidy-program.dto';
import { ServiceRequestStatus } from './entities/crda-service-request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstitutionScopeGuard } from '../institutions/guards/institution-scope.guard';

/** All routes require a valid JWT and an active Institution membership. */
@Controller('crda')
@UseGuards(JwtAuthGuard, InstitutionScopeGuard)
export class CrdaController {
  constructor(private readonly crdaService: CrdaService) {}

  // ─── Helper ──────────────────────────────────────────────────────────────────
  private institutionId(req: any): string {
    return req.institutionScope?.institutionId ?? req.user?.institutionMember?.institutionId;
  }

  // ─── CAMPAIGNS ───────────────────────────────────────────────────────────────

  @Post('campaigns')
  createCampaign(@Request() req: any, @Body() dto: CreateCampaignDto) {
    return this.crdaService.createCampaign(this.institutionId(req), dto);
  }

  @Get('campaigns')
  listCampaigns(@Request() req: any) {
    return this.crdaService.listCampaigns(this.institutionId(req));
  }

  @Get('campaigns/:id')
  getCampaign(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crdaService.getCampaign(id, this.institutionId(req));
  }

  @Patch('campaigns/:id/activate')
  activateCampaign(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crdaService.activateCampaign(id, this.institutionId(req));
  }

  @Patch('campaigns/:id/close')
  closeCampaign(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crdaService.closeCampaign(id, this.institutionId(req));
  }

  @Post('campaigns/:id/enroll/:farmerId')
  enrollFarmer(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('farmerId', ParseUUIDPipe) farmerId: string,
  ) {
    return this.crdaService.enrollFarmer(id, farmerId, this.institutionId(req));
  }

  @Patch('enrollments/:id/complete')
  markEnrollmentComplete(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { proofUrl?: string; notes?: string },
  ) {
    return this.crdaService.markEnrollmentComplete(id, this.institutionId(req), body.proofUrl, body.notes);
  }

  // ─── SERVICE REQUESTS ────────────────────────────────────────────────────────

  @Get('service-requests')
  listServiceRequests(
    @Request() req: any,
    @Query('status') status?: ServiceRequestStatus,
  ) {
    return this.crdaService.listServiceRequests(this.institutionId(req), status);
  }

  @Get('service-requests/kpis')
  serviceRequestKpis(@Request() req: any) {
    return this.crdaService.serviceRequestKpis(this.institutionId(req));
  }

  @Get('service-requests/:id')
  getServiceRequest(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crdaService.getServiceRequest(id, this.institutionId(req));
  }

  @Patch('service-requests/:id/assign')
  assignAgent(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAgentDto,
  ) {
    return this.crdaService.assignAgent(id, this.institutionId(req), dto);
  }

  @Patch('service-requests/:id/progress')
  progressRequest(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crdaService.progressRequest(id, this.institutionId(req));
  }

  @Patch('service-requests/:id/resolve')
  resolveRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRequestDto,
  ) {
    return this.crdaService.resolveRequest(id, this.institutionId(req), dto);
  }

  @Patch('service-requests/:id/reject')
  rejectRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    return this.crdaService.rejectRequest(id, this.institutionId(req), body.reason);
  }

  // ─── SUBSIDY PROGRAMS ─────────────────────────────────────────────────────────

  @Post('subsidy-programs')
  createSubsidyProgram(@Request() req: any, @Body() dto: CreateSubsidyProgramDto) {
    return this.crdaService.createSubsidyProgram(this.institutionId(req), dto);
  }

  @Get('subsidy-programs')
  listSubsidyPrograms(@Request() req: any) {
    return this.crdaService.listSubsidyPrograms(this.institutionId(req));
  }

  @Get('subsidy-programs/kpis')
  subsidyProgramKpis(@Request() req: any) {
    return this.crdaService.subsidyProgramKpis(this.institutionId(req));
  }

  @Patch('subsidy-applications/:id/approve')
  approveSubsidyApplication(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { grantedAmountTnd: number },
  ) {
    return this.crdaService.approveSubsidyApplication(id, this.institutionId(req), body.grantedAmountTnd);
  }

  @Patch('subsidy-applications/:id/reject')
  rejectSubsidyApplication(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    return this.crdaService.rejectSubsidyApplication(id, this.institutionId(req), body.reason);
  }
}
