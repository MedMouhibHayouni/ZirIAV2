import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { Product } from './entities/product.entity';
import { SupplierPromotion } from './entities/supplier-promotion.entity';
import { ProductOrder } from './entities/product-order.entity';
import { NotificationModule } from '../notifications/notification.module';
import { UsersModule } from '../users/users.module';

import { SupplierReview } from './entities/supplier-review.entity';
import { SupplierPlanFeature } from './entities/supplier-plan-feature.entity';
import { SupplierSubscription } from './entities/supplier-subscription.entity';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { SupplierStockMovement } from './entities/supplier-stock-movement.entity';
import { SupplierPurchaseOrder } from './entities/supplier-purchase-order.entity';

import { SupplierCrmClient } from './entities/supplier-crm-client.entity';
import { SupplierCrmNote } from './entities/supplier-crm-note.entity';
import { SupplierCrmReminder } from './entities/supplier-crm-reminder.entity';

import { SupplierVitrineService } from './supplier-vitrine.service';
import { SupplierSubscriptionService } from './supplier-subscription.service';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierAnalyticsService } from './supplier-analytics.service';
import { SupplierCrmService } from './supplier-crm.service';

import { SupplierVitrineController } from './supplier-vitrine.controller';
import { SupplierSubscriptionController } from './supplier-subscription.controller';
import { SupplierAnalyticsController } from './supplier-analytics.controller';

import { SupplierPurchaseService } from './supplier-purchase.service';
import { SupplierStockService } from './supplier-stock.service';
import { SupplierErpAnalyticsService } from './supplier-erp-analytics.service';
import { SupplierPdfService } from './supplier-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product, 
      SupplierPromotion, 
      ProductOrder,
      SupplierReview,
      SupplierPlanFeature,
      SupplierSubscription,
      SupplierInvoice,
      SupplierStockMovement,
      SupplierPurchaseOrder,
      SupplierCrmClient,
      SupplierCrmNote,
      SupplierCrmReminder
    ]),
    NotificationModule,
    UsersModule,
  ],
  controllers: [
    SupplierController,
    SupplierVitrineController,
    SupplierSubscriptionController,
    SupplierAnalyticsController,
  ],
  providers: [
    SupplierService,
    SupplierVitrineService,
    SupplierSubscriptionService,
    SupplierInvoiceService,
    SupplierAnalyticsService,
    SupplierPurchaseService,
    SupplierStockService,
    SupplierErpAnalyticsService,
    SupplierPdfService,
    SupplierCrmService,
  ],
  exports: [SupplierService, SupplierSubscriptionService, SupplierVitrineService, SupplierInvoiceService, SupplierCrmService],
})
export class SupplierModule {}
