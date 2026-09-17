import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SupplierCrmClient } from './entities/supplier-crm-client.entity';
import { SupplierCrmNote, NoteType } from './entities/supplier-crm-note.entity';
import { SupplierCrmReminder } from './entities/supplier-crm-reminder.entity';
import { ProductOrder, OrderStatus } from './entities/product-order.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SupplierCrmService {
  constructor(
    @InjectRepository(SupplierCrmClient)
    private readonly clientRepo: Repository<SupplierCrmClient>,
    @InjectRepository(SupplierCrmNote)
    private readonly noteRepo: Repository<SupplierCrmNote>,
    @InjectRepository(SupplierCrmReminder)
    private readonly reminderRepo: Repository<SupplierCrmReminder>,
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sync master CRM records from all orders associated with the supplier.
   * Auto-run before displaying lists or when an order is updated to DELIVERED.
   */
  async syncClientsFromOrders(supplierId: string): Promise<void> {
    // 1. Get all orders for this supplier, with their buyer relation
    const orders = await this.orderRepo.find({
      where: { supplier_id: supplierId },
      relations: ['buyer'],
    });

    if (!orders.length) return;

    // 2. Identify unique buyers
    const uniqueBuyersMap = new Map<string, User>();
    for (const order of orders) {
      if (order.buyer && order.buyer_id) {
        uniqueBuyersMap.set(order.buyer_id, order.buyer);
      }
    }

    const today = new Date();

    // 3. Process each buyer
    for (const [buyerId, buyer] of uniqueBuyersMap.entries()) {
      // Find or create existing client card
      let client = await this.clientRepo.findOne({
        where: { supplier_id: supplierId, buyer_id: buyerId },
      });

      if (!client) {
        client = this.clientRepo.create({
          supplier_id: supplierId,
          buyer_id: buyerId,
          full_name: buyer.name,
          email: buyer.email || null,
          phone: buyer.phone || null,
          governorate: buyer.governorate || null,
          tags: [],
          segment: 'NOUVEAU',
          segment_updated_at: new Date(),
        });
      }

      // Calculate stats for this buyer's orders
      const buyerOrders = orders.filter(o => o.buyer_id === buyerId);
      const totalOrdersCount = buyerOrders.length;

      const deliveredOrders = buyerOrders.filter(o => o.status === OrderStatus.DELIVERED);
      const totalSpentTnd = deliveredOrders.reduce((sum, o) => sum + Number(o.total_tnd || 0), 0);

      const averageOrderValueTnd = totalOrdersCount > 0 ? totalSpentTnd / totalOrdersCount : 0;

      // Find first and last order dates
      const orderedDates = buyerOrders.map(o => new Date(o.ordered_at).getTime());
      const firstOrderDate = new Date(Math.min(...orderedDates));
      const lastOrderDate = new Date(Math.max(...orderedDates));

      // Days since last order
      const diffTime = Math.abs(today.getTime() - lastOrderDate.getTime());
      const daysSinceLastOrder = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Calculate segment:
      let segment: 'VIP' | 'FIDELE' | 'OCCASIONNEL' | 'INACTIF' | 'NOUVEAU' = 'OCCASIONNEL';
      if (daysSinceLastOrder <= 90 && totalOrdersCount <= 1) {
        segment = 'NOUVEAU';
      } else if (daysSinceLastOrder > 180) {
        segment = 'INACTIF';
      } else if (totalSpentTnd >= 500) {
        segment = 'VIP';
      } else if (totalOrdersCount >= 5) {
        segment = 'FIDELE';
      }

      if (client.segment !== segment) {
        client.segment = segment;
        client.segment_updated_at = new Date();
      }

      // Calculate lifetime value score (0 - 100)
      let ltvScore = 0;
      // up to 40 points from total spent (cap at 1000 TND)
      ltvScore += 40 * Math.min(totalSpentTnd, 1000) / 1000;
      // up to 30 points from total orders count (cap at 10)
      ltvScore += 30 * Math.min(totalOrdersCount, 10) / 10;
      // up to 30 points from frequency (days since last order)
      if (daysSinceLastOrder < 30) {
        ltvScore += 30;
      } else if (daysSinceLastOrder < 60) {
        ltvScore += 20;
      } else if (daysSinceLastOrder < 90) {
        ltvScore += 10;
      }

      client.total_orders_count = totalOrdersCount;
      client.total_spent_tnd = totalSpentTnd;
      client.average_order_value_tnd = averageOrderValueTnd;
      client.first_order_date = firstOrderDate;
      client.last_order_date = lastOrderDate;
      client.days_since_last_order = daysSinceLastOrder;
      client.lifetime_value_score = Math.round(ltvScore * 100) / 100;

      await this.clientRepo.save(client);
    }
  }

  /**
   * Retrieve all active / archived CRM clients with filtering, sorting, and tag checking.
   */
  async getMyCrmClients(
    supplierId: string,
    filters: {
      search?: string;
      segment?: string;
      tags?: string[];
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      isArchived?: boolean;
    },
  ): Promise<SupplierCrmClient[]> {
    // Make sure we have synced fresh values first
    await this.syncClientsFromOrders(supplierId).catch(() => {});

    const qb = this.clientRepo.createQueryBuilder('client')
      .where('client.supplier_id = :supplierId', { supplierId })
      .andWhere('client.is_archived = :isArchived', { isArchived: filters.isArchived ?? false });

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      qb.andWhere(
        '(client.full_name ILIKE :search OR client.email ILIKE :search OR client.phone ILIKE :search OR client.company_name ILIKE :search)',
        { search: searchPattern },
      );
    }

    if (filters.segment) {
      qb.andWhere('client.segment = :segment', { segment: filters.segment });
    }

    if (filters.tags && filters.tags.length > 0) {
      // PostgreSQL overlap operator: tags && ARRAY['VIP', 'Regular']
      qb.andWhere('client.tags && ARRAY[:...tags]', { tags: filters.tags });
    }

    // Sorting
    const sortBy = filters.sortBy || 'score';
    const sortOrder = filters.sortOrder || 'DESC';

    if (sortBy === 'total_spent') {
      qb.orderBy('client.total_spent_tnd', sortOrder);
    } else if (sortBy === 'last_order') {
      qb.orderBy('client.last_order_date', sortOrder);
    } else if (sortBy === 'score') {
      qb.orderBy('client.lifetime_value_score', sortOrder);
    } else if (sortBy === 'name') {
      qb.orderBy('client.full_name', sortOrder);
    } else {
      qb.orderBy('client.lifetime_value_score', 'DESC');
    }

    return qb.getMany();
  }

  /**
   * Retrieve a specific CRM client by ID
   */
  async getCrmClientById(supplierId: string, clientId: string): Promise<SupplierCrmClient> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, supplier_id: supplierId },
    });
    if (!client) {
      throw new NotFoundException('Client CRM introuvable');
    }
    return client;
  }

  /**
   * Retrieve orders associated with this CRM client
   */
  async getClientOrders(supplierId: string, clientId: string): Promise<ProductOrder[]> {
    const client = await this.getCrmClientById(supplierId, clientId);
    if (!client.buyer_id) return [];

    return this.orderRepo.find({
      where: { buyer_id: client.buyer_id, supplier_id: supplierId },
      relations: ['product'],
      order: { ordered_at: 'DESC' },
    });
  }

  /**
   * Get notes/logs related to this client
   */
  async getClientNotes(supplierId: string, clientId: string): Promise<SupplierCrmNote[]> {
    // Assert ownership
    await this.getCrmClientById(supplierId, clientId);

    return this.noteRepo.find({
      where: { crm_client_id: clientId, supplier_id: supplierId },
      order: { is_pinned: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * Add a log/note entry for a client
   */
  async addNote(
    supplierId: string,
    clientId: string,
    dto: { note_type: NoteType; content: string; is_pinned?: boolean; related_order_id?: string },
  ): Promise<SupplierCrmNote> {
    await this.getCrmClientById(supplierId, clientId);

    const note = this.noteRepo.create({
      supplier_id: supplierId,
      crm_client_id: clientId,
      note_type: dto.note_type,
      content: dto.content,
      is_pinned: dto.is_pinned ?? false,
      related_order_id: dto.related_order_id || null,
      created_by_id: supplierId, // Note created by the logged-in supplier user
    });

    return this.noteRepo.save(note);
  }

  /**
   * Update a specific interaction note
   */
  async updateNote(
    supplierId: string,
    noteId: string,
    dto: { content?: string; is_pinned?: boolean },
  ): Promise<SupplierCrmNote> {
    const note = await this.noteRepo.findOne({
      where: { id: noteId, supplier_id: supplierId },
    });
    if (!note) {
      throw new NotFoundException('Note introuvable');
    }

    if (dto.content !== undefined) note.content = dto.content;
    if (dto.is_pinned !== undefined) note.is_pinned = dto.is_pinned;

    return this.noteRepo.save(note);
  }

  /**
   * Delete a note entry
   */
  async deleteNote(supplierId: string, noteId: string): Promise<{ success: boolean }> {
    const note = await this.noteRepo.findOne({
      where: { id: noteId, supplier_id: supplierId },
    });
    if (!note) {
      throw new NotFoundException('Note introuvable');
    }

    await this.noteRepo.remove(note);
    return { success: true };
  }

  /**
   * Get client reminders
   */
  async getClientReminders(supplierId: string, clientId: string): Promise<SupplierCrmReminder[]> {
    await this.getCrmClientById(supplierId, clientId);

    return this.reminderRepo.find({
      where: { crm_client_id: clientId, supplier_id: supplierId },
      order: { reminder_date: 'ASC' },
    });
  }

  /**
   * Create a schedule reminder for client relationship followup
   */
  async addReminder(
    supplierId: string,
    clientId: string,
    dto: { title: string; description?: string; reminder_date: string },
  ): Promise<SupplierCrmReminder> {
    await this.getCrmClientById(supplierId, clientId);

    const reminder = this.reminderRepo.create({
      supplier_id: supplierId,
      crm_client_id: clientId,
      title: dto.title,
      description: dto.description || null,
      reminder_date: new Date(dto.reminder_date),
      is_completed: false,
    });

    return this.reminderRepo.save(reminder);
  }

  /**
   * Mark reminder as completed
   */
  async completeReminder(supplierId: string, reminderId: string): Promise<SupplierCrmReminder> {
    const reminder = await this.reminderRepo.findOne({
      where: { id: reminderId, supplier_id: supplierId },
    });
    if (!reminder) {
      throw new NotFoundException('Rappel introuvable');
    }

    reminder.is_completed = true;
    reminder.completed_at = new Date();

    return this.reminderRepo.save(reminder);
  }

  /**
   * Hard delete reminder schedule
   */
  async deleteReminder(supplierId: string, reminderId: string): Promise<{ success: boolean }> {
    const reminder = await this.reminderRepo.findOne({
      where: { id: reminderId, supplier_id: supplierId },
    });
    if (!reminder) {
      throw new NotFoundException('Rappel introuvable');
    }

    await this.reminderRepo.remove(reminder);
    return { success: true };
  }

  /**
   * Update client properties (notes, tags, address, phone...)
   */
  async updateCrmClient(
    supplierId: string,
    clientId: string,
    dto: {
      full_name?: string;
      phone?: string;
      email?: string;
      company_name?: string;
      tax_id?: string;
      address?: string;
      governorate?: string;
      notes?: string;
      tags?: string[];
    },
  ): Promise<SupplierCrmClient> {
    const client = await this.getCrmClientById(supplierId, clientId);

    if (dto.full_name !== undefined) client.full_name = dto.full_name;
    if (dto.phone !== undefined) client.phone = dto.phone || null;
    if (dto.email !== undefined) client.email = dto.email || null;
    if (dto.company_name !== undefined) client.company_name = dto.company_name || null;
    if (dto.tax_id !== undefined) client.tax_id = dto.tax_id || null;
    if (dto.address !== undefined) client.address = dto.address || null;
    if (dto.governorate !== undefined) client.governorate = dto.governorate || null;
    if (dto.notes !== undefined) client.notes = dto.notes || null;
    if (dto.tags !== undefined) client.tags = dto.tags || null;

    return this.clientRepo.save(client);
  }

  /**
   * Archive client file instead of hard delete
   */
  async archiveCrmClient(supplierId: string, clientId: string): Promise<{ success: boolean }> {
    const client = await this.getCrmClientById(supplierId, clientId);
    client.is_archived = true;
    await this.clientRepo.save(client);
    return { success: true };
  }

  /**
   * Fetch aggregate CRM statistics
   */
  async getCrmStats(supplierId: string): Promise<any> {
    await this.syncClientsFromOrders(supplierId).catch(() => {});

    const clients = await this.clientRepo.find({
      where: { supplier_id: supplierId, is_archived: false },
    });

    const totalClients = clients.length;
    const vipCount = clients.filter(c => c.segment === 'VIP').length;
    const fideleCount = clients.filter(c => c.segment === 'FIDELE').length;
    const inactitCount = clients.filter(c => c.segment === 'INACTIF').length;
    const nouveauCount = clients.filter(c => c.segment === 'NOUVEAU').length;
    const occasionnelCount = clients.filter(c => c.segment === 'OCCASIONNEL').length;

    const clientsSansCommande30j = clients.filter(c => c.days_since_last_order !== null && c.days_since_last_order > 30 && c.segment !== 'INACTIF').length;
    const revenueTotal = clients.reduce((sum, c) => sum + Number(c.total_spent_tnd || 0), 0);
    const averageLtv = totalClients > 0 ? clients.reduce((sum, c) => sum + Number(c.lifetime_value_score || 0), 0) / totalClients : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const remindersToday = await this.reminderRepo
      .createQueryBuilder('rem')
      .where('rem.supplier_id = :supplierId', { supplierId })
      .andWhere('rem.is_completed = false')
      .andWhere('rem.reminder_date = :today', { today: todayStr })
      .getCount();

    return {
      total_clients: totalClients,
      vip_count: vipCount,
      fidele_count: fideleCount,
      inactif_count: inactitCount,
      nouveau_count: nouveauCount,
      occasionnel_count: occasionnelCount,
      clients_sans_commande_30j: clientsSansCommande30j,
      revenue_total_tnd: revenueTotal,
      average_ltv: Math.round(averageLtv * 100) / 100,
      reminders_today: remindersToday,
    };
  }

  /**
   * Get reminders for the next 7 days across all active clients
   */
  async getUpcomingReminders(supplierId: string): Promise<any[]> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const reminders = await this.reminderRepo
      .createQueryBuilder('rem')
      .leftJoinAndSelect('rem.crm_client', 'client')
      .where('rem.supplier_id = :supplierId', { supplierId })
      .andWhere('rem.is_completed = false')
      .andWhere('rem.reminder_date >= :today AND rem.reminder_date <= :nextWeek', { today: todayStr, nextWeek: nextWeekStr })
      .orderBy('rem.reminder_date', 'ASC')
      .getMany();

    return reminders.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      reminder_date: r.reminder_date,
      client_name: r.crm_client?.full_name || 'Client',
      crm_client_id: r.crm_client_id,
    }));
  }
}
