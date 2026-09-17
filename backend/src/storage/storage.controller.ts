import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CreateStorageFacilityDto } from './dto/create-storage-facility.dto';
import { CreateStorageRoomDto } from './dto/create-storage-room.dto';
import { CreateStorageReservationDto } from './dto/create-storage-reservation.dto';
import { QueryStorageFacilityDto } from './dto/query-storage-facility.dto';
import { QueryStorageReservationDto } from './dto/query-storage-reservation.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Chambres Froides & Stockage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ── Owner Facilities Management ──────────────────────────────────────────

  @Post('facilities')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Créer un site de stockage (Chambre Froide)' })
  createFacility(@Body() dto: CreateStorageFacilityDto, @CurrentUser() user: any) {
    return this.storageService.createFacility(dto, user.id);
  }

  @Get('facilities/my')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mes sites de stockage' })
  getMyFacilities(@CurrentUser() user: any) {
    return this.storageService.getMyFacilities(user.id);
  }

  @Patch('facilities/:id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un site de stockage' })
  updateFacility(@Param('id') id: string, @Body() dto: Partial<CreateStorageFacilityDto>, @CurrentUser() user: any) {
    return this.storageService.updateFacility(id, dto, user.id);
  }

  // ── Storage Rooms & Layout Design ──────────────────────────────────────────

  @Post('rooms')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Ajouter une salle avec unités flexibles (m3, cajot, kg, litre, forfait)' })
  createRoom(@Body() dto: CreateStorageRoomDto, @CurrentUser() user: any) {
    return this.storageService.createRoom(dto, user.id);
  }

  @Get('facilities/:facilityId/rooms')
  @ApiOperation({ summary: 'Liste des salles d un site avec taux d occupation et P&L électricité STEG' })
  getRoomsByFacility(@Param('facilityId') facilityId: string) {
    return this.storageService.getRoomsByFacility(facilityId);
  }

  @Patch('rooms/:id/design')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le design visuel de la salle (couleur, badges, ordre)' })
  updateRoomDesign(@Param('id') id: string, @Body() dto: { color_hex?: string; equipment_badges?: string[]; grid_order?: number; compressor_power_kw?: number }, @CurrentUser() user: any) {
    return this.storageService.updateRoomDesign(id, dto, user.id);
  }

  @Patch('rooms/:id/toggle-availability')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Activer/Désactiver une salle en maintenance' })
  toggleRoomAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storageService.toggleRoomAvailability(id, user.id);
  }

  // ── Client Ledger & Payment Records ──────────────────────────────────────

  @Get('reports/client-ledger')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Ledger unifié des dettes clients groupé par numéro de téléphone' })
  getClientLedger(@CurrentUser() user: any) {
    return this.storageService.getClientLedger(user.id);
  }

  @Get('clients')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Rapport "Mes Clients" avec calcul des jours de retard' })
  getClientsReport(@CurrentUser() user: any) {
    return this.storageService.getClientLedger(user.id);
  }

  @Patch('rooms/:id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mise à jour complète d une salle de stockage' })
  updateRoom(@Param('id') id: string, @Body() dto: Partial<CreateStorageRoomDto>, @CurrentUser() user: any) {
    return this.storageService.updateRoom(id, dto, user.id);
  }

  @Delete('rooms/:id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Désactiver (soft-delete) une salle de stockage' })
  softDeleteRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storageService.softDeleteRoom(id, user.id);
  }

  @Patch('reservations/:id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier une réservation en cours (capacité occupée, dates, client)' })
  updateReservation(
    @Param('id') id: string,
    @Body() dto: { occupied_capacity?: number; start_date?: string; end_date?: string; client_name?: string; client_phone?: string },
    @CurrentUser() user: any,
  ) {
    return this.storageService.updateReservation(id, dto, user.id);
  }

  @Post('reservations/:id/record-payment')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Enregistrer un paiement client (règlement dette)' })
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: any) {
    return this.storageService.recordPayment(id, dto, user.id);
  }

  // ── Public Search & Booking ──────────────────────────────────────────────

  @Get('facilities/search')
  @ApiOperation({ summary: 'Recherche paginée de chambres froides disponibles' })
  searchFacilities(@Query() query: QueryStorageFacilityDto) {
    return this.storageService.searchFacilities(query);
  }

  @Post('reservations')
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.ADMIN)
  // TODO: sprint Unité de Transformation — ajouter Role.UNITE_TRANSFORMATION ici quand le rôle existera
  @ApiOperation({ summary: 'Créer une demande de réservation de capacité de chambre froide' })
  createReservation(@Body() dto: CreateStorageReservationDto, @CurrentUser() user: any) {
    return this.storageService.createReservation(dto, user.id);
  }

  // ── Reservation Lifecycle & Revenue Reports ──────────────────────────────

  @Patch('reservations/:id/accept')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Accepter une demande de réservation' })
  acceptReservation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storageService.acceptReservation(id, user.id);
  }

  @Patch('reservations/:id/reject')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Refuser une demande de réservation' })
  rejectReservation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storageService.rejectReservation(id, user.id);
  }

  @Get('reservations/owner')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Liste des réservations de mes chambres froides' })
  getOwnerReservations(@CurrentUser() user: any, @Query() query: QueryStorageReservationDto) {
    return this.storageService.getOwnerReservations(user.id, query);
  }

  @Get('reservations/my-rentals')
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Mes demandes et réservations de chambre froide' })
  getLesseeReservations(@CurrentUser() user: any, @Query() query: QueryStorageReservationDto) {
    return this.storageService.getLesseeReservations(user.id, query);
  }

  @Get('revenue/summary')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Résumé du chiffre d affaires, coût STEG et conseils intelligents' })
  getRevenueSummary(@CurrentUser() user: any) {
    return this.storageService.getRevenueSummary(user.id);
  }
}
