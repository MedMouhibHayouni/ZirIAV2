import { Controller, Get, Post, Body, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DiseaseDetectionsService } from './disease-detections.service';
import { CreateDiseaseDetectionDto } from './dto/disease-detection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Détections IA - Maladies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disease-detections')
export class DiseaseDetectionsController {
  constructor(private readonly service: DiseaseDetectionsService) {}

  @Post()
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Soumettre une détection de maladie (terrain)' })
  create(@Body() dto: CreateDiseaseDetectionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Post('analyze')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Analyser une image de maladie via IA (alias pour POST /)' })
  analyze(@Body() dto: CreateDiseaseDetectionDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes détections de maladies' })
  findMine(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.service.findByReporter(user.id, page || 1, limit || 20);
  }

  @Get('pending-validation')
  @Roles(Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT] File d\'attente des validations' })
  findPending() {
    return this.service.findPendingValidation();
  }

  @Get()
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT, Role.EXPERT)
  @ApiOperation({ summary: 'Liste toutes les détections IA' })
  findAll() { return this.service.findAll(); }

  @Get('heatmap')
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.EXPERT)
  @ApiOperation({ summary: '[ADMIN/EXPERT] Données GPS pour heatmap Leaflet' })
  getHeatmapData() { return this.service.getHeatmapData(); }

  @Get(':id')
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT, Role.EXPERT)
  @ApiOperation({ summary: 'Détails d\'une détection IA' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id/link-parcel')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  @ApiOperation({ summary: 'Lier une détection à une parcelle' })
  linkParcel(@Param('id') id: string, @Body('parcel_id') parcelId: string) {
    return this.service.linkParcel(id, parcelId);
  }

  @Post(':id/request-validation')
  @Roles(Role.FARMER, Role.FARMER_AMBASSADOR)
  @ApiOperation({ summary: 'Demander la validation d\'un expert (optionnel: choisir un expert)' })
  requestValidation(
    @Param('id') id: string,
    @Body('expert_id') expertId?: string,
  ) {
    return this.service.requestValidation(id, expertId);
  }

  @Post('validate')
  @Roles(Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: '[EXPERT] Soumettre un feedback de validation MLOps' })
  submitValidation(
    @Body() body: { detection_id: string; expert_approved: boolean; correction_note?: string },
    @CurrentUser() user: any
  ) {
    return this.service.submitExpertFeedback(
      body.detection_id, user.id, body.expert_approved, body.correction_note
    );
  }
}
