import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductOrder } from './entities/product-order.entity';
import { SupplierSubscriptionService } from './supplier-subscription.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SupplierAnalyticsService {
  constructor(
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    private readonly subService: SupplierSubscriptionService,
    private readonly dataSource: DataSource,
  ) {}

  async getBasicAnalytics(supplierId: string) {
    const hasFeature = await this.subService.hasFeature(supplierId, 'basic_analytics');
    if (!hasFeature) {
      throw new ForbiddenException('Activez l\'ERP Starter pour voir vos analytiques');
    }

    // Orders by status (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersByStatusRaw = await this.orderRepo.createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.created_at >= :date', { date: thirtyDaysAgo })
      .groupBy('o.status')
      .getRawMany();

    const ordersByStatus = ordersByStatusRaw.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count, 10);
      return acc;
    }, {});

    // Top 5 products by revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const topProducts = await this.orderRepo.createQueryBuilder('o')
      .select('p.name', 'product_name')
      .addSelect('SUM(o.total_price_tnd)', 'revenue')
      .innerJoin('o.product', 'p')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.created_at >= :date', { date: startOfMonth })
      .andWhere('o.status != :status', { status: 'CANCELLED' })
      .groupBy('p.name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    // Revenue last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const revenueRaw = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_price_tnd) as revenue
      FROM product_orders
      WHERE supplier_id = $1 AND created_at >= $2 AND status != 'CANCELLED'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `, [supplierId, sixMonthsAgo]);

    return {
      ordersByStatus,
      topProducts: topProducts.map(tp => ({ name: tp.product_name, revenue: parseFloat(tp.revenue) })),
      revenueLast6Months: revenueRaw.map(r => ({ month: r.month, revenue: parseFloat(r.revenue || '0') })),
    };
  }

  async getAdvancedAnalytics(supplierId: string) {
    const hasFeature = await this.subService.hasFeature(supplierId, 'advanced_analytics');
    if (!hasFeature) {
      throw new ForbiddenException('Activez l\'ERP Complet pour voir les analytiques avancées');
    }

    const basic = await this.getBasicAnalytics(supplierId);

    // Top buyers
    const topBuyers = await this.orderRepo.createQueryBuilder('o')
      .select('u.name', 'buyer_name')
      .addSelect('COUNT(o.id)', 'orders_count')
      .addSelect('SUM(o.total_price_tnd)', 'total_spent')
      .addSelect('MAX(o.created_at)', 'last_order')
      .innerJoin(User, 'u', 'u.id = o.buyer_id')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.status != :status', { status: 'CANCELLED' })
      .groupBy('u.name')
      .orderBy('total_spent', 'DESC')
      .limit(5)
      .getRawMany();

    // Average order value
    const aovRaw = await this.orderRepo.createQueryBuilder('o')
      .select('AVG(o.total_price_tnd)', 'aov')
      .where('o.supplier_id = :supplierId', { supplierId })
      .andWhere('o.status != :status', { status: 'CANCELLED' })
      .getRawOne();
    
    // Governorate distribution
    const govDistribution = await this.orderRepo.createQueryBuilder('o')
      .select('u.governorate', 'governorate')
      .addSelect('COUNT(o.id)', 'count')
      .innerJoin(User, 'u', 'u.id = o.buyer_id')
      .where('o.supplier_id = :supplierId', { supplierId })
      .groupBy('u.governorate')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      ...basic,
      topBuyers: topBuyers.map(tb => ({
        name: tb.buyer_name,
        orders_count: parseInt(tb.orders_count, 10),
        total_spent: parseFloat(tb.total_spent),
        last_order: tb.last_order
      })),
      averageOrderValue: aovRaw?.aov ? parseFloat(aovRaw.aov) : 0,
      governorateDistribution: govDistribution.map(g => ({
        governorate: g.governorate || 'Inconnu',
        count: parseInt(g.count, 10)
      }))
    };
  }
}
