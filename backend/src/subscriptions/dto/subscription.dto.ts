import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionPlanCode } from '../entities/subscription-plan.entity';
import { FeatureType } from '../entities/feature-purchase.entity';

export class SubscribeDto {
  @IsEnum(SubscriptionPlanCode)
  @IsNotEmpty()
  plan_code: SubscriptionPlanCode;
}

export class PurchaseFeatureDto {
  @IsEnum(FeatureType)
  @IsNotEmpty()
  feature_type: FeatureType;
}
