import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Optional, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpertService } from './expert.service';
import { DiseaseDetectionsService } from '../disease-detections/disease-detections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExpertProfileCompletedGuard } from '../auth/guards/expert-profile-completed.guard';
import { ExpertTypeGuard } from '../auth/guards/expert-type.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { ExpertType } from '../common/enums/expert-type.enum';
import { ApplicationMethod } from './entities/prescription.entity';

@ApiTags('Expertise & CRDA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ExpertProfileCompletedGuard)
@Roles(Role.EXPERT, Role.ADMIN)
@Controller('expert')
export class ExpertController {
  private readonly logger = new Logger(ExpertController.name);

  constructor(
    private readonly expertService: ExpertService,
    private readonly diseaseDetectionsService: DiseaseDetectionsService,
  ) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: '[EXPERT] Statistiques du tableau de bord expert' })
  getDashboardStats(@CurrentUser() user: any) {
    return this.expertService.getDashboardStats(user.id);
  }

  @Get('pending-cases')
  @ApiOperation({ summary: '[EXPERT] File d\'attente de triage unifiée (IA + Terrain)' })
  getPendingCases(@CurrentUser() user: any) {
    return this.expertService.getPendingCases(user.id);
  }

  @Get('priority-actions')
  @ApiOperation({ summary: '[EXPERT] File d\'actions prioritaires unifiée pour chaque type d\'expert' })
  getPriorityActions(@CurrentUser() user: any) {
    return this.expertService.getPriorityActions(user.id);
  }

  @Get('field-reports')
  @ApiOperation({ summary: '[EXPERT] Rapports terrain des ambassadeurs de ma gouvernorat' })
  getFieldReports(@CurrentUser() user: any) {
    return this.expertService.getExpertFieldReports(user.id);
  }

  @Patch('detections/:id/validate')
  @ApiOperation({ summary: '[EXPERT] Valider un diagnostic IA (noms trilingues obligatoires)' })
  validateDetection(
    @Param('id') id: string,
    @Body('is_correct') isCorrect: boolean,
    @Body('corrected_disease') correctedDisease?: string,
    @Body('comments') comments?: string,
    @Body('name_ar') nameAr?: string,
    @Body('name_lat') nameLat?: string,
    @CurrentUser() user?: any,
  ) {
    return this.expertService.validateDiagnosis(id, user.id, isCorrect, correctedDisease, comments, nameAr, nameLat);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: '[EXPERT] Historique des ordonnances' })
  getPrescriptions(@CurrentUser() user: any) {
    return this.expertService.getPrescriptions(user.id);
  }

  @Get('prescription-suggestions')
  @ApiOperation({ summary: '[EXPERT] Obtenir des suggestions automatiques de prescription' })
  getPrescriptionSuggestions(@Query('diseaseName') diseaseName: string) {
    return this.expertService.getPrescriptionSuggestions(diseaseName);
  }

  @Get('crop-kc')
  @ApiOperation({ summary: '[EXPERT] Coefficients FAO Kc pour les cultures' })
  getCropKc() {
    return this.expertService.getCropKcValues();
  }

  @Get('animal-norms')
  @ApiOperation({ summary: '[EXPERT] Besoins nutritionnels des animaux INRAT/INRA' })
  getAnimalNorms() {
    return this.expertService.getAnimalNutritionalNorms();
  }

  @Get('seasonal-risks')
  @ApiOperation({ summary: '[EXPERT] Risques saisonniers pour le mois courant' })
  getSeasonalRisks(@Query('month') month: string) {
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.expertService.getSeasonalRisks(m);
  }

  @Post('prescriptions')
  @ApiOperation({ summary: '[EXPERT] Créer une ordonnance/prescription agronomique' })
  createPrescription(@CurrentUser() user: any, @Body() dto: {
    detection_id?: string; farmer_id?: string; product_name: string; dosage: string;
    application_method: ApplicationMethod; pre_harvest_days?: number; notes?: string; valid_until?: string;
  }) {
    return this.expertService.createPrescription(user.id, dto);
  }

  @Get('disease-clusters')
  @ApiOperation({ summary: '[EXPERT] Heatmap régionale des maladies (clusters PostGIS)' })
  getDiseaseClusters() {
    return this.expertService.getDiseaseClusters();
  }

  @Get('reports')
  @ApiOperation({ summary: '[EXPERT] Rapports de synthèse agronomique' })
  getReports() {
    return this.expertService.getExpertReports();
  }

  @Get('phyto-alerts/my')
  @ApiOperation({ summary: '[EXPERT] Mes alertes diffusées' })
  getMyAlerts(@CurrentUser() user: any) {
    return this.expertService.getMyAlerts(user.id);
  }

  @Post('phyto-alerts')
  @ApiOperation({ summary: '[EXPERT] Créer une nouvelle alerte phytosanitaire' })
  createPhytoAlert(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createPhytoAlert(user.id, dto);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: '[EXPERT] Générer un rapport de synthèse CRDA' })
  generateReport(@CurrentUser() user: any) {
    return this.expertService.generateSynthesisReport(user.id);
  }

  @Post('broadcast-alert')
  @ApiOperation({ summary: '[EXPERT] Diffuser une alerte phytosanitaire régionale' })
  broadcastAlert(
    @Body() body: { diseaseName: string; lat: number; lng: number; radiusKm: number; message: string },
    @CurrentUser() user: any
  ) {
    return this.expertService.broadcastPhytoAlert(
      user.id, body.diseaseName, body.lat, body.lng, body.radiusKm, body.message
    );
  }

  @Post('consultations')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Créer une demande de consultation expert' })
  createConsultation(@CurrentUser() user: any, @Body() dto: { expert_type: ExpertType; consultation_type: string; description: string; gross_amount_tnd: number }) {
    return this.expertService.createConsultation(user.id, dto);
  }

  @Get('consultations/my-queue')
  @ApiOperation({ summary: '[EXPERT] File d\'attente des consultations de mon expertise' })
  getConsultationsQueue(@CurrentUser() user: any) {
    return this.expertService.getExpertQueue(user.id);
  }

  @Patch('consultations/:id/accept')
  @UseGuards(ExpertTypeGuard)
  @ApiOperation({ summary: '[EXPERT] Accepter une consultation' })
  acceptConsultation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expertService.acceptConsultation(id, user.id);
  }

  @Patch('consultations/:id/respond')
  @UseGuards(ExpertTypeGuard)
  @ApiOperation({ summary: '[EXPERT] Répondre à une consultation agronomique' })
  respondToConsultation(@Param('id') id: string, @CurrentUser() user: any, @Body('response') response: string) {
    return this.expertService.respondToConsultation(id, user.id, response);
  }

  @Get('consultations/earnings')
  @ApiOperation({ summary: '[EXPERT] Résumé des gains de consultations de l\'expert' })
  getConsultationsEarnings(@CurrentUser() user: any) {
    return this.expertService.getExpertEarningsSummary(user.id);
  }

  @Patch('profile/complete')
  @ApiOperation({ summary: '[EXPERT] Compléter le profil d\'expert pour déverrouiller le dashboard' })
  completeProfile(@CurrentUser() user: any, @Body() dto: {
    expert_type: ExpertType;
    professional_status: string[];
    crda_zone_id?: string;
    affiliation_name?: string;
    institution_name?: string;
    accepts_remote_consultations?: boolean;
    governorate_zones: string[];
    certifications: string[];
    bio: string;
  }) {
    return this.expertService.completeExpertProfile(user.id, dto as any);
  }

  // ── Expert-Farmer Relations Endpoints ─────────────────────────────────────
  @Get('my-farmers')
  @ApiOperation({ summary: '[EXPERT] Obtenir la liste des agriculteurs acceptés' })
  getMyFarmers(@CurrentUser() user: any) {
    return this.expertService.getMyFarmers(user.id);
  }

  @Get('my-farmers/:farmerId/details')
  @ApiOperation({ summary: '[EXPERT] Obtenir le dossier complet d\'un agriculteur' })
  getFarmerDetails(@CurrentUser() user: any, @Param('farmerId') farmerId: string) {
    return this.expertService.getFarmerDetails(user.id, farmerId);
  }

  @Post('farmer-relations/request')
  @ApiOperation({ summary: '[EXPERT] Demander à suivre un agriculteur' })
  requestFarmerLink(@CurrentUser() user: any, @Body('farmer_id') farmerId: string, @Body('note') note?: string) {
    return this.expertService.requestFarmerLink(user.id, farmerId, note);
  }

  @Patch('farmer-relations/:id/respond')
  @ApiOperation({ summary: '[EXPERT] Répondre à une demande d\'un agriculteur' })
  async respondToFarmerLink(@CurrentUser() user: any, @Param('id') id: string, @Body('accepted') accepted: boolean) {
    try {
      return await this.expertService.respondToFarmerLink(id, user.id, accepted);
    } catch (e) {
      this.logger.error(`respondToFarmerLink error`, e);
      throw e;
    }
  }

  @Get('farmer-relations/pending')
  @ApiOperation({ summary: '[EXPERT] Liste des demandes de suivi en attente' })
  getPendingRelations(@CurrentUser() user: any) {
    return this.expertService.getPendingRelations(user.id);
  }

  @Delete('farmer-relations/:farmerId')
  @ApiOperation({ summary: '[EXPERT] Supprimer le lien avec un agriculteur' })
  removeFarmerLink(@CurrentUser() user: any, @Param('farmerId') farmerId: string) {
    return this.expertService.removeFarmerLink(user.id, farmerId);
  }

  // ── Public Profile (no ExpertProfileCompletedGuard required for GET) ─────────────
  @Get('public-profile/:expertId')
  @ApiOperation({ summary: '[PUBLIC] Profil public d\'un expert (sans authentification requise)' })
  getPublicProfile(@Param('expertId') expertId: string) {
    return this.expertService.getPublicProfile(expertId);
  }

  @Get('my-profile')
  @ApiOperation({ summary: '[EXPERT] Profil complet de l\'expert connecté' })
  getMyProfile(@CurrentUser() user: any) {
    return this.expertService.getMyProfile(user.id);
  }

  @Patch('profile/update')
  @ApiOperation({ summary: '[EXPERT] Mettre à jour son profil (expert + user fields)' })
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: {
      name?: string;
      phone?: string;
      email?: string;
      governorate?: string;
      delegation?: string;
      profile_picture_url?: string;
      language?: string;
      speciality?: string;
      bio?: string;
      governorate_zones?: string[];
      certifications?: string[];
      consultation_rate_tnd?: number;
      tarif_note?: string;
      professional_status?: string[];
      crda_zone_id?: string;
      affiliation_name?: string;
      institution_name?: string;
      accepts_remote_consultations?: boolean;
      password?: string;
    }
  ) {
    return this.expertService.updateProfile(user.id, dto as any);
  }

  // ── Messaging (shared between EXPERT and FARMER) ─────────────────────────
  @Get('messages/conversations')
  @Roles(Role.FARMER, Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT/FARMER] Liste des conversations' })
  getConversations(@CurrentUser() user: any) {
    return this.expertService.getConversations(user.id);
  }

  @Get('messages/unread-count')
  @Roles(Role.FARMER, Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT/FARMER] Nombre total de messages non lus' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.expertService.getUnreadCount(user.id);
  }

  @Get('messages/thread/:partnerId')
  @Roles(Role.FARMER, Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT/FARMER] Messages avec un partenaire' })
  getMessages(@CurrentUser() user: any, @Param('partnerId') partnerId: string) {
    return this.expertService.getMessages(user.id, partnerId);
  }

  @Post('messages/send')
  @Roles(Role.FARMER, Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT/FARMER] Envoyer un message' })
  sendMessage(@CurrentUser() user: any, @Body() body: { receiver_id: string; body: string }) {
    return this.expertService.sendMessage(user.id, body.receiver_id, body.body);
  }

  @Get('earnings-dashboard')
  @ApiOperation({ summary: '[EXPERT] Tableau de bord revenus avec historique mensuel' })
  getEarningsDashboard(@CurrentUser() user: any) {
    return this.expertService.getEarningsDashboard(user.id);
  }

  @Get('npk-calculator')
  @ApiOperation({ summary: '[EXPERT] Calculateur de fertilisation N-P-K' })
  getNpkCalculator(
    @Query('crop') crop: string,
    @Query('area') area: string,
    @Query('ph') ph: string,
  ) {
    return this.expertService.getNpkCalculation(crop, Number(area) || 1, Number(ph) || 7.0);
  }

  @Get('vaccine-types')
  @ApiOperation({ summary: '[EXPERT] Types de vaccins disponibles' })
  getVaccineTypes() {
    return this.expertService.getVaccineTypes();
  }

  @Get('governorate-centroids')
  @ApiOperation({ summary: '[EXPERT] Centros de gouvernorat' })
  getGovernorateCentroids() {
    return this.expertService.getGovernorateCentroids();
  }

  @Get('herd-records/all')
  @ApiOperation({ summary: '[EXPERT] Obtenir tous les herd records de l\'expert' })
  getAllHerdRecords(@CurrentUser() user: any) {
    return this.expertService.getAllHerdRecords(user.id);
  }

  @Delete('prescriptions/:id')
  @ApiOperation({ summary: '[EXPERT] Supprimer une prescription' })
  deletePrescription(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expertService.deletePrescription(user.id, id);
  }

  @Get('soil-analyses')
  @ApiOperation({ summary: '[EXPERT] Obtenir les analyses de sol' })
  getSoilAnalyses(@CurrentUser() user: any) {
    return this.expertService.getSoilAnalyses(user.id);
  }

  @Post('soil-analyses')
  @ApiOperation({ summary: '[EXPERT] Ajouter une analyse de sol' })
  createSoilAnalysis(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createSoilAnalysis(user.id, dto);
  }

  @Get('wells')
  @ApiOperation({ summary: '[EXPERT] Obtenir la liste des puits' })
  getWells(@CurrentUser() user: any) {
    return this.expertService.getWells(user.id);
  }

  @Post('wells')
  @ApiOperation({ summary: '[EXPERT] Créer un nouveau puits' })
  createWell(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createWell(user.id, dto);
  }

  @Patch('wells/:id')
  @ApiOperation({ summary: '[EXPERT] Modifier un puits (nom, statut, notes)' })
  updateWell(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { well_name?: string; status?: string; geological_notes?: string },
  ) {
    return this.expertService.updateWell(user.id, id, dto);
  }

  @Delete('wells/:id')
  @ApiOperation({ summary: '[EXPERT] Supprimer un puits et ses mesures' })
  deleteWell(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expertService.deleteWell(user.id, id);
  }

  @Post('wells/:id/measurements')
  @ApiOperation({ summary: '[EXPERT] Ajouter une mesure à un puits' })
  addWellMeasurement(@Param('id') id: string, @Body() dto: any) {
    return this.expertService.addWellMeasurement(id, dto);
  }

  @Get('wells/:id/measurements')
  @ApiOperation({ summary: '[EXPERT] Obtenir les mesures d\'un puits' })
  getWellMeasurements(@Param('id') id: string) {
    return this.expertService.getWellMeasurements(id);
  }

  @Get('herd-records/farmer/:farmerId')
  @ApiOperation({ summary: '[EXPERT] Obtenir les herd records pour un fermier' })
  getHerdRecords(@CurrentUser() user: any, @Param('farmerId') farmerId: string) {
    return this.expertService.getHerdRecords(user.id, farmerId);
  }

  @Post('herd-records')
  @ApiOperation({ summary: '[EXPERT] Créer ou mettre à jour un herd record' })
  createOrUpdateHerdRecord(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createOrUpdateHerdRecord(user.id, dto);
  }

  @Get('vaccinations')
  @ApiOperation({ summary: '[EXPERT] Obtenir l\'historique des vaccinations' })
  getVaccinations(@CurrentUser() user: any) {
    return this.expertService.getVaccinations(user.id);
  }

  @Post('vaccinations')
  @ApiOperation({ summary: '[EXPERT] Créer un enregistrement de vaccination' })
  createVaccination(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createVaccination(user.id, dto);
  }

  @Get('ration-calculator')
  @ApiOperation({ summary: '[EXPERT] Calculateur de rations' })
  getRationCalculator(
    @Query('species') species: string,
    @Query('stage') stage: string,
    @Query('herdSize') herdSize: string,
  ) {
    return this.expertService.getRationCalculation(species, stage, Number(herdSize) || 1);
  }

  @Get('water/etc-calculator')
  @ApiOperation({ summary: '[EXPERT] Calculateur ETc' })
  getEtcCalculator(
    @Query('crop') crop: string,
    @Query('stage') stage: string,
    @Query('governorate') governorate: string,
  ) {
    return this.expertService.getEtcCalculation(crop, stage, governorate);
  }

  @Get('water-projects')
  @ApiOperation({ summary: '[EXPERT] Obtenir les projets d\'irrigation' })
  getWaterProjects(@CurrentUser() user: any) {
    return this.expertService.getWaterProjects(user.id);
  }

  @Post('water-projects')
  @ApiOperation({ summary: '[EXPERT] Créer un projet d\'irrigation' })
  createWaterProject(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createWaterProject(user.id, dto);
  }

  @Patch('water-projects/:id/status')
  @ApiOperation({ summary: '[EXPERT] Modifier le statut d\'un projet d\'irrigation' })
  updateWaterProjectStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.expertService.updateWaterProjectStatus(user.id, id, status);
  }

  @Get('crop-journals/farmer/:id')
  @ApiOperation({ summary: '[EXPERT] Obtenir le journal de culture pour un agriculteur' })
  getCropJournals(@CurrentUser() user: any, @Param('id') id: string, @Query('season') season?: string) {
    return this.expertService.getCropJournals(user.id, id, season);
  }

  @Post('crop-journals')
  @ApiOperation({ summary: '[EXPERT] Créer un journal de culture' })
  createCropJournal(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createCropJournal(user.id, dto);
  }

  // ── Phase 1: Reference Data ────────────────────────────────────────────────
  @Get('crda-zones')
  @ApiOperation({ summary: '[EXPERT] Liste des zones CRDA' })
  getCrdaZones() {
    return this.expertService.getCrdaZones();
  }

  @Get('governorate-boundaries')
  @ApiOperation({ summary: '[EXPERT] Limites des gouvernorats tunisiens' })
  getGovernorateBoundaries() {
    return this.expertService.getGovernorateBoundaries();
  }

  // ── Phase 4: AWAITING_INFO Flow ────────────────────────────────────────────
  @Post('consultations/:id/request-info')
  @ApiOperation({ summary: '[EXPERT] Demander des informations supplémentaires à l\'agriculteur' })
  requestAdditionalInfo(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('chips') chips: string[],
    @Body('text') text?: string,
  ) {
    return this.expertService.requestAdditionalInfo(id, user.id, chips, text);
  }

  @Get('consultations/:id/additional-info')
  @ApiOperation({ summary: '[EXPERT] Voir les infos supplémentaires soumises' })
  getConsultationAdditionalInfo(@Param('id') id: string) {
    return this.expertService.getConsultationAdditionalInfo(id);
  }

  // ── Phase 5: Commission Agreements ─────────────────────────────────────────
  @Get('commission-agreements')
  @ApiOperation({ summary: '[EXPERT] Mes accords de commission' })
  getCommissionAgreements(@CurrentUser() user: any) {
    return this.expertService.getCommissionAgreements(user.id);
  }

  @Post('commission-agreements')
  @ApiOperation({ summary: '[EXPERT] Créer un accord de commission avec un fournisseur' })
  createCommissionAgreement(
    @CurrentUser() user: any,
    @Body() dto: { supplier_id: string; commission_percentage: number },
  ) {
    return this.expertService.createCommissionAgreement(user.id, dto);
  }

  @Delete('commission-agreements/:id')
  @ApiOperation({ summary: '[EXPERT] Supprimer un accord de commission' })
  removeCommissionAgreement(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expertService.removeCommissionAgreement(user.id, id);
  }

  @Get('prescription-purchases')
  @ApiOperation({ summary: '[EXPERT] Mes achats sur prescriptions' })
  getPrescriptionPurchases(@CurrentUser() user: any) {
    return this.expertService.getPrescriptionPurchases(user.id);
  }

  // ── Sprint 3: Water Calculation History ───────────────────────────────────────
  @Get('water/calculations')
  @ApiOperation({ summary: '[EXPERT] Historique des calculs ETc sauvegardés' })
  getWaterCalculations(@CurrentUser() user: any) {
    return this.expertService.getWaterCalculations(user.id);
  }

  @Post('water/calculations')
  @ApiOperation({ summary: '[EXPERT] Sauvegarder un calcul ETc' })
  saveWaterCalculation(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.saveWaterCalculation(user.id, dto);
  }

  // ── Sprint 3: Reproduction Calendar ──────────────────────────────────────────
  @Get('reproduction-records')
  @ApiOperation({ summary: '[EXPERT] Enregistrements du calendrier reproductif' })
  getReproductionRecords(@CurrentUser() user: any) {
    return this.expertService.getReproductionRecords(user.id);
  }

  @Post('reproduction-records')
  @ApiOperation({ summary: '[EXPERT] Créer un enregistrement reproductif' })
  createReproductionRecord(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createReproductionRecord(user.id, dto);
  }

  @Patch('reproduction-records/:id')
  @ApiOperation({ summary: '[EXPERT] Mettre à jour un enregistrement reproductif' })
  updateReproductionRecord(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.expertService.updateReproductionRecord(user.id, id, dto);
  }

  // ── Sprint 3: Clinical Dossiers ───────────────────────────────────────────────
  @Get('clinical-dossiers')
  @ApiOperation({ summary: '[EXPERT] Dossiers cliniques animaux' })
  getClinicalDossiers(@CurrentUser() user: any) {
    return this.expertService.getClinicalDossiers(user.id);
  }

  @Post('clinical-dossiers')
  @ApiOperation({ summary: '[EXPERT] Créer un dossier clinique' })
  createClinicalDossier(@CurrentUser() user: any, @Body() dto: any) {
    return this.expertService.createClinicalDossier(user.id, dto);
  }

  @Patch('clinical-dossiers/:id')
  @ApiOperation({ summary: '[EXPERT] Mettre à jour un dossier clinique' })
  updateClinicalDossier(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.expertService.updateClinicalDossier(user.id, id, dto);
  }

  // ── Sprint 3: Farmer-facing livestock read endpoints ─────────────────────
  @Get('herd-records/my')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Mes fiches d\'élevage créées par mes experts' })
  getMyHerdRecords(@CurrentUser() user: any) {
    return this.expertService.getHerdRecordsByFarmer(user.id);
  }

  @Get('vaccinations/my')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Mes vaccinations enregistrées par mes experts' })
  getMyVaccinations(@CurrentUser() user: any) {
    return this.expertService.getVaccinationsByFarmer(user.id);
  }
}
