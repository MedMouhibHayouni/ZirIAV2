import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkersService } from './workers.service';
import { WorkerProfile } from './entities/worker-profile.entity';
import { JobOfferStatus } from './entities/job-offer.entity';
import { ApplicationStatus } from './entities/job-application.entity';

@ApiTags('Workers & AgriJobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkersController {
  private readonly logger = new Logger(WorkersController.name);
  constructor(private readonly workersService: WorkersService) {}

  // ─── PROFILS ──────────────────────────────────────────────────────────────

  @Post('workers/profile')
  @ApiOperation({ summary: 'Créer ou mettre à jour son profil travailleur' })
  upsertProfile(@Request() req, @Body() dto: Partial<WorkerProfile>) {
    console.log('[DEBUG] POST workers/profile called with:', JSON.stringify(dto));
    return this.workersService.upsertProfile(req.user.id, dto);
  }

  @Patch('workers/profile/my')
  @ApiOperation({ summary: 'Mettre à jour partiellement son profil travailleur' })
  patchMyProfile(@Request() req, @Body() dto: Partial<WorkerProfile>) {
    console.log('[DEBUG] PATCH workers/profile/my called with:', JSON.stringify(dto));
    return this.workersService.upsertProfile(req.user.id, dto);
  }

  @Put('workers/profile/my')
  @ApiOperation({ summary: 'Mettre à jour son profil travailleur' })
  putMyProfile(@Request() req, @Body() dto: Partial<WorkerProfile>) {
    console.log('[DEBUG] PUT workers/profile/my called with:', JSON.stringify(dto));
    return this.workersService.upsertProfile(req.user.id, dto);
  }

  @Get('workers/profile/me')
  @ApiOperation({ summary: 'Récupérer son propre profil travailleur' })
  getMyProfile(@Request() req) {
    console.log('[DEBUG] GET workers/profile/me called for user:', req.user.id);
    return this.workersService.findMyProfile(req.user.id);
  }

  @Get('workers')
  @ApiOperation({ summary: 'Lister les travailleurs disponibles' })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'skill', required: false })
  findAll(@Query('governorate') governorate?: string, @Query('skill') skill?: string) {
    return this.workersService.findAvailableWorkers(governorate, skill);
  }

  // ─── OFFRES D'EMPLOI ──────────────────────────────────────────────────────

  @Post('workers/job-offers')
  @ApiOperation({ summary: "Publier une offre d'emploi saisonnier" })
  createOffer(@Request() req, @Body() dto: any) {
    return this.workersService.createJobOffer(req.user.id, dto);
  }

  @Get('workers/job-offers')
  @ApiOperation({ summary: "Rechercher des offres d'emploi (PostGIS ou standard)" })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number, description: 'Rayon en km (défaut 30)' })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'task_type', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findOffers(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radius_km') radiusKm?: number,
    @Query('governorate') governorate?: string,
    @Query('task_type') taskType?: string,
    @Query('from') fromDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (lat !== undefined && lng !== undefined) {
      return this.workersService.findJobOffersNearLocation(lat, lng, radiusKm || 30);
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.workersService.findJobOffers(governorate, taskType, fromDate, pageNum, limitNum);
  }

  @Get('workers/job-offers/mine')
  @ApiOperation({ summary: "Mes offres d'emploi publiées (vue employeur)" })
  getMyOffers(@Request() req) {
    const userId = req.user.id || req.user.sub;
    this.logger.log(`[Workers] Fetching jobs for employer: ${userId}`);
    return this.workersService.getMyJobOffers(userId);
  }

  @Get('workers/job-offers/my-offers-with-applications')
  @ApiOperation({ summary: "Mes offres avec candidatures intégrées (vue employeur HR)" })
  getMyOffersWithApplications(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.workersService.getMyOffersWithApplications(userId);
  }

  @Get('workers/job-offers/:id')
  @ApiOperation({ summary: "Détail d'une offre d'emploi" })
  findOffer(@Param('id', ParseUUIDPipe) id: string) {
    return this.workersService.findJobOfferById(id);
  }

  @Get('workers/job-offers/:id/applications')
  @ApiOperation({ summary: "Voir les candidatures reçues (employeur uniquement)" })
  getApplicationsForOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.workersService.getApplicationsForOffer(id, req.user.id);
  }



  @Patch('workers/job-offers/:id')
  @ApiOperation({ summary: "Modifier une offre d'emploi existante" })
  updateJobOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: any,
  ) {
    return this.workersService.updateJobOffer(id, req.user.id || req.user.sub, dto);
  }

  @Patch('workers/job-offers/:id/status')
  @ApiOperation({ summary: "Mettre à jour le statut d'une offre" })
  updateOfferStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('status') status: JobOfferStatus,
  ) {
    return this.workersService.updateJobOfferStatus(id, req.user.id, status);
  }

  @Delete('workers/job-offers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer (annuler) une offre d'emploi OPEN (employeur uniquement)" })
  deleteJobOffer(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.workersService.deleteJobOffer(id, req.user.id || req.user.sub);
  }

  // ─── CANDIDATURES ─────────────────────────────────────────────────────────

  @Post('workers/job-offers/:id/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Postuler à une offre d'emploi" })
  apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: { cover_message?: string; proposed_daily_rate_tnd?: number },
  ) {
    return this.workersService.applyToJob(req.user.id, id, body.cover_message, body.proposed_daily_rate_tnd);
  }

  @Get('workers/my-applications')
  @ApiOperation({ summary: 'Mes candidatures (vue travailleur)' })
  getMyApplications(@Request() req) {
    return this.workersService.getMyApplications(req.user.id);
  }

  @Get('workers/applications/:id/mission-context')
  @ApiOperation({ summary: 'Obtenir le snapshot de contexte de mission pour une candidature' })
  async getMissionContext(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.workersService.getMissionContext(id, req.user.id);
  }

  @Patch('workers/applications/:id')
  @ApiOperation({ summary: 'Accepter ou rejeter une candidature' })
  updateApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('status') status: ApplicationStatus,
  ) {
    return this.workersService.updateApplicationStatus(id, req.user.id, status);
  }

  @Patch('workers/applications/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une candidature et notifier le travailleur' })
  acceptApplication(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.workersService.acceptApplication(id, req.user.id);
  }

  @Patch('workers/applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une candidature et notifier le travailleur' })
  rejectApplication(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.workersService.rejectApplication(id, req.user.id);
  }

  @Post('workers/applications/:id/rate')
  @ApiOperation({ summary: 'Noter un travailleur après la mission' })
  rateWorker(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('rating') rating: number,
    @Body('notes') notes?: string,
  ) {
    return this.workersService.rateWorker(id, req.user.id, rating, notes);
  }

  // ─── CERTIFICATIONS (NOUVEAU) ──────────────────────────────────────────────

  @Post('workers/certifications')
  @ApiOperation({ summary: 'Ajouter une certification' })
  addCertification(@Request() req, @Body() body: any) {
    return this.workersService.addCertification(req.user.id, body);
  }

  @Get('workers/certifications/mine')
  @ApiOperation({ summary: 'Lister mes certifications' })
  getMyCertifications(@Request() req) {
    return this.workersService.getMyCertifications(req.user.id);
  }

  @Delete('workers/certifications/:id')
  @ApiOperation({ summary: 'Supprimer une certification' })
  deleteCertification(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.workersService.deleteCertification(req.user.id, id);
  }

  @Patch('workers/certifications/:id/verify')
  @ApiOperation({ summary: 'Approuver ou rejeter une certification' })
  verifyCertification(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { verification_status: string; rejection_reason?: string },
  ) {
    const approved = body.verification_status === 'VERIFIED';
    return this.workersService.verifyCertification(req.user.id, id, approved, body.rejection_reason);
  }

  // ─── TRUSTED WORKERS ─────────────────────────────────────────────────────

  @Get('workers/trusted')
  @ApiOperation({ summary: "Liste des travailleurs de confiance (missions complétées avec l'employeur)" })
  getTrustedWorkers(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.workersService.getTrustedWorkers(userId);
  }

  // ─── RATINGS ───────────────────────────────────────────────────────────────

  @Get('workers/ratings/mine')
  @ApiOperation({ summary: 'Lister mes évaluations' })
  getMyRatings(@Request() req) {
    return this.workersService.getMyRatings(req.user.id);
  }

  // ─── REVENUS ───────────────────────────────────────────────────────────────

  @Get('workers/earnings/mine')
  @ApiOperation({ summary: 'Lister mes revenus et statistiques' })
  getMyEarnings(@Request() req) {
    return this.workersService.getMyEarnings(req.user.id);
  }

  // ─── PROFIL PUBLIC ─────────────────────────────────────────────────────────

  @Get('workers/profiles/:id/public')
  @ApiOperation({ summary: 'Récupérer le profil public d\'un travailleur' })
  getWorkerPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.workersService.getWorkerPublicProfile(id);
  }

  @Get('workers/profiles/:id/availability')
  @ApiOperation({ summary: 'Récupérer la disponibilité mensuelle d\'un travailleur' })
  getWorkerAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.workersService.getWorkerAvailability(id, year || new Date().getFullYear(), month || new Date().getMonth() + 1);
  }
}
