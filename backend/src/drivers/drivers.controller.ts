import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriversService } from './drivers.service';
import { DriverProfile } from './entities/driver-profile.entity';
import { TransportStatus } from './entities/transport-request.entity';
import { GpsTrackingGateway } from './gps-tracking.gateway';

@ApiTags('Drivers & Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly gpsGateway: GpsTrackingGateway,
  ) {}

  // ─── PROFILS CHAUFFEURS ───────────────────────────────────────────────────

  @Post('drivers/profile')
  @ApiOperation({ summary: 'Créer ou mettre à jour son profil chauffeur' })
  upsertProfile(@Request() req, @Body() dto: any) {
    return this.driversService.upsertProfile(req.user.sub, dto);
  }

  @Get('drivers/profile/me')
  @ApiOperation({ summary: 'Récupérer son profil chauffeur' })
  getMyProfile(@Request() req) {
    return this.driversService.findMyProfile(req.user.sub);
  }

  @Get('drivers/my-requests')
  @ApiOperation({ summary: 'Lister mes demandes de transport (FARMER)' })
  getMyRequests(@Request() req) {
    return this.driversService.findMyTransportRequests(req.user.sub);
  }

  @Patch('drivers/requests/:id/assign')
  @ApiOperation({ summary: 'Assigner un chauffeur et valider le tarif (FARMER)' })
  assignDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('driver_id') driverUserId: string,
    @Body('accepted_price_tnd') acceptedPrice: number,
    @Request() req,
  ) {
    return this.driversService.assignDriverToRequest(id, req.user.sub, driverUserId, acceptedPrice);
  }

  @Delete('drivers/requests/:id')
  @ApiOperation({ summary: 'Supprimer ou annuler une demande de transport (FARMER)' })
  deleteRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.driversService.cancelTransportRequest(id, req.user.sub);
  }

  @Patch('drivers/requests/:id')
  @ApiOperation({ summary: 'Modifier une demande de transport (FARMER)' })
  updateRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Request() req,
  ) {
    return this.driversService.updateTransportRequest(id, req.user.sub, dto);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Lister les chauffeurs disponibles' })
  @ApiQuery({ name: 'governorate', required: false })
  findAll(@Query('governorate') governorate?: string) {
    return this.driversService.findAvailableDrivers(governorate);
  }

  // ─── DEMANDES DE TRANSPORT ────────────────────────────────────────────────

  @Post('drivers/requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une demande de transport (B2B_BUYER)' })
  createRequest(@Request() req, @Body() dto: any) {
    return this.driversService.createTransportRequest(req.user.sub, dto);
  }

  @Get('drivers/requests')
  @ApiOperation({ summary: 'Lister les demandes de transport' })
  @ApiQuery({ name: 'status', required: false, enum: TransportStatus })
  @ApiQuery({ name: 'my', required: false, type: Boolean })
  findAll2(@Query('status') status?: TransportStatus, @Query('my') my?: boolean, @Request() req?: any) {
    if (my) {
      // Driver fetching their own accepted trips
      return this.driversService.findDriverTransportRequests(req.user.sub);
    }
    return this.driversService.findTransportRequests(status);
  }

  @Get('drivers/requests/available')
  @ApiOperation({ summary: 'Rechercher des demandes de transport par géolocalisation' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Rayon en km (défaut 50)' })
  findAvailableRequestsGeo(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
  ) {
    return this.driversService.findAvailableRequestsNearLocation(lat, lng, radius || 50);
  }

  @Post('drivers/requests/:id/accept')
  @ApiOperation({ summary: 'Accepter une demande de transport (DRIVER)' })
  acceptRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('accepted_price_tnd') acceptedPrice?: number,
  ) {
    return this.driversService.acceptTransportRequest(id, req.user.sub, acceptedPrice);
  }

  @Patch('drivers/requests/:id/stage')
  @ApiOperation({ summary: 'Mettre à jour le statut du transport (IN_TRANSIT / DELIVERED)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('stage') stage: TransportStatus,
  ) {
    return this.driversService.updateTransportStatus(id, req.user.sub, stage);
  }

  // Sprint 9: New driver-focused endpoints
  @Get('drivers/transport-requests/available')
  @ApiOperation({ summary: 'Missions disponibles pour ce chauffeur (PENDING)' })
  @ApiQuery({ name: 'governorate', required: false })
  getAvailableRequests(@Query('governorate') governorate?: string) {
    return this.driversService.getAvailablePendingRequests(governorate);
  }

  @Patch('drivers/transport-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une mission de transport' })
  acceptRequest2(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.driversService.acceptTransportRequestById(id, req.user.sub);
  }

  @Get('drivers/transport-requests/my-missions')
  @ApiOperation({ summary: 'Mes missions actives et historiques' })
  getMyMissions(@Request() req) {
    return this.driversService.getMyMissions(req.user.sub);
  }

  @Patch('drivers/transport-requests/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer une mission comme livrée' })
  completeRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.driversService.completeTransportRequest(id, req.user.sub);
  }

  // ─── GPS TRACKING (HTTP FALLBACK) ─────────────────────────────────────────

  @Post('drivers/gps/position')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mise à jour de position GPS (fallback HTTP si WS indisponible)' })
  async postGpsPosition(@Request() req, @Body() body: any) {
    // Delegates to the same gateway logic for consistency
    const fakeSocket: any = {
      data: { driverProfileId: null },
      join: async () => {},
    };
    // We resolve the profile via the service layer
    const profile = await this.driversService.findMyProfile(req.user.sub);
    if (!profile) return { error: 'No driver profile' };
    fakeSocket.data.driverProfileId = profile.id;
    return this.gpsGateway.onPositionUpdate(fakeSocket, body);
  }
}
