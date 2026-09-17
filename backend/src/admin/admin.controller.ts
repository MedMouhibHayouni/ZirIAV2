import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, UseInterceptors, Delete } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Administration Globale')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COOP_PRESIDENT)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('kpis')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  @ApiOperation({ summary: 'Récupère les KPIs globaux de supervision' })
  getKpis() {
    return this.adminService.getKpis();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Récupère les transactions récentes (ADMIN)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'governorate', required: false })
  getRecentTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('governorate') governorate?: string,
  ) {
    return this.adminService.getRecentTransactions(+page, +limit, type, from, to, governorate);
  }

  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs avec filtres avancés (ADMIN)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'ACTIVE | SUSPENDED | DELETED' })
  @ApiQuery({ name: 'plan', required: false })
  @ApiQuery({ name: 'search', required: false })
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: string,
    @Query('governorate') governorate?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, role, governorate, status, plan, search);
  }

  @Get('users/pending-verification')
  @ApiOperation({ summary: 'Lister les utilisateurs en attente de vérification' })
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Get('experts-ambassadors')
  @ApiOperation({ summary: 'Lister les experts et ambassadeurs avec couverture par gouvernorat' })
  getExpertsAndAmbassadors() {
    return this.adminService.getExpertsAndAmbassadors();
  }

  @Get('users/:id')
  @ApiOperation({ summary: "Détails complets d'un utilisateur" })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get('users/:id/payment-history')
  @ApiOperation({ summary: "Historique complet des paiements et abonnements d'un utilisateur" })
  getUserPaymentHistory(@Param('id') id: string) {
    return this.adminService.getUserPaymentHistory(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur (Expert / Ambassadeur)' })
  @ApiBody({ schema: { example: { name: 'Dr. X', email: 'x@ziria.tn', phone: '+21600000000', governorate: 'Tunis', role: 'EXPERT', expert_type: 'AGRONOMIST', planId: '' } } })
  createUser(@Body() dto: any) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id/plan')
  @ApiOperation({ summary: "Changer le plan d'abonnement d'un utilisateur" })
  changeUserPlan(@Param('id') id: string, @Body('planId') planId: string) {
    return this.adminService.changeUserPlan(id, planId);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: "Changer le rôle d'un utilisateur" })
  changeUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.changeUserRole(id, role);
  }

  @Patch('users/:id/verify')
  @ApiOperation({ summary: 'Vérifier ou rejeter un compte utilisateur' })
  verifyUser(@Param('id') id: string, @Body('approved') approved: boolean) {
    return this.adminService.verifyUser(id, approved);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspendre un compte utilisateur' })
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Bannir définitivement un utilisateur' })
  banUser(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.banUser(id, reason);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Supprimer (soft delete) un compte utilisateur' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'État de santé du système (Hardware & DB)' })
  getHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('reports/bts')
  @ApiOperation({ summary: 'Rapport BTS mensuel sur 6 mois' })
  getBtsReport() {
    return this.adminService.getBtsReport();
  }
}
