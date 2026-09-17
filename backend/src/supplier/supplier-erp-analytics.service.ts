import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SupplierErpAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getErpDashboard(supplierId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // 1. Revenue this month
      const revThisMonthRes = await queryRunner.manager.query(`
        SELECT COALESCE(SUM(total_tnd), 0) as total
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status != 'CANCELLED' 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      `, [supplierId]);
      const revenueThisMonth = Number(revThisMonthRes[0]?.total || 0);

      // 2. Revenue last month
      const revLastMonthRes = await queryRunner.manager.query(`
        SELECT COALESCE(SUM(total_tnd), 0) as total
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status != 'CANCELLED' 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      `, [supplierId]);
      const revenueLastMonth = Number(revLastMonthRes[0]?.total || 0);

      // 3. Revenue trend (last 6 months)
      const trend = await queryRunner.manager.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          SUM(total_tnd) as revenue,
          COUNT(*) as invoice_count
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status != 'CANCELLED'
        AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `, [supplierId]);

      // 4. Purchase spending this month
      const purchasesRes = await queryRunner.manager.query(`
        SELECT COALESCE(SUM(total_tnd), 0) as total
        FROM supplier_purchase_orders
        WHERE supplier_id = $1 AND status IN ('RECEIVED', 'PARTIAL_RECEIVED')
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      `, [supplierId]);
      const purchaseSpendingThisMonth = Number(purchasesRes[0]?.total || 0);

      // 5. Gross margin
      let grossMarginPct = 0;
      if (revenueThisMonth > 0) {
        grossMarginPct = ((revenueThisMonth - purchaseSpendingThisMonth) / revenueThisMonth) * 100;
      }

      // 6. Platform vs Manual split this month
      const split = await queryRunner.manager.query(`
        SELECT invoice_type, COALESCE(SUM(total_tnd), 0) as total
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status != 'CANCELLED'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        GROUP BY invoice_type
      `, [supplierId]);

      let platformRevenue = 0;
      let manualRevenue = 0;
      split.forEach((s: any) => {
        if (s.invoice_type === 'PLATFORM_ORDER') platformRevenue = Number(s.total);
        if (s.invoice_type === 'MANUAL') manualRevenue = Number(s.total);
      });

      // 7. Top 5 clients
      const topClients = await queryRunner.manager.query(`
        SELECT client_name, SUM(total_tnd) as total, COUNT(*) as invoices
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status != 'CANCELLED'
        GROUP BY client_name
        ORDER BY total DESC
        LIMIT 5
      `, [supplierId]);

      // 8. Overdue amount
      const overdueRes = await queryRunner.manager.query(`
        SELECT COALESCE(SUM(total_tnd - amount_paid_tnd), 0) as total
        FROM supplier_invoices
        WHERE supplier_id = $1 AND status IN ('SENT', 'PARTIAL') AND due_date < NOW()
      `, [supplierId]);
      const overdueAmount = Number(overdueRes[0]?.total || 0);

      return {
        revenue_this_month: revenueThisMonth,
        revenue_last_month: revenueLastMonth,
        revenue_growth_pct: revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0,
        purchase_spending_this_month: purchaseSpendingThisMonth,
        gross_margin_pct: grossMarginPct,
        overdue_amount: overdueAmount,
        trend,
        split_this_month: {
          platform: platformRevenue,
          manual: manualRevenue
        },
        top_clients: topClients
      };
    } finally {
      await queryRunner.release();
    }
  }
}
