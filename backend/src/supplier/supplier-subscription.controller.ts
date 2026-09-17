import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { SupplierSubscriptionService } from './supplier-subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('supplier/plans')
@UseGuards(JwtAuthGuard)
export class SupplierSubscriptionController {
  constructor(private readonly subService: SupplierSubscriptionService) {}

  @Public()
  @Get()
  getAllSupplierPlans() {
    return this.subService.getAllSupplierPlans();
  }

  @Get('my-subscription')
  async getMySubscription(@Request() req) {
    const sub = await this.subService.getSupplierActivePlan(req.user.id);
    return sub || { plan: null };
  }

  @Get('history')
  getBillingHistory(@Request() req) {
    return this.subService.getSupplierBillingHistory(req.user.id);
  }

  @Post('subscribe/:planCode')
  subscribeToPlan(@Request() req, @Param('planCode') planCode: string) {
    return this.subService.subscribeToPlan(req.user.id, planCode);
  }

  @Post('cancel')
  cancelSubscription(@Request() req) {
    return this.subService.cancelSubscription(req.user.id);
  }
}
