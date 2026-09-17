import {
  Controller, Get, Post, Body, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus, Param, Res
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { WalletService } from './wallet.service';
import { CommissionTransactionType } from './entities/platform-commission.entity';
import { FinancialRecord } from './entities/financial-record.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Finance & Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly walletService: WalletService,
  ) {}

  @Get('wallet/summary')
  @ApiOperation({ summary: 'Consulter le solde et les transactions de mon portefeuille' })
  getWalletSummary(@Request() req) {
    return this.walletService.getWalletSummary(req.user.id || req.user.sub);
  }

  // ─── GRAND LIVRE FINANCIER (Utilisateurs) ─────────────────────────────────

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter une transaction manuelle' })
  addRecord(@Request() req, @Body() dto: Partial<FinancialRecord>) {
    return this.financeService.addRecord(req.user.id || req.user.sub, dto);
  }

  @Get('records/me')
  @ApiOperation({ summary: 'Consulter mon historique de transactions' })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'Ex: month' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getMyRecords(
    @Request() req,
    @Query('period') period?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.financeService.findUserRecords(req.user.id || req.user.sub, period, page || 1, limit || 20);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export PDF des transactions des 30 derniers jours' })
  async exportPdf(@Request() req, @Res() res) {
    const pdfBuffer = await this.financeService.generateExportPdf(
      req.user.id || req.user.sub,
      req.user.name,
      req.user.governorate,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="releve-ziria.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('records/summary')
  @ApiOperation({ summary: 'Résumé mensuel pour le dossier de crédit (SMSA)' })
  getMonthlySummary(@Request() req) {
    return this.financeService.getMonthlySummary(req.user.id || req.user.sub);
  }

  // ─── COMMISSIONS PLATEFORME (ADMIN uniquement) ─────────────────────────────

  @Get('commissions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lister les commissions perçues (ADMIN)' })
  @ApiQuery({ name: 'type', required: false, enum: CommissionTransactionType })
  findAllCommissions(@Query('type') type?: CommissionTransactionType) {
    return this.financeService.findAllCommissions(type);
  }

  @Get('commissions/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Statistiques globales des commissions (ADMIN)' })
  getCommissionStats() {
    return this.financeService.getCommissionStats();
  }
}
