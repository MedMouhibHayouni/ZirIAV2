import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { SupplierAnalyticsService } from './supplier-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('supplier/analytics')
@UseGuards(JwtAuthGuard)
export class SupplierAnalyticsController {
  constructor(private readonly analyticsService: SupplierAnalyticsService) {}

  @Get('basic')
  getBasicAnalytics(@Request() req) {
    return this.analyticsService.getBasicAnalytics(req.user.id);
  }

  @Get('advanced')
  getAdvancedAnalytics(@Request() req) {
    return this.analyticsService.getAdvancedAnalytics(req.user.id);
  }
}
