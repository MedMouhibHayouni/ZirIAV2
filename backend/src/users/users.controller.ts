import { Controller, Get, Param, Patch, Delete, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { FarmerActivityType } from '../common/enums/farmer-activity-type.enum';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Liste les utilisateurs avec filtres (ADMIN/COOP)' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'cooperative_id', required: false })
  findAll(
    @Query('role') role?: string,
    @Query('cooperative_id') cooperativeId?: string,
    @Request() req?: any,
  ) {
    // Si coop_president et cooperative_id === 'me', on utilise son propre ID de coop
    const effectiveCoopId = (cooperativeId === 'me' && req.user.role === Role.COOP_PRESIDENT)
      ? req.user.cooperative_id
      : cooperativeId;

    return this.usersService.findAll(role, effectiveCoopId);
  }

  @Get('nearby-farmers')
  @Roles(Role.FARMER_AMBASSADOR, Role.ADMIN, Role.EXPERT)
  @ApiOperation({ summary: '[AMBASSADOR] Agriculteurs proches via géolocalisation' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radius_km', required: false, type: Number })
  getNearbyFarmers(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius_km') radiusKm = 10,
  ) {
    return this.usersService.findNearbyFarmers(+lat, +lng, +radiusKm);
  }

  @Patch('availability')
  @ApiOperation({ summary: '[WORKER] Mettre à jour les dates de disponibilité' })
  updateAvailability(@Request() req, @Body('available_dates') dates: string[]) {
    return this.usersService.updateAvailability(req.user.sub, dates);
  }

  @Delete('me/gdpr-erasure')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'INPDP: Droit à l\'oubli (Anonymisation des PII)' })
  async gdprErasure(@Request() req) {
    return this.usersService.anonymizeUser(req.user.id || req.user.sub);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Mettre à jour son profil utilisateur et informations spécifiques' })
  async updateProfile(@Request() req, @Body() dto: any) {
    const userId = req.user.sub || req.user.id;
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/activity-type')
  @ApiOperation({ summary: '[FARMER] Déclarer le type d\'activité agricole (onboarding)' })
  async setActivityType(
    @Request() req,
    @Body('activity_type') activityType: FarmerActivityType,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.usersService.setActivityType(userId, activityType);
  }

  @Get('experts')
  @ApiOperation({ summary: 'Liste tous les experts certifiés disponibles' })
  findExperts() {
    return this.usersService.findAll('EXPERT');
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Détails d\'un utilisateur' })
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Modifier un utilisateur' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Supprimer un utilisateur' })
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
