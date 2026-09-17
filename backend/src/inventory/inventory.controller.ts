import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MovementType } from './entities/inventory-movement.entity';

@ApiTags('Gestion des Stocks (ERP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('my')
  @ApiOperation({ summary: 'Voir mon inventaire de stock' })
  getMyInventory(@Request() req) {
    return this.inventoryService.getMyInventory(req.user.id || req.user.sub);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques ERP du stock (valeur totale, alertes, mouvements récents)' })
  getMyStats(@Request() req) {
    return this.inventoryService.getInventoryStats(req.user.id || req.user.sub);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Historique des mouvements de stock' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMovements(@Request() req, @Query('limit') limit?: number) {
    return this.inventoryService.getMovementHistory(req.user.id || req.user.sub, limit ? Number(limit) : 20);
  }

  @Post('movement')
  @ApiOperation({ summary: 'Enregistrer un mouvement de stock (Entrée/Sortie)' })
  recordMovement(@Request() req, @Body() dto: {
    crop_type: string;
    quantity: number;
    type: MovementType;
    reason?: string;
    unit_price_tnd?: number;
  }) {
    return this.inventoryService.recordMovement(req.user.id || req.user.sub, dto);
  }
}
