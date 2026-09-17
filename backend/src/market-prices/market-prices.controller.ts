import { Controller, Get, Query, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketPricesService } from './market-prices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Prix du Marché')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market-prices')
export class MarketPricesController {
  constructor(private readonly service: MarketPricesService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900000) // 15 minutes
  @ApiOperation({ summary: 'Récupérer les cours actuels du marché' })
  getCurrent() {
    return this.service.getCurrentPrices();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Récupérer l\'historique des prix pour une culture' })
  getTrends(@Query('crop_type') cropType: string) {
    return this.service.getTrends(cropType);
  }

  @Get('forecast/:crop_type')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  @ApiOperation({ summary: 'Prévisions des prix à 30 jours (via Gemini)' })
  getForecast(@Param('crop_type') cropType: string) {
    return this.service.getForecast(cropType);
  }
}
