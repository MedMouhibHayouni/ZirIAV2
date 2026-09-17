import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpertService } from './expert.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Farmer Relations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farmer')
export class FarmerController {
  private readonly logger = new Logger(FarmerController.name);

  constructor(private readonly expertService: ExpertService) {}

  @Post('expert-relations/request')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Demander à être suivi par un expert' })
  async requestExpertLink(
    @CurrentUser() user: any,
    @Body('expert_id') expertId: string,
    @Body('note') note?: string,
  ) {
    try {
      return await this.expertService.requestExpertLink(user.id, expertId, note);
    } catch (e) {
      this.logger.error(`requestExpertLink error: expertId=${expertId}, farmerId=${user.id}`, (e as any)?.stack || e);
      throw e;
    }
  }

  @Get('available-experts')
  @Roles(Role.FARMER, Role.ADMIN, Role.EXPERT)
  @ApiOperation({ summary: '[FARMER/EXPERT] Liste des experts disponibles' })
  getAvailableExperts(@Query('governorate') governorate?: string) {
    return this.expertService.getAvailableExperts(governorate);
  }

  // ── Phase 2: Expert Discovery ──────────────────────────────────────────────
  @Get('discover-experts')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Découverte d\'experts avec scoring de pertinence' })
  discoverExperts(
    @CurrentUser() user: any,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('problem') problemCategory?: string,
    @Query('type') type?: string,
    @Query('expert_type') expertType?: string,
  ) {
    return this.expertService.discoverExperts(
      user.id,
      lat ? parseFloat(lat) : 0,
      lng ? parseFloat(lng) : 0,
      problemCategory,
      type,
      expertType,
    );
  }

  // ── Phase 3: Cancel Pending Request ────────────────────────────────────────
  @Delete('expert-relations/pending/:expertId')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Annuler une demande en attente' })
  cancelPendingFarmerLink(@CurrentUser() user: any, @Param('expertId') expertId: string) {
    return this.expertService.cancelPendingFarmerLink(user.id, expertId);
  }

  // ── Phase 4: Submit Additional Info ─────────────────────────────────────────
  @Post('consultations/:id/submit-info')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Soumettre des informations supplémentaires pour une consultation' })
  submitAdditionalInfo(
    @CurrentUser() user: any,
    @Param('id') consultationId: string,
    @Body('text') text?: string,
    @Body('photo_urls') photoUrls?: string[],
  ) {
    return this.expertService.submitAdditionalInfo(consultationId, user.id, text, photoUrls);
  }

  // ── Phase 5: Prescription Purchase ─────────────────────────────────────────
  @Post('prescription-purchases')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Créer un achat depuis une prescription' })
  createPrescriptionPurchase(@CurrentUser() user: any, @Body() dto: {
    prescription_id: string;
    expert_id: string;
    supplier_id?: string;
    product_id?: string;
    quantity?: number;
    unit_price?: number;
    commission_percentage?: number;
  }) {
    return this.expertService.createPrescriptionPurchase({
      ...dto,
      farmer_id: user.id,
    });
  }

  // ── Phase 7: My Linked Experts ──────────────────────────────────────────────
  @Get('my-experts')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Mes experts liés (acceptés et en attente)' })
  getMyLinkedExperts(@CurrentUser() user: any) {
    return this.expertService.getMyLinkedExperts(user.id);
  }

  @Get('crda-auto-assignment')
  @Roles(Role.FARMER, Role.ADMIN)
  @ApiOperation({ summary: '[FARMER] Vérifier l\'agent CRDA automatique pour ma zone' })
  checkCrdaAutoAssignment(@CurrentUser() user: any) {
    return this.expertService.checkCrdaAutoAssignment(user.id);
  }
}
