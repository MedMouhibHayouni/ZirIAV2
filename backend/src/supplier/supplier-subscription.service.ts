import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SupplierPlanFeature } from './entities/supplier-plan-feature.entity';
import { SupplierSubscription, SupplierSubscriptionStatus } from './entities/supplier-subscription.entity';

@Injectable()
export class SupplierSubscriptionService implements OnModuleInit {
  constructor(
    @InjectRepository(SupplierPlanFeature)
    private readonly planRepo: Repository<SupplierPlanFeature>,
    @InjectRepository(SupplierSubscription)
    private readonly subRepo: Repository<SupplierSubscription>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const count = await this.planRepo.count();
    if (count === 0) {
      console.log('Seeding Supplier Plans...');
      const plans = [
        {
          plan_code: 'VITRINE_BASIC',
          price_tnd_monthly: 19.0,
          name_fr: 'Vitrine Essentielle',
          description_fr: 'Votre boutique en ligne de base',
          features_json: ['vitrine_page', 'product_catalog', 'contact_display', '5_photos'],
        },
        {
          plan_code: 'VITRINE_PRO',
          price_tnd_monthly: 49.0,
          name_fr: 'Vitrine Professionnelle',
          description_fr: 'Pour attirer plus de clients avec une marque forte',
          features_json: ['vitrine_page', 'product_catalog', 'contact_display', '30_photos', 'custom_theme_color', 'cover_photo', 'promotions', 'reviews', 'governorate_targeting'],
        },
        {
          plan_code: 'ERP_STARTER',
          price_tnd_monthly: 89.0,
          name_fr: 'ERP Débutant',
          description_fr: 'Gérez vos commandes et votre facturation',
          features_json: ['vitrine_page', 'product_catalog', 'contact_display', '30_photos', 'custom_theme_color', 'cover_photo', 'promotions', 'reviews', 'governorate_targeting', 'order_management', 'stock_alerts', 'basic_analytics', 'pdf_invoice'],
        },
        {
          plan_code: 'ERP_FULL',
          price_tnd_monthly: 149.0,
          name_fr: 'ERP Complet',
          description_fr: 'L\'outil ultime pour propulser votre entreprise',
          features_json: ['vitrine_page', 'product_catalog', 'contact_display', '30_photos', 'custom_theme_color', 'cover_photo', 'promotions', 'reviews', 'governorate_targeting', 'order_management', 'stock_alerts', 'advanced_analytics', 'pdf_invoice', 'facture_management', 'client_crm', 'revenue_charts', 'export_data', 'api_access'],
        },
      ];
      await this.planRepo.save(plans);
    }
  }

  async getAllSupplierPlans(): Promise<SupplierPlanFeature[]> {
    return this.planRepo.find({ order: { price_tnd_monthly: 'ASC' } });
  }

  async getSupplierActivePlan(supplierId: string): Promise<any> {
    const sub = await this.subRepo.findOne({
      where: { supplier_id: supplierId, status: SupplierSubscriptionStatus.ACTIVE },
    });
    if (!sub) return null;
    const plan = await this.planRepo.findOne({ where: { plan_code: sub.plan_code } });
    return { ...sub, plan };
  }

  async subscribeToPlan(supplierId: string, planCode: string): Promise<any> {
    const plan = await this.planRepo.findOne({ where: { plan_code: planCode } });
    if (!plan) throw new Error('Plan introuvable');

    return await this.dataSource.transaction(async (manager) => {
      // Cancel active
      await manager.update(
        SupplierSubscription,
        { supplier_id: supplierId, status: SupplierSubscriptionStatus.ACTIVE },
        { status: SupplierSubscriptionStatus.CANCELLED }
      );

      // Create new
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const sub = manager.create(SupplierSubscription, {
        supplier_id: supplierId,
        plan_code: planCode,
        status: SupplierSubscriptionStatus.ACTIVE,
        expires_at: expiresAt,
      });
      const saved = await manager.save(sub);
      return { ...saved, plan };
    });
  }

  async cancelSubscription(supplierId: string): Promise<{ success: boolean }> {
    await this.subRepo.update(
      { supplier_id: supplierId, status: SupplierSubscriptionStatus.ACTIVE },
      { status: SupplierSubscriptionStatus.CANCELLED }
    );
    return { success: true };
  }

  async hasFeature(supplierId: string, featureKey: string): Promise<boolean> {
    const active = await this.getSupplierActivePlan(supplierId);
    if (!active || !active.plan) return false;
    return active.plan.features_json.includes(featureKey);
  }

  async getSupplierBillingHistory(supplierId: string): Promise<SupplierSubscription[]> {
    return this.subRepo.find({
      where: { supplier_id: supplierId },
      order: { started_at: 'DESC' },
    });
  }
}
