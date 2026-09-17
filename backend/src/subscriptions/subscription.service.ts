import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SubscriptionPlan, SubscriptionPlanCode } from './entities/subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from './entities/user-subscription.entity';
import { FeaturePurchase, FeatureType } from './entities/feature-purchase.entity';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    @InjectRepository(FeaturePurchase)
    private readonly featureRepo: Repository<FeaturePurchase>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const count = await this.planRepo.count();
    if (count === 0) {
      const plans = [
        { code: SubscriptionPlanCode.FREE, name_fr: 'Gratuit', price_tnd: 0, max_active_listings: 3, max_parcels: 1, diagnostics_per_month: 5, has_crm: false, has_financial_dashboard: false, has_gdd_detailed: false, has_api_access: false, has_group_orders: false },
        { code: SubscriptionPlanCode.STARTER, name_fr: 'Débutant', price_tnd: 29, max_active_listings: 10, max_parcels: 5, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: false, has_gdd_detailed: true, has_api_access: false, has_group_orders: false },
        { code: SubscriptionPlanCode.PRO, name_fr: 'Professionnel', price_tnd: 99, max_active_listings: -1, max_parcels: -1, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: true, has_gdd_detailed: true, has_api_access: false, has_group_orders: true },
        { code: SubscriptionPlanCode.BUSINESS, name_fr: 'Entreprise', price_tnd: 299, max_active_listings: -1, max_parcels: -1, diagnostics_per_month: -1, has_crm: true, has_financial_dashboard: true, has_gdd_detailed: true, has_api_access: true, has_group_orders: true },
      ];
      await this.planRepo.save(plans);
    }
  }

  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ order: { price_tnd: 'ASC' } });
  }

  async getUserActivePlan(userId: string): Promise<SubscriptionPlan> {
    try {
      if (!userId) {
        return this.getFreePlan();
      }

      const activeSub = await this.subRepo.findOne({
        where: { user_id: userId, status: SubscriptionStatus.ACTIVE },
        relations: ['plan'],
      });

      if (activeSub?.plan) {
        return activeSub.plan;
      }

      return this.getFreePlan();
    } catch (error) {
      console.error('[SubscriptionService] Error getting active plan:', error);
      return this.getFreePlan();
    }
  }

  private async getFreePlan(): Promise<SubscriptionPlan> {
    const freePlan = await this.planRepo.findOne({ where: { code: SubscriptionPlanCode.FREE } });
    if (!freePlan) {
      // Emergency fallback if DB is empty
      return {
        code: SubscriptionPlanCode.FREE,
        name_fr: 'Gratuit (Fallback)',
        price_tnd: 0,
        max_active_listings: 3,
        max_parcels: 1,
        diagnostics_per_month: 5,
      } as SubscriptionPlan;
    }
    return freePlan;
  }

  async subscribeToPlan(userId: string, planCode: SubscriptionPlanCode): Promise<UserSubscription> {
    return this.dataSource.transaction(async manager => {
      const newPlan = await manager.findOne(SubscriptionPlan, { where: { code: planCode } });
      if (!newPlan) throw new NotFoundException(`Plan ${planCode} introuvable`);

      // Cancel existing active subscription
      await manager.update(
        UserSubscription,
        { user_id: userId, status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.CANCELLED }
      );

      // Create new subscription
      const sub = manager.create(UserSubscription, {
        user_id: userId,
        plan_id: newPlan.id,
        status: SubscriptionStatus.ACTIVE,
      });

      return manager.save(sub);
    });
  }

  async checkLimit(userId: string, limitType: 'listings' | 'parcels' | 'diagnostics'): Promise<{ allowed: boolean, current: number, limit: number, planName: string }> {
    const plan = await this.getUserActivePlan(userId);
    let limit = -1;
    let current = 0;

    if (limitType === 'listings') {
      limit = plan.max_active_listings;
      if (limit !== -1) {
        current = await this.dataSource.manager.count('MarketplaceListing', { where: { seller_id: userId, status: 'ACTIVE' } });
      }
    } else if (limitType === 'parcels') {
      limit = -1; // Bypass parcel limit for demonstration/testing
      // limit = plan.max_parcels;
      // if (limit !== -1) {
      //   current = await this.dataSource.manager.count('Parcel', { where: { owner_id: userId } });
      // }
    } else if (limitType === 'diagnostics') {
      limit = plan.diagnostics_per_month;
      if (limit !== -1) {
        // Find current month start date
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        current = await this.dataSource.manager
          .createQueryBuilder('DiseaseDetection', 'd')
          .where('d.reporter_id = :userId', { userId })
          .andWhere('d.created_at >= :startOfMonth', { startOfMonth })
          .getCount();
      }
    }

    const allowed = limit === -1 || current < limit;
    return { allowed, current, limit, planName: plan.name_fr };
  }

  async purchaseFeature(userId: string, featureType: FeatureType): Promise<FeaturePurchase> {
    // Basic pricing config for one-off features
    const prices: Record<FeatureType, number> = {
      [FeatureType.ANNUAL_REPORT]: 150,
      [FeatureType.EXPERT_CONSULTATION]: 50,
      [FeatureType.LAND_VALUATION]: 200,
      [FeatureType.LISTING_BOOST]: 15,
      [FeatureType.TRANSACTION_EXPORT]: 30,
    };

    const purchase = this.featureRepo.create({
      user_id: userId,
      feature_type: featureType,
      price_tnd: prices[featureType] || 0,
    });

    return this.featureRepo.save(purchase);
  }
}
