import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/equipment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Équipements Agricoles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post()
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Publier un équipement à louer' })
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get('my')
  @Roles(Role.EQUIP_OWNER)
  @ApiOperation({ summary: 'Ma flotte d\'équipements' })
  getMyEquipment(@CurrentUser() user: any) {
    return this.service.findByOwner(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des équipements disponibles ou appartenant à l utilisateur' })
  @ApiQuery({ name: 'owner', required: false, type: Boolean })
  findAll(@Query('owner') owner?: boolean, @CurrentUser() user?: any) { 
    if (owner && user) {
      return this.service.findByOwner(user.id);
    }
    return this.service.findAll(); 
  }

  @Get('available')
  @ApiOperation({ summary: 'Rechercher des équipements disponibles' })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAvailable(
    @Query('governorate') governorate?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getAvailable(governorate, startDate, endDate);
  }

  @Patch(':id/toggle-availability')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Basculer la disponibilité de l équipement' })
  toggleAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.toggleAvailability(id, user.id);
  }

  @Get('reservations')
  @Roles(Role.EQUIP_OWNER, Role.FARMER, Role.COOP_PRESIDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Toutes les réservations de ma flotte ou mes propres réservations (locations)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'myRentals', required: false, type: Boolean })
  getMyReservations(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('myRentals') myRentals?: boolean | string
  ) {
    const isMyRentals = myRentals === true || myRentals === 'true';
    if (isMyRentals) {
      return this.service.getLesseeReservations(user.id, status);
    }
    
    // Access control for fleet/owner reservations: must be EQUIP_OWNER or ADMIN
    if (user.role !== Role.EQUIP_OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Seul le propriétaire de l'équipement ou un administrateur peut voir la flotte de réservations.");
    }
    return this.service.getOwnerReservations(user.id, status);
  }

  @Get('requests/pending')
  @Roles(Role.EQUIP_OWNER)
  @ApiOperation({ summary: 'Demandes de réservation en attente pour ma flotte' })
  getPendingReservations(@CurrentUser() user: any) {
    return this.service.getPendingReservations(user.id);
  }

  @Get('revenue/summary')
  @Roles(Role.EQUIP_OWNER)
  @ApiOperation({ summary: 'Résumé des revenus de location' })
  @ApiQuery({ name: 'period', required: false, type: String })
  getRevenueSummary(@CurrentUser() user: any, @Query('period') period?: string) {
    return this.service.getRevenueSummary(user.id, period);
  }

  @Patch('reservations/:id/accept')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accepter une demande de réservation' })
  approveReservation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.updateReservationStatus(id, 'APPROVED', user.id);
  }

  @Patch('reservations/:id/reject')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refuser une demande de réservation' })
  rejectReservation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.updateReservationStatus(id, 'REJECTED', user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un équipement' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/reserve')
  @Roles(Role.FARMER, Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Demander une location' })
  reserve(
    @Param('id') id: string, 
    @Body('start_date') startDate: string,
    @Body('end_date') endDate: string,
    @CurrentUser() user: any
  ) {
    return this.service.bookEquipment(id, user.id, new Date(startDate), new Date(endDate));
  }

  @Patch(':id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: CreateEquipmentDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Delete(':id')
  @Roles(Role.EQUIP_OWNER, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id, user.role === Role.ADMIN);
  }
}
