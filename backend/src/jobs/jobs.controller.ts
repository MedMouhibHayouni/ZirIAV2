import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobStatusDto } from './dto/job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Emplois Saisonniers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post()
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Publier une offre d\'emploi saisonnier' })
  create(@Body() dto: CreateJobDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(Role.AGRI_WORKER, Role.ADMIN, Role.COOP_PRESIDENT)
  @ApiOperation({ summary: 'Liste des offres ouvertes pour les travailleurs saisonniers' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une offre d\'emploi' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id/status')
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une offre (OPEN/FILLED/CLOSED)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles(Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
