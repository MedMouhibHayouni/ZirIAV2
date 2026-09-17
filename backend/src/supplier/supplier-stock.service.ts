import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SupplierStockMovement, StockMovementType } from './entities/supplier-stock-movement.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class SupplierStockService {
  constructor(
    @InjectRepository(SupplierStockMovement)
    private readonly stockMovementRepo: Repository<SupplierStockMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async getStockMovements(supplierId: string, filters: { product_id?: string; type?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.stockMovementRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'p')
      .where('m.supplier_id = :supplierId', { supplierId });

    if (filters.product_id) {
      query.andWhere('m.product_id = :productId', { productId: filters.product_id });
    }
    if (filters.type) {
      query.andWhere('m.movement_type = :type', { type: filters.type });
    }
    if (filters.dateFrom) {
      query.andWhere('m.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      query.andWhere('m.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    query.orderBy('m.created_at', 'DESC').take(200);
    return query.getMany();
  }

  async manualAdjustment(supplierId: string, dto: { product_id: string; new_quantity: number; notes: string }) {
    const product = await this.productRepo.findOne({ where: { id: dto.product_id, supplier_id: supplierId } });
    if (!product) throw new NotFoundException('Product not found');

    const qtyBefore = Number(product.stock_qty);
    const qtyAfter = Number(dto.new_quantity);
    const qtyChange = qtyAfter - qtyBefore;

    if (qtyChange === 0) return; // No change needed

    const movement = this.stockMovementRepo.create({
      supplier_id: supplierId,
      product_id: product.id,
      movement_type: StockMovementType.MANUAL_ADJUSTMENT,
      quantity_change: qtyChange,
      quantity_before: qtyBefore,
      quantity_after: qtyAfter,
      notes: dto.notes,
      created_by_id: supplierId,
    });

    await this.stockMovementRepo.save(movement);
    
    product.stock_qty = qtyAfter;
    await this.productRepo.save(product);

    return movement;
  }

  async getStockReport(supplierId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const products = await queryRunner.manager.query(`
        SELECT 
          p.id, p.name, p.category, p.stock_qty, p.min_stock_alert_qty, p.unit, p.price_tnd,
          (p.stock_qty <= p.min_stock_alert_qty) as is_low_stock,
          (p.stock_qty * p.price_tnd) as total_value_tnd,
          (SELECT MAX(created_at) FROM supplier_stock_movements WHERE product_id = p.id) as last_movement_date
        FROM products p
        WHERE p.supplier_id = $1 AND p.is_active = true
        ORDER BY p.name ASC
      `, [supplierId]);

      let total_stock_value = 0;
      let low_stock_count = 0;
      let out_of_stock_count = 0;

      for (const p of products) {
        total_stock_value += Number(p.total_value_tnd);
        if (Number(p.stock_qty) <= 0) {
          out_of_stock_count++;
        } else if (p.is_low_stock) {
          low_stock_count++;
        }
      }

      return {
        products,
        summary: {
          total_stock_value,
          low_stock_count,
          out_of_stock_count,
          total_products: products.length
        }
      };
    } finally {
      await queryRunner.release();
    }
  }
}
