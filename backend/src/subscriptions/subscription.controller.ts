import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscribeDto, PurchaseFeatureDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyPlan(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getUserActivePlan(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(@CurrentUser('id') userId: string, @Body() dto: SubscribeDto) {
    return this.subscriptionService.subscribeToPlan(userId, dto.plan_code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('purchase-feature')
  async purchaseFeature(@CurrentUser('id') userId: string, @Body() dto: PurchaseFeatureDto) {
    return this.subscriptionService.purchaseFeature(userId, dto.feature_type);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check/:limit_type')
  async checkLimit(
    @CurrentUser('id') userId: string,
    @Param('limit_type') limitType: 'listings' | 'parcels' | 'diagnostics',
  ) {
    return this.subscriptionService.checkLimit(userId, limitType);
  }
}
