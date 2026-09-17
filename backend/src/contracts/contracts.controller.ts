import {
  Controller, Get, Post, Patch, Param, Body, Request, UseGuards, Res,
  ParseUUIDPipe, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MissionContractService } from './mission-contract.service';
import { NegotiationService } from './negotiation.service';
import { PdfService } from './pdf.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ContractMessageType } from './entities/contract-enums';
import { DisputeReasonType } from './entities/contract-enums';
import { ContractType } from './entities/contract-type.enum';

@ApiTags('Mission Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractService: MissionContractService,
    private readonly negotiationService: NegotiationService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Lister tous mes contrats' })
  getMyContracts(@Request() req) {
    return this.contractService.getMyContracts(req.user.id || req.user.sub);
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Filtrer mes contrats par type' })
  getByType(@Request() req, @Query('type') type: ContractType) {
    return this.contractService.getContractsByType(req.user.id || req.user.sub, type);
  }

  // NOTE (Phase 2/3) : cette route statique DOIT rester avant @Get(':id'),
  // sinon Express la capture comme id='negotiations' → 400 uuid (bug réel trouvé en e2e).
  @Get('negotiations')
  @ApiOperation({ summary: 'Mes négociations' })
  getMyNegotiations(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.negotiationService.getNegotiationsForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un contrat par ID' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.getContractById(id, req.user.id || req.user.sub);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer un message dans un contrat' })
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('content') content: string,
    @Body('message_type') messageType?: ContractMessageType,
    @Body('offer_amount_tnd') offerAmount?: number,
  ) {
    return this.contractService.sendMessage(id, req.user.id || req.user.sub, content, messageType, offerAmount);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Récupérer les messages d\'un contrat' })
  getMessages(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.getMessages(id, req.user.id || req.user.sub);
  }

  @Patch(':id/accept-offer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une offre dans un contrat' })
  acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('message_id') messageId: string,
  ) {
    return this.contractService.acceptOffer(id, req.user.id || req.user.sub, messageId);
  }

  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter un contrat en attente' })
  accept(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.acceptContract(id, req.user.id || req.user.sub);
  }

  @Patch(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Démarrer une mission' })
  startMission(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.startMission(id, req.user.id || req.user.sub);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminer une mission' })
  completeMission(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.completeMission(id, req.user.id || req.user.sub);
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Évaluer le contrat' })
  rateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    return this.contractService.rateContract(id, req.user.id || req.user.sub, rating, comment);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler un contrat' })
  cancelContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reason') reason: string,
  ) {
    return this.contractService.cancelContract(id, req.user.id || req.user.sub, reason);
  }

  // ─── SIGNATURE FLOW ────────────────────────────────────────────────────────────

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signer un contrat (double signature)' })
  signContract(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.signContract(id, req.user.id || req.user.sub);
  }

  @Post(':id/mark-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Travailleur marque la mission terminée' })
  markComplete(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.workerMarkComplete(id, req.user.id || req.user.sub);
  }

  @Post(':id/confirm-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fermier confirme la fin et déclenche le paiement' })
  confirmComplete(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.contractService.farmerConfirmComplete(id, req.user.id || req.user.sub);
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander une prolongation' })
  extendMission(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('additional_days') additionalDays: number,
    @Body('additional_amount') additionalAmount: number,
  ) {
    return this.contractService.extendMission(id, req.user.id || req.user.sub, additionalDays, additionalAmount);
  }

  @Post(':id/dispute')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ouvrir un litige' })
  openDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reason_type') reasonType: DisputeReasonType,
    @Body('description') description: string,
    @Body('photo_urls') photoUrls?: string[],
  ) {
    return this.contractService.openDispute(id, req.user.id || req.user.sub, reasonType, description, photoUrls);
  }

  @Patch(':id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soulever un litige (legacy)' })
  dispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reason') reason: string,
  ) {
    return this.contractService.raiseDispute(id, req.user.id || req.user.sub, reason);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Résoudre un litige (ADMIN)' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('resolution') resolution: string,
  ) {
    return this.contractService.resolveDispute(id, req.user.id || req.user.sub, resolution);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Récupérer les documents du contrat' })
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.getContractDocuments(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Historique du contrat' })
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.getContractHistory(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Télécharger le PDF du contrat' })
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Res() res,
  ) {
    const userId = req.user.id || req.user.sub;
    const contract = await this.contractService.getContractById(id, userId);

    const pdfData = {
      contract_id: contract.id,
      contract_type: contract.contract_type ?? 'UNKNOWN',
      status: contract.status,
      initiator_name: (contract.terms_snapshot?.initiator_name as string) ?? 'Partie A',
      counterparty_name: (contract.terms_snapshot?.counterparty_name as string) ?? 'Partie B',
      total_amount_tnd: Number(contract.final_amount_tnd ?? contract.total_amount_tnd),
      commission_amount_tnd: Number(contract.platform_commission_tnd ?? contract.commission_amount_tnd),
      net_amount_tnd: Number(contract.net_to_provider_tnd) || (Number(contract.final_amount_tnd ?? contract.total_amount_tnd) - Number(contract.platform_commission_tnd ?? contract.commission_amount_tnd)),
      terms_snapshot: contract.terms_snapshot,
      created_at: contract.created_at,
      accepted_at: contract.accepted_at,
    };

    const pdf = await this.pdfService.generateContractPdf(pdfData);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrat-ziria-${id.slice(0, 8)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  // ─── EVALUATION BADGES ──────────────────────────────────────────────────────

  @Get('evaluation-badges')
  @ApiOperation({ summary: 'Lister les badges disponibles pour les évaluations' })
  getEvaluationBadges() {
    return this.contractService.getEvaluationBadges();
  }

  // ─── ÉVALUATION DE MISSION ──────────────────────────────────────────────────

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Évaluer un travailleur après mission' })
  async evaluateWorker(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('rating') rating: number,
    @Body('badges') badges: string[],
    @Body('comment') comment: string,
    @Body('worker_visible') workerVisible: boolean,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.contractService.evaluateWorker(id, userId, rating, badges, comment, workerVisible);
  }

  @Post(':id/worker-reply')
  @ApiOperation({ summary: 'Répondre à une évaluation (travailleur, une seule chance)' })
  async workerReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reply') reply: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.contractService.workerReplyToEvaluation(id, userId, reply);
  }

  // ─── NÉGOCIATIONS ────────────────────────────────────────────────────────────

  @Post('negotiations')
  @ApiOperation({ summary: 'Démarrer une négociation' })
  startNegotiation(@Request() req, @Body() body: { worker_id: string; mission_offer_id: string }) {
    const userId = req.user.id || req.user.sub;
    return this.negotiationService.startNegotiation(userId, body.worker_id, body.mission_offer_id);
  }

  @Get('negotiations/:id')
  @ApiOperation({ summary: 'Détail d\'une négociation' })
  getNegotiation(@Param('id', ParseUUIDPipe) id: string) {
    return this.negotiationService.getNegotiation(id);
  }

  @Post('negotiations/:id/propose')
  @ApiOperation({ summary: 'Proposer un round de négociation' })
  proposeRound(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: { daily_rate_tnd: number; start_date: string; end_date: string; working_days: number; conditions_text?: string },
  ) {
    const userId = req.user.id || req.user.sub;
    return this.negotiationService.proposeRound(userId, id, body);
  }

  @Post('negotiations/:id/accept')
  @ApiOperation({ summary: 'Accepter un round et créer le contrat' })
  acceptRound(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('round_id') roundId: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.negotiationService.acceptRound(userId, id, roundId);
  }

  @Post('negotiations/:id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Décliner une négociation' })
  declineNegotiation(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.negotiationService.declineNegotiation(userId, id);
  }
}
