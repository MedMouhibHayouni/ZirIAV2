import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AmbassadorService } from './ambassador.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { FieldReportSeverity } from './entities/field-report.entity';

@ApiTags('Ambassador')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.FARMER_AMBASSADOR, Role.ADMIN)
@Controller('ambassador')
export class AmbassadorController {
  constructor(private readonly service: AmbassadorService) {}

  @Get('zone-stats')
  @ApiOperation({ summary: 'KPIs de la zone de l\'ambassadeur' })
  getZoneStats(@CurrentUser() user: any) {
    return this.service.getZoneStats(user.id);
  }

  @Get('zone-farmers')
  @ApiOperation({ summary: 'Liste des agriculteurs de la zone (privacy-masked)' })
  getZoneFarmers(@CurrentUser() user: any) {
    return this.service.getZoneFarmers(user.id);
  }

  @Get('zone-alerts')
  @ApiOperation({ summary: 'Alertes actives pour tous les agriculteurs de la zone' })
  getZoneAlerts(@CurrentUser() user: any) {
    return this.service.getZoneAlerts(user.id);
  }

  @Get('expert-alerts')
  @ApiOperation({ summary: 'Alertes phytosanitaires des experts pour la zone' })
  getExpertAlerts(@CurrentUser() user: any) {
    return this.service.getExpertAlerts(user.id);
  }

  @Post('farmers/register')
  @ApiOperation({ summary: 'Inscrire un agriculteur non numérique' })
  registerFarmer(@CurrentUser() user: any, @Body() dto: {
    name: string; phone?: string; governorate: string; delegation?: string;
    privacy_level?: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';
  }) {
    return this.service.registerFarmer(user.id, dto);
  }

  @Post('proxy-action')
  @ApiOperation({ summary: 'Exécuter une action pour le compte d\'un agriculteur' })
  proxyAction(@CurrentUser() user: any, @Body() dto: {
    farmer_id: string; action_type: string; payload: Record<string, unknown>;
  }) {
    return this.service.proxyAction(user.id, dto);
  }

  @Post('field-reports')
  @ApiOperation({ summary: 'Soumettre un rapport terrain complet' })
  submitReport(@CurrentUser() user: any, @Body() dto: {
    photo_urls?: string[]; description: string; observations?: string; recommendations?: string;
    location_lat?: number; location_lng?: number; gps_lat?: number; gps_lng?: number;
    affected_crop_type?: string; crop_type?: string; affected_area_ha?: number;
    severity: FieldReportSeverity; farmer_id?: string;
  }) {
    return this.service.submitFieldReport(user.id, dto);
  }

  @Get('field-reports')
  @ApiOperation({ summary: 'Mes signalements terrain' })
  getFieldReports(@CurrentUser() user: any) {
    return this.service.getFieldReports(user.id);
  }

  // Sprint 10
  @Get('my-farmers')
  @ApiOperation({ summary: 'Agriculteurs dans ma zone (alias scoped)' })
  getMyFarmers(@CurrentUser() user: any) {
    return this.service.getZoneFarmers(user.id);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Fil d\'activité récente des agriculteurs de la zone' })
  getActivityFeed(@CurrentUser() user: any) {
    return this.service.getActivityFeed(user.id);
  }

  @Post('register-farmer')
  @ApiOperation({ summary: 'Inscrire un agriculteur avec identifiants complets' })
  registerFarmerFull(@CurrentUser() user: any, @Body() dto: {
    first_name: string; last_name: string; phone?: string; national_id?: string;
    email?: string; password: string; governorate: string; delegation?: string;
    village?: string; parcel_count?: number; privacy_level?: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';
  }) {
    return this.service.registerFarmerFull(user.id, dto);
  }

  @Get('pending-certifications')
  @ApiOperation({ summary: 'Lister les certifications en attente dans ma zone' })
  getPendingCertifications(@CurrentUser() user: any) {
    return this.service.getPendingCertificationsInZone(user.id);
  }
}
