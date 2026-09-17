import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product, ProductCategory } from './entities/product.entity';
import { SupplierPromotion } from './entities/supplier-promotion.entity';
import { ProductOrder, OrderStatus } from './entities/product-order.entity';
import { NotificationService } from '../notifications/notification.service';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierCrmService } from './supplier-crm.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(SupplierPromotion)
    private readonly promotionRepo: Repository<SupplierPromotion>,
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly supplierInvoiceService: SupplierInvoiceService,
    private readonly supplierCrmService: SupplierCrmService,
  ) {}

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------

  async getMyProducts(supplierId: string) {
    return this.productRepo.find({
      where: { supplier_id: supplierId },
      order: { is_active: 'DESC', created_at: 'DESC' },
    });
  }

  async createProduct(supplierId: string, dto: any) {
    const product = this.productRepo.create({
      ...dto,
      supplier_id: supplierId,
    });
    return this.productRepo.save(product);
  }

  async updateProduct(supplierId: string, productId: string, dto: any) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.supplier_id !== supplierId) throw new ForbiddenException('Non autorisé');

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async toggleActive(supplierId: string, productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.supplier_id !== supplierId) throw new ForbiddenException('Non autorisé');

    product.is_active = !product.is_active;
    await this.productRepo.save(product);
    return { success: true, is_active: product.is_active };
  }

  async deleteProduct(supplierId: string, productId: string): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.supplier_id !== supplierId) throw new ForbiddenException('Non autorisé');
    await this.productRepo.remove(product);
  }

  async getSupplierStats(supplierId: string) {
    const [products, orders] = await Promise.all([
      this.productRepo.find({ where: { supplier_id: supplierId } }),
      this.orderRepo.find({ where: { supplier_id: supplierId }, relations: ['product', 'buyer'] }),
    ]);

    const totalRevenue = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + Number(o.total_tnd), 0);

    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const activeProducts = products.filter(p => p.is_active).length;
    const lowStockCount = products.filter(p => p.stock_qty < p.min_stock_alert_qty).length;

    // Top 5 products by revenue
    const revenueByProduct = new Map<string, { name: string; total: number }>();
    for (const o of orders.filter(o => o.status === 'DELIVERED')) {
      const pid = o.product_id;
      const existing = revenueByProduct.get(pid);
      if (existing) existing.total += Number(o.total_tnd);
      else revenueByProduct.set(pid, { name: o.product?.name ?? pid, total: Number(o.total_tnd) });
    }
    const topProducts = Array.from(revenueByProduct.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const recentOrders = orders
      .sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime())
      .slice(0, 8);

    return {
      activeProducts,
      totalProducts: products.length,
      pendingOrders,
      totalOrders: orders.length,
      totalRevenueTnd: totalRevenue,
      lowStockCount,
      topProducts,
      recentOrders,
    };
  }

  async searchProducts(lat: number, lng: number, radiusKm: number, category?: ProductCategory) {
    const radiusMeters = radiusKm * 1000;
    
    let query = `
      SELECT 
        p.*, 
        u.name as supplier_name, 
        u.business_name as supplier_business_name,
        u.vitrine_photo_url as supplier_photo_url,
        u.lat as supplier_lat, 
        u.lng as supplier_lng, 
        ST_Distance(u.location::geography, ST_MakePoint($1, $2)::geography) / 1000 as distance_km 
      FROM products p 
      JOIN users u ON p.supplier_id = u.id 
      WHERE p.is_active = true 
      AND ST_DWithin(u.location::geography, ST_MakePoint($1, $2)::geography, $3)
    `;

    const params: any[] = [lng, lat, radiusMeters]; // Note: MakePoint is (lng, lat)

    if (category) {
      params.push(category);
      query += ` AND p.category = $${params.length}`;
    }

    query += ` ORDER BY distance_km ASC`;

    return this.dataSource.query(query, params);
  }

  // --------------------------------------------------------------------------
  // ORDERS
  // --------------------------------------------------------------------------

  async getMyOrders(supplierId: string, status?: OrderStatus) {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoin('supplier_invoices', 'inv', 'inv.order_id = order.id')
      .addSelect(['inv.id', 'inv.invoice_number'])
      .where('order.supplier_id = :supplierId', { supplierId });

    if (status) qb.andWhere('order.status = :status', { status });
    
    qb.orderBy('order.ordered_at', 'DESC');
    
    const orders = await qb.getRawAndEntities();
    
    return orders.entities.map(ent => {
      const rawMatch = orders.raw.find(r => r.order_id === ent.id);
      return {
        ...ent,
        invoice_id: rawMatch?.inv_id || null,
        invoice_number: rawMatch?.inv_invoice_number || null
      };
    });
  }

  async updateOrderStatus(supplierId: string, orderId: string, status: OrderStatus) {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['buyer', 'product'] });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.supplier_id !== supplierId) throw new ForbiddenException('Non autorisé');

    order.status = status;
    await this.orderRepo.save(order);

    // Targeted in-app + websocket notifications per status
    const productName = order.product?.name ?? 'votre produit';
    let title = '';
    let message = '';
    if (status === OrderStatus.SHIPPED) {
      title = '🚚 Commande expédiée — en route!';
      message = `Votre commande de ${productName} est en cours de livraison.`;
    } else if (status === OrderStatus.DELIVERED) {
      title = '✅ Commande livrée avec succès';
      message = `Votre commande de ${productName} a été livrée. Merci de votre confiance!`;
    } else if (status === OrderStatus.CANCELLED) {
      title = '❌ Commande annulée';
      message = `Votre commande de ${productName} a été annulée par le fournisseur.`;
    }

    if (title) {
      await this.notificationService.sendToUsers(
        [order.buyer_id],
        title,
        message,
        { type: 'ORDER_STATUS_UPDATE', orderId: order.id, status, productName }
      );
    }

    // Auto-generate invoice and sync CRM if delivered
    if (status === OrderStatus.DELIVERED) {
      try {
        await this.supplierInvoiceService.createFromOrder(supplierId, orderId);
      } catch (err) {
        console.error('Failed to auto-generate invoice for order', orderId, err);
      }
      this.supplierCrmService.syncClientsFromOrders(supplierId).catch(err => {
        console.error('Failed to sync CRM clients from orders', err);
      });
    }

    return order;
  }

  async getMyPurchases(buyerId: string) {
    return this.dataSource.query(`
      SELECT
        po.id, po.quantity_ordered, po.unit_price_tnd, po.total_tnd,
        po.status, po.ordered_at, po.delivery_address, po.notes, po.supplier_id as supplier_id,
        p.name as product_name, p.unit, p.category, p.photo_url,
        u.name as supplier_name, u.phone as supplier_phone, u.governorate as supplier_governorate
      FROM product_orders po
      JOIN products p ON p.id = po.product_id
      JOIN users u ON u.id = po.supplier_id
      WHERE po.buyer_id = $1
      ORDER BY po.ordered_at DESC
      LIMIT 50
    `, [buyerId]);
  }

  async createOrder(buyerId: string, dto: { product_id: string; quantity: number; delivery_address?: string; notes?: string }) {
    const product = await this.productRepo.findOne({ where: { id: dto.product_id } });
    if (!product) throw new NotFoundException('Produit introuvable');

    if (product.stock_qty < dto.quantity) {
      throw new ForbiddenException('Stock insuffisant');
    }

    const totalTnd = product.price_tnd * dto.quantity;

    const order = this.orderRepo.create({
      buyer_id: buyerId,
      supplier_id: product.supplier_id,
      product_id: product.id,
      quantity_ordered: dto.quantity,
      unit_price_tnd: product.price_tnd,
      total_tnd: totalTnd,
      delivery_address: dto.delivery_address,
      notes: dto.notes,
      status: OrderStatus.PENDING,
    });

    await this.orderRepo.save(order);

    // Notify supplier
    this.notificationService.sendPushToUser(product.supplier_id, {
      title: 'Nouvelle Commande',
      message: `Vous avez reçu une nouvelle commande de ${dto.quantity} ${product.unit} pour ${product.name}.`,
      payload: { type: 'NEW_ORDER', orderId: order.id }
    });

    return order;
  }

  async createBulkOrder(buyerId: string, dto: { items: Array<{product_id: string, quantity: number}>, delivery_address?: string, notes?: string }) {
    if (!dto.items || dto.items.length === 0) {
      throw new ForbiddenException('Le panier est vide');
    }

    const batchId = crypto.randomUUID();
    const createdOrders: ProductOrder[] = [];
    const supplierIds = new Set<string>();
    let totalBatchAmount = 0;

    for (const item of dto.items) {
      const product = await this.productRepo.findOne({ where: { id: item.product_id } });
      if (!product) throw new NotFoundException(`Produit introuvable (ID: ${item.product_id})`);
      if (product.stock_qty < item.quantity) {
        throw new ForbiddenException(`Stock insuffisant pour le produit: ${product.name}`);
      }

      const totalTnd = product.price_tnd * item.quantity;
      totalBatchAmount += totalTnd;

      const order = this.orderRepo.create({
        buyer_id: buyerId,
        supplier_id: product.supplier_id,
        product_id: product.id,
        quantity_ordered: item.quantity,
        unit_price_tnd: product.price_tnd,
        total_tnd: totalTnd,
        delivery_address: dto.delivery_address,
        notes: dto.notes,
        status: OrderStatus.PENDING,
        order_batch_id: batchId,
      });

      const savedOrder = await this.orderRepo.save(order);
      createdOrders.push(savedOrder);
      supplierIds.add(product.supplier_id);
    }

    // Notify each unique supplier
    for (const supplierId of supplierIds) {
      const supplierOrders = createdOrders.filter(o => o.supplier_id === supplierId);
      const itemsCount = supplierOrders.length;
      await this.notificationService.sendPushToUser(supplierId, {
        title: 'Nouvelle Commande Groupée',
        message: `Vous avez reçu une commande de ${itemsCount} article(s).`,
        payload: { type: 'NEW_BULK_ORDER', batchId }
      }).catch(e => console.error(`Failed to notify supplier: ${e.message}`));
    }

    return {
      batchId,
      totalAmount: totalBatchAmount,
      orders: createdOrders
    };
  }

  // --------------------------------------------------------------------------
  // PROMOTIONS
  // --------------------------------------------------------------------------

  async createPromotion(supplierId: string, dto: any) {
    const product = await this.productRepo.findOne({ where: { id: dto.product_id } });
    if (!product || product.supplier_id !== supplierId) {
      throw new ForbiddenException('Produit non valide');
    }

    const promo = this.promotionRepo.create({
      ...dto,
      supplier_id: supplierId,
    });

    return this.promotionRepo.save(promo);
  }

  async getActivePromotions(governorate?: string) {
    const qb = this.promotionRepo.createQueryBuilder('promo')
      .leftJoinAndSelect('promo.product', 'product')
      .leftJoinAndSelect('promo.supplier', 'supplier')
      .where('promo.is_active = true')
      .andWhere('promo.valid_from <= NOW()')
      .andWhere('promo.valid_until >= NOW()');

    if (governorate) {
      qb.andWhere('(promo.governorate_target IS NULL OR promo.governorate_target = :gov)', { gov: governorate });
    }

    return qb.getMany();
  }

  async deletePromotion(supplierId: string, promoId: string) {
    const promo = await this.promotionRepo.findOne({ where: { id: promoId } });
    if (!promo || promo.supplier_id !== supplierId) {
      throw new ForbiddenException('Promotion non trouvée ou non autorisée');
    }
    await this.promotionRepo.delete(promoId);
    return { success: true };
  }
}

