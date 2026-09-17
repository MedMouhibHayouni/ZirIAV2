import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { SupplierInvoice, SupplierInvoiceStatus, SupplierInvoiceType, PaymentMethod } from './entities/supplier-invoice.entity';
import { ProductOrder, OrderStatus } from './entities/product-order.entity';
import { Product } from './entities/product.entity';
import { SupplierStockMovement, StockMovementType } from './entities/supplier-stock-movement.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';

export class CreateManualInvoiceDto {
  client_name: string;
  client_phone?: string;
  client_address?: string;
  client_email?: string;
  client_tax_id?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>;
  discount_amount_tnd?: number;
  tax_rate?: number;
  notes?: string;
  payment_method?: PaymentMethod;
  due_date?: Date;
  status?: SupplierInvoiceStatus;
}

@Injectable()
export class SupplierInvoiceService {
  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(SupplierStockMovement)
    private readonly stockMovementRepo: Repository<SupplierStockMovement>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async generateInvoiceNumber(supplierId: string): Promise<string> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: supplierId } });
    if (!user) throw new NotFoundException('Supplier not found');

    let initials = 'SU';
    const names = user.name ? user.name.trim().split(' ') : [];
    if (names.length >= 2) {
      initials = (names[0][0] + names[1][0]).toUpperCase();
    } else if (names.length === 1) {
      initials = names[0].substring(0, 2).toUpperCase();
    }

    const year = new Date().getFullYear();
    const prefix = `ZIR-${initials}-${year}-`;

    const lastInvoice = await this.invoiceRepo.findOne({
      where: { supplier_id: supplierId, invoice_number: Like(`${prefix}%`) },
      order: { invoice_number: 'DESC' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoice_number.split('-');
      const lastSeqStr = parts[parts.length - 1];
      const lastSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    const sequenceStr = sequence.toString().padStart(4, '0');
    return `${prefix}${sequenceStr}`;
  }

  async createFromOrder(supplierId: string, orderId: string): Promise<SupplierInvoice> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, supplier_id: supplierId },
      relations: ['buyer', 'product'],
    });

    if (!order) throw new NotFoundException('Order not found or access denied');

    const existingInvoice = await this.invoiceRepo.findOne({ where: { order_id: orderId } });
    if (existingInvoice) return existingInvoice; // Prevent duplicate

    const invoiceNumber = await this.generateInvoiceNumber(supplierId);

    const subtotal = Number(order.total_tnd);
    const taxAmount = subtotal * 0.19;
    const total = subtotal + taxAmount;

    const invoice: any = this.invoiceRepo.create({
      supplier_id: supplierId,
      invoice_number: invoiceNumber,
      order_id: order.id,
      invoice_type: SupplierInvoiceType.PLATFORM_ORDER,
      client_name: order.buyer.name || 'Client ZirIA',
      client_phone: order.buyer.phone,
      client_address: order.delivery_address,
      client_email: order.buyer.email,
      items: [
        {
          description: order.product.name,
          quantity: Number(order.quantity_ordered),
          unit: order.product.unit,
          unit_price: Number(order.unit_price_tnd),
          total: subtotal,
        },
      ],
      subtotal_tnd: subtotal,
      discount_amount_tnd: 0,
      tax_rate: 19,
      tax_amount_tnd: taxAmount,
      total_tnd: total,
      status: SupplierInvoiceStatus.SENT,
    } as any);

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Find supplier details to enrich notification
    const supplier = await this.dataSource.getRepository(User).findOne({ where: { id: supplierId } });
    const supplierName = supplier?.business_name || supplier?.name || 'Fournisseur';

    // Send notification to buyer
    await this.notificationService.sendToUsers(
      [order.buyer_id],
      '📄 Nouvelle Facture Émise',
      `Le fournisseur "${supplierName}" a émis la facture ${invoiceNumber} d'un montant de ${total} TND pour votre commande.`,
      { type: 'NEW_INVOICE', invoiceId: savedInvoice.id }
    ).catch(e => console.error('Failed to notify buyer:', e));

    return savedInvoice;
  }

  async createManual(supplierId: string, dto: CreateManualInvoiceDto): Promise<SupplierInvoice> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Items array is required');
    }

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

    const discount = Number(dto.discount_amount_tnd) || 0;
    const taxRate = Number(dto.tax_rate) || 19;
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = (subtotal - discount) + taxAmount;

    const invoiceNumber = await this.generateInvoiceNumber(supplierId);

    const invoice: any = this.invoiceRepo.create({
      supplier_id: supplierId,
      invoice_number: invoiceNumber,
      invoice_type: SupplierInvoiceType.MANUAL,
      client_name: dto.client_name,
      client_phone: dto.client_phone,
      client_address: dto.client_address,
      client_email: dto.client_email,
      client_tax_id: dto.client_tax_id,
      items,
      subtotal_tnd: subtotal,
      discount_amount_tnd: discount,
      tax_rate: taxRate,
      tax_amount_tnd: taxAmount,
      total_tnd: total,
      notes: dto.notes,
      payment_method: dto.payment_method,
      due_date: dto.due_date,
      status: dto.status || SupplierInvoiceStatus.DRAFT,
    } as any);

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Auto-deduct stock for manual sales
    for (const item of items) {
      const product = await this.productRepo.createQueryBuilder('p')
        .where('p.supplier_id = :supplierId', { supplierId })
        .andWhere('LOWER(p.name) = LOWER(:name)', { name: item.description })
        .getOne();

      if (product) {
        const qtyBefore = Number(product.stock_qty);
        const qtyAfter = qtyBefore - item.quantity;
        
        await this.stockMovementRepo.save(
          this.stockMovementRepo.create({
            supplier_id: supplierId,
            product_id: product.id,
            movement_type: StockMovementType.SALE_MANUAL,
            quantity_change: -item.quantity,
            quantity_before: qtyBefore,
            quantity_after: qtyAfter,
            reference_id: savedInvoice.id,
            created_by_id: supplierId,
          })
        );
        product.stock_qty = qtyAfter;
        await this.productRepo.save(product);
      }
    }

    // Notify matching farmer if the status is SENT
    if (savedInvoice.status === SupplierInvoiceStatus.SENT && (dto.client_phone || dto.client_email)) {
      const queryConditions: any[] = [];
      if (dto.client_phone) queryConditions.push({ phone: dto.client_phone });
      if (dto.client_email) queryConditions.push({ email: dto.client_email });
      
      if (queryConditions.length > 0) {
        const buyer = await this.dataSource.getRepository(User).findOne({
          where: queryConditions
        });
        if (buyer) {
          const supplier = await this.dataSource.getRepository(User).findOne({ where: { id: supplierId } });
          const supplierName = supplier?.business_name || supplier?.name || 'Fournisseur';

          await this.notificationService.sendToUsers(
            [buyer.id],
            '📄 Nouvelle Facture Fournisseur',
            `Le fournisseur "${supplierName}" vous a envoyé la facture ${invoiceNumber} d'un montant de ${total} TND.`,
            { type: 'NEW_INVOICE', invoiceId: savedInvoice.id }
          ).catch(e => console.error('Failed to notify buyer:', e));
        }
      }
    }

    return savedInvoice;
  }

  async getMyInvoices(supplierId: string, filters: { status?: string; type?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.invoiceRepo.createQueryBuilder('inv').where('inv.supplier_id = :supplierId', { supplierId });

    if (filters.status) {
      query.andWhere('inv.status = :status', { status: filters.status });
    }
    if (filters.type) {
      query.andWhere('inv.invoice_type = :type', { type: filters.type });
    }
    if (filters.search) {
      query.andWhere('inv.client_name ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.dateFrom) {
      query.andWhere('inv.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      query.andWhere('inv.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    query.orderBy('inv.created_at', 'DESC');
    return query.getMany();
  }

  async getMyPurchasesInvoices(buyerId: string) {
    const buyer = await this.dataSource.getRepository(User).findOne({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException('Acheteur introuvable');

    const query = this.invoiceRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.supplier', 'supplier')
      .leftJoinAndSelect('inv.order', 'order')
      .where('order.buyer_id = :buyerId', { buyerId })
      .orWhere('inv.client_phone = :phone', { phone: buyer.phone })
      .orWhere('inv.client_email = :email', { email: buyer.email });

    // Ne retourner que les factures qui ne sont pas DRAFT (donc SENT, PAID, PARTIAL)
    query.andWhere('inv.status != :draftStatus', { draftStatus: SupplierInvoiceStatus.DRAFT });
    
    query.orderBy('inv.created_at', 'DESC');
    return query.getMany();
  }

  async getInvoiceById(supplierId: string, invoiceId: string) {
    const inv = await this.invoiceRepo.findOne({
      where: { id: invoiceId, supplier_id: supplierId },
      relations: ['order'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');
    return inv;
  }

  async getInvoiceByIdForAnyParticipant(userId: string, invoiceId: string) {
    const inv = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['order', 'supplier'],
    });
    if (!inv) throw new NotFoundException('Facture introuvable');

    const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Utilisateur introuvable');

    const isSupplier = inv.supplier_id === userId;
    const isBuyer = inv.order?.buyer_id === userId || inv.client_phone === user.phone || inv.client_email === user.email;

    if (!isSupplier && !isBuyer && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à accéder à cette facture");
    }
    return inv;
  }

  async updateInvoice(supplierId: string, invoiceId: string, dto: Partial<CreateManualInvoiceDto> & { status?: string; amount_paid_tnd?: number; paid_at?: Date }) {
    const inv = await this.getInvoiceById(supplierId, invoiceId);
    const wasDraft = inv.status === SupplierInvoiceStatus.DRAFT;

    if (inv.status !== SupplierInvoiceStatus.DRAFT) {
      // Allow limited updates if not DRAFT
      if (dto.status) inv.status = dto.status as SupplierInvoiceStatus;
      if (dto.amount_paid_tnd !== undefined) {
        inv.amount_paid_tnd = Number(dto.amount_paid_tnd);
        if (inv.amount_paid_tnd < Number(inv.total_tnd) && inv.amount_paid_tnd > 0) {
          inv.status = SupplierInvoiceStatus.PARTIAL;
        } else if (inv.amount_paid_tnd >= Number(inv.total_tnd)) {
          inv.status = SupplierInvoiceStatus.PAID;
        }
      }
      if (dto.notes !== undefined) inv.notes = dto.notes;
      if (dto.payment_method !== undefined) inv.payment_method = dto.payment_method;
      if (dto.paid_at) inv.paid_at = dto.paid_at;
      if (inv.status === SupplierInvoiceStatus.PAID && !inv.paid_at) {
        inv.paid_at = new Date();
      }
      return this.invoiceRepo.save(inv);
    }

    // Full update allowed for DRAFT
    if (dto.client_name) inv.client_name = dto.client_name;
    if (dto.client_phone !== undefined) inv.client_phone = dto.client_phone;
    if (dto.client_address !== undefined) inv.client_address = dto.client_address;
    if (dto.client_email !== undefined) inv.client_email = dto.client_email;
    if (dto.client_tax_id !== undefined) inv.client_tax_id = dto.client_tax_id;
    if (dto.notes !== undefined) inv.notes = dto.notes;
    if (dto.payment_method !== undefined) inv.payment_method = dto.payment_method;
    if (dto.due_date) inv.due_date = dto.due_date;
    if (dto.status) inv.status = dto.status as SupplierInvoiceStatus;

    if (dto.items) {
      let subtotal = 0;
      inv.items = dto.items.map(i => {
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
      inv.subtotal_tnd = subtotal;
      inv.discount_amount_tnd = Number(dto.discount_amount_tnd) || 0;
      inv.tax_rate = Number(dto.tax_rate) || 19;
      inv.tax_amount_tnd = (inv.subtotal_tnd - inv.discount_amount_tnd) * (inv.tax_rate / 100);
      inv.total_tnd = (inv.subtotal_tnd - inv.discount_amount_tnd) + inv.tax_amount_tnd;
    }

    const savedInvoice = await this.invoiceRepo.save(inv);

    // Notify matching farmer if status transitioned from DRAFT to SENT
    if (wasDraft && savedInvoice.status === SupplierInvoiceStatus.SENT && (savedInvoice.client_phone || savedInvoice.client_email)) {
      const queryConditions: any[] = [];
      if (savedInvoice.client_phone) queryConditions.push({ phone: savedInvoice.client_phone });
      if (savedInvoice.client_email) queryConditions.push({ email: savedInvoice.client_email });
      
      if (queryConditions.length > 0) {
        const buyer = await this.dataSource.getRepository(User).findOne({
          where: queryConditions
        });
        if (buyer) {
          const supplier = await this.dataSource.getRepository(User).findOne({ where: { id: supplierId } });
          const supplierName = supplier?.business_name || supplier?.name || 'Fournisseur';

          await this.notificationService.sendToUsers(
            [buyer.id],
            '📄 Nouvelle Facture Fournisseur',
            `Le fournisseur "${supplierName}" vous a envoyé la facture ${savedInvoice.invoice_number} d'un montant de ${savedInvoice.total_tnd} TND.`,
            { type: 'NEW_INVOICE', invoiceId: savedInvoice.id }
          ).catch(e => console.error('Failed to notify buyer:', e));
        }
      }
    }

    return savedInvoice;
  }

  async deleteInvoice(supplierId: string, invoiceId: string) {
    const inv = await this.getInvoiceById(supplierId, invoiceId);
    if (inv.status !== SupplierInvoiceStatus.DRAFT) {
      throw new BadRequestException('Impossible de supprimer une facture envoyée ou payée');
    }
    await this.invoiceRepo.delete(invoiceId);
  }

  async getInvoiceStats(supplierId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const stats = await queryRunner.manager.query(`
        SELECT 
          COALESCE(SUM(total_tnd) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND status != 'CANCELLED'), 0) as total_invoiced_this_month,
          COALESCE(SUM(amount_paid_tnd) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND status IN ('PAID', 'PARTIAL')), 0) as total_paid_this_month,
          COALESCE(SUM(total_tnd - amount_paid_tnd) FILTER (WHERE status IN ('SENT', 'PARTIAL')), 0) as total_pending,
          COUNT(*) FILTER (WHERE status IN ('SENT', 'PARTIAL') AND due_date < NOW()) as overdue_count,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND status != 'CANCELLED') as invoices_count_this_month,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND invoice_type = 'PLATFORM_ORDER') as platform_count_this_month,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) AND invoice_type = 'MANUAL') as manual_count_this_month,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_count
        FROM supplier_invoices 
        WHERE supplier_id = $1
      `, [supplierId]);
      
      return stats[0];
    } finally {
      await queryRunner.release();
    }
  }
}
