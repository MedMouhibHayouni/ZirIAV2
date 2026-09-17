import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { CreateCropZoneDto } from './dto/create-crop-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Parcelles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcels')
export class ParcelsController {
  constructor(private readonly service: ParcelsService) {}

  @Post()
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Enregistrer une nouvelle parcelle géolocalisée' })
  create(@Body() dto: CreateParcelDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT, Role.B2B_BUYER, Role.EXPERT)
  @ApiOperation({ summary: 'Liste toutes les parcelles (Admin/Président/Acheteur)' })
  @ApiQuery({ name: 'cooperative', required: false })
  findAll(@Query('cooperative') cooperativeId?: string, @CurrentUser() user?: any) {
    if (cooperativeId === 'my' && user?.cooperative_id) {
      return this.service.findByCooperative(user.cooperative_id);
    } else if (cooperativeId && cooperativeId !== 'my') {
      return this.service.findByCooperative(cooperativeId);
    }
    return this.service.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes parcelles (utilisateur authentifié) ou celles d un membre pour le président SMSA' })
  @ApiQuery({ name: 'user_id', required: false, description: 'ID de l\'utilisateur (uniquement pour Admin ou Président SMSA)' })
  findMine(@CurrentUser() user: any, @Query('user_id') userId?: string) {
    if (userId && (user.role === Role.ADMIN || user.role === Role.COOP_PRESIDENT)) {
      // Pour une vraie sécurisation, vérifier ici si `userId` appartient bien à la coopérative du président.
      return this.service.findByOwner(userId);
    }
    return this.service.findByOwner(user.id);
  }

  @Get('map-data')
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Données complètes pour la carte (parcelles, zones, météo)' })
  getMapData(@CurrentUser() user: any) {
    return this.service.getMapData(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une parcelle' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneForUser(id, user.id, user.role === Role.ADMIN);
  }

  @Patch(':id')
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Modifier une parcelle (propriétaire ou admin)' })
  update(@Param('id') id: string, @Body() dto: CreateParcelDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Patch(':id/boundary')
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Mettre à jour la bordure géolocalisée d une parcelle' })
  updateBoundary(@Param('id') id: string, @Body('boundary_geojson') boundary_geojson: any, @CurrentUser() user: any) {
    return this.service.updateBoundaryForUser(id, boundary_geojson, user.id, user.role === Role.ADMIN);
  }

  @Delete(':id')
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer une parcelle' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id, user.role === Role.ADMIN);
  }

  @Get(':id/crop-zones')
  @ApiOperation({ summary: 'Liste des zones de culture d\'une parcelle' })
  getCropZones(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getCropZonesForUser(id, user.id, user.role === Role.ADMIN);
  }

  @Post(':id/crop-zones')
  @Roles(Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Ajouter une CropZone (culture spécifique)' })
  addZone(
    @Param('id') id: string,
    @Body() dto: CreateCropZoneDto,
    @CurrentUser() user: any
  ) {
    return this.service.addZoneGeo(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Patch('crop-zones/:zoneId/boundary')
  @Roles(Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Modifier la bordure d une zone de culture' })
  updateZoneBoundary(
    @Param('zoneId') zoneId: string,
    @Body('boundary_geojson') boundary_geojson: any,
    @Body('parcel_id') parcel_id: string,
    @CurrentUser() user: any
  ) {
    return this.service.updateZoneBoundaryForUser(zoneId, boundary_geojson, parcel_id, user.id, user.role === Role.ADMIN);
  }

  @Delete(':id/crop-zones/:zoneId')
  @Roles(Role.FARMER_AMBASSADOR, Role.COOP_PRESIDENT, Role.ADMIN, Role.FARMER)
  @ApiOperation({ summary: 'Supprimer une CropZone' })
  removeZone(
    @Param('zoneId') zoneId: string,
    @CurrentUser() user: any
  ) {
    return this.service.removeZone(zoneId, user.id, user.role === Role.ADMIN);
  }
}
