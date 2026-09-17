import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CooperativesService } from './cooperatives.service';
import { ParcelsService } from '../parcels/parcels.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Coopératives')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cooperatives')
export class CooperativesController {
  constructor(
    private readonly service: CooperativesService,
    private readonly parcelsService: ParcelsService
  ) {}

  @Post()
  @Roles(Role.COOP_PRESIDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Créer une coopérative SMSA' })
  create(@Body() dto: CreateCooperativeDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get('my/stats')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Statistiques de ma coopérative' })
  getStats(@CurrentUser() user: any) {
    return this.service.getCoopStats(user.id);
  }

  @Get('my/map-data')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Données de la carte pour toutes les parcelles de la coopérative' })
  getMapData(@CurrentUser() user: any) {
    return this.parcelsService.getCoopMapData(user.cooperative_id || user.id);
  }

  @Get('my/activity-feed')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Flux d\'activité de ma coopérative' })
  getActivityFeed(@CurrentUser() user: any, @Query('limit') limit = 20) {
    return this.service.getActivityFeed(user.id, +limit);
  }

  @Get('my/members')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Liste les agriculteurs de ma coopérative' })
  getMyMembers(@CurrentUser() user: any) {
    return this.service.getMyMembers(user.id);
  }

  @Post('my/members')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Ajouter un agriculteur à ma coopérative' })
  addMember(@Body() memberData: any, @CurrentUser() user: any) {
    return this.service.addMember(user.id, memberData);
  }

  @Post('my/broadcast')
  @Roles(Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Envoyer une alerte à tous les membres' })
  broadcastToMembers(@Body() data: { message: string }, @CurrentUser() user: any) {
    return this.service.broadcastToMembers(user.id, data.message);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COOP_PRESIDENT, Role.EXPERT)
  @ApiOperation({ summary: 'Liste toutes les coopératives' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une coopérative' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @Roles(Role.COOP_PRESIDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier une coopérative' })
  update(@Param('id') id: string, @Body() dto: CreateCooperativeDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Supprimer une coopérative' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
