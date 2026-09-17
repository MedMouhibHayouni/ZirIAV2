import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SupplierPurchaseOrder, PurchaseOrderStatus } from './entities/supplier-purchase-order.entity';
import { Product } from './entities/product.entity';
import { SupplierStockMovement, StockMovementType } from './entities/supplier-stock-movement.entity';

export class CreatePurchaseOrderDto {
  vendor_name: string;
  vendor_phone?: string;
  vendor_address?: string;
  reference_number?: string;
  expected_delivery_date?: Date;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>;
}

@Injectable()
export class SupplierPurchaseService {
  constructor(
    @InjectRepository(SupplierPurchaseOrder)
    private readonly purchaseRepo: Repository<SupplierPurchaseOrder>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(SupplierStockMovement)
    private readonly stockMovementRepo: Repository<SupplierStockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async createPurchaseOrder(supplierId: string, dto: CreatePurchaseOrderDto) {
    let subtotal = 0;
    const items = dto.items.map(i => {
      const lineTotal = Number(i.quantity) * Number(i.unit_price);
      subtotal += lineTotal;
      return {
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit || 'unité',
        unit_price: Number(i.unit_price),
        total: lineTotal,
      };
    });

    const taxAmount = subtotal * 0.19; // Default 19%
    const total = subtotal + taxAmount;

    const po = this.purchaseRepo.create({
      supplier_id: supplierId,
      vendor_name: dto.vendor_name,
      vendor_phone: dto.vendor_phone,
      vendor_address: dto.vendor_address,
      reference_number: dto.reference_number,
      expected_delivery_date: dto.expected_delivery_date,
      notes: dto.notes,
      items,
      subtotal_tnd: subtotal,
      tax_amount_tnd: taxAmount,
      total_tnd: total,
      status: PurchaseOrderStatus.ORDERED,
    });

    return this.purchaseRepo.save(po);
  }

  async getMyPurchaseOrders(supplierId: string, status?: string) {
    const where: any = { supplier_id: supplierId };
    if (status) where.status = status;
    return this.purchaseRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async receivePurchaseOrder(supplierId: string, purchaseOrderId: string, dto: { received_items: Array<{ description: string, quantity_received: number }>, notes?: string }) {
    const po = await this.purchaseRepo.findOne({ where: { id: purchaseOrderId, supplier_id: supplierId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === PurchaseOrderStatus.CANCELLED || po.status === PurchaseOrderStatus.RECEIVED) {
      throw new NotFoundException('Order is already received or cancelled');
    }

    let allFullyReceived = true;

    for (const poItem of po.items) {
      const receivedInput = dto.received_items.find(ri => ri.description === poItem.description);
      const qtyReceived = receivedInput ? Number(receivedInput.quantity_received) : 0;
      
      if (qtyReceived < poItem.quantity) {
        allFullyReceived = false;
      }

      if (qtyReceived > 0) {
        // Look up product in supplier's catalog to update stock
        const product = await this.productRepo.createQueryBuilder('p')
          .where('p.supplier_id = :supplierId', { supplierId })
          .andWhere('LOWER(p.name) = LOWER(:name)', { name: poItem.description })
          .getOne();

        if (product) {
          const qtyBefore = Number(product.stock_qty);
          const qtyAfter = qtyBefore + qtyReceived;
          
          await this.stockMovementRepo.save(
            this.stockMovementRepo.create({
              supplier_id: supplierId,
              product_id: product.id,
              movement_type: StockMovementType.PURCHASE_RECEIVED,
              quantity_change: qtyReceived,
              quantity_before: qtyBefore,
              quantity_after: qtyAfter,
              reference_id: po.id,
              notes: dto.notes,
              created_by_id: supplierId,
            })
          );
          product.stock_qty = qtyAfter;
          await this.productRepo.save(product);
        }
      }
    }

    if (allFullyReceived) {
      po.status = PurchaseOrderStatus.RECEIVED;
      po.received_at = new Date();
    } else {
      po.status = PurchaseOrderStatus.PARTIAL_RECEIVED;
    }
    
    if (dto.notes) {
      po.notes = po.notes ? `${po.notes}\n${dto.notes}` : dto.notes;
    }

    return this.purchaseRepo.save(po);
  }

  async cancelPurchaseOrder(supplierId: string, purchaseOrderId: string) {
    const po = await this.purchaseRepo.findOne({ where: { id: purchaseOrderId, supplier_id: supplierId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    
    po.status = PurchaseOrderStatus.CANCELLED;
    return this.purchaseRepo.save(po);
  }

  async getPurchaseStats(supplierId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const stats = await queryRunner.manager.query(`
        SELECT 
          COALESCE(SUM(total_tnd) FILTER (WHERE status IN ('RECEIVED', 'PARTIAL_RECEIVED') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())), 0) as spent_this_month,
          COUNT(*) FILTER (WHERE status = 'ORDERED') as pending_deliveries
        FROM supplier_purchase_orders
        WHERE supplier_id = $1
      `, [supplierId]);

      const lowStockProducts = await queryRunner.manager.query(`
        SELECT id, name, stock_qty, min_stock_alert_qty 
        FROM products 
        WHERE supplier_id = $1 AND stock_qty <= min_stock_alert_qty AND is_active = true
      `, [supplierId]);

      return {
        ...stats[0],
        low_stock_count: lowStockProducts.length,
        low_stock_products: lowStockProducts,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
