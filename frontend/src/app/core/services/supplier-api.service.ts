import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupplierOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_tnd: number;
  unit: string;
  stock_qty: number;
  min_stock_alert_qty: number;
  photo_url: string | null;
  is_active: boolean;
  governorate_target: string | null;
  created_at: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_business_name?: string | null;
  supplier_photo_url?: string | null;
  distance_km?: number;
}

export interface SupplierOrder {
  id: string;
  product_id: string;
  product: SupplierProduct;
  buyer_id: string;
  buyer: { id: string; name: string; email: string; phone?: string; governorate?: string };
  supplier_id: string;
  quantity_ordered: number;
  unit_price_tnd: number;
  total_tnd: number;
  delivery_address: string | null;
  status: SupplierOrderStatus;
  notes: string | null;
  ordered_at: string;
  invoice_id?: string;
  invoice_number?: string;
}

export interface SupplierStats {
  activeProducts: number;
  totalProducts: number;
  pendingOrders: number;
  totalOrders: number;
  totalRevenueTnd: number;
  lowStockCount: number;
  topProducts: { name: string; total: number }[];
  recentOrders: SupplierOrder[];
}

export interface CreateProductDto {
  name: string;
  category: string;
  description?: string;
  price_tnd: number;
  unit: string;
  stock_qty: number;
  min_stock_alert_qty?: number;
  governorate_target?: string;
  photo_url?: string;
}

// Keep legacy alias for backward compat
export type OrderStatus = SupplierOrderStatus;

@Injectable({ providedIn: 'root' })
export class SupplierApiService {
  public readonly http = inject(HttpClient);
  public readonly apiUrl = environment.apiUrl;
  private readonly base = `${environment.apiUrl}/supplier`;

  // ── Supplier Dashboard ─────────────────────────────────────────────────────

  getStats(): Observable<SupplierStats> {
    return this.http.get<SupplierStats>(`${this.base}/stats`);
  }

  // ── Product Catalog ────────────────────────────────────────────────────────

  getMyProducts(): Observable<SupplierProduct[]> {
    return this.http.get<SupplierProduct[]>(`${this.base}/products/my`);
  }

  createProduct(dto: CreateProductDto): Observable<SupplierProduct> {
    return this.http.post<SupplierProduct>(`${this.base}/products`, dto);
  }

  updateProduct(id: string, dto: Partial<CreateProductDto>): Observable<SupplierProduct> {
    return this.http.patch<SupplierProduct>(`${this.base}/products/${id}`, dto);
  }

  toggleProduct(id: string): Observable<{ success: boolean; is_active: boolean }> {
    return this.http.patch<{ success: boolean; is_active: boolean }>(`${this.base}/products/${id}/toggle`, {});
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  getOrders(status?: SupplierOrderStatus): Observable<SupplierOrder[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<SupplierOrder[]>(`${this.base}/orders/my`, { params });
  }

  updateOrderStatus(orderId: string, status: SupplierOrderStatus): Observable<SupplierOrder> {
    return this.http.patch<SupplierOrder>(`${this.base}/orders/${orderId}/status`, { status });
  }

  // ── Public Catalog (for Farmers) ──────────────────────────────────────────

  searchProducts(
    lat: string | number,
    lng: string | number,
    radius_km: string | number,
    category?: string,
  ): Observable<SupplierProduct[]> {
    let params = new HttpParams()
      .set('lat', String(lat))
      .set('lng', String(lng))
      .set('radius_km', String(radius_km));
    if (category) params = params.set('category', category);
    return this.http.get<SupplierProduct[]>(`${this.base}/products/search`, { params });
  }

  createOrder(dto: { product_id: string; quantity: number; delivery_address?: string; notes?: string }): Observable<SupplierOrder> {
    return this.http.post<SupplierOrder>(`${this.base}/orders`, dto);
  }

  createBulkOrder(dto: { items: Array<{ product_id: string; quantity: number }>; delivery_address?: string; notes?: string }): Observable<{ batchId: string; totalAmount: number; orders: SupplierOrder[] }> {
    return this.http.post<{ batchId: string; totalAmount: number; orders: SupplierOrder[] }>(`${this.base}/orders/bulk`, dto);
  }

  // ── Promotions ────────────────────────────────────────────────────────────

  getPromotions(governorate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (governorate) params = params.set('governorate', governorate);
    return this.http.get<any[]>(`${this.base}/promotions`, { params });
  }

  createPromotion(dto: {
    product_id: string;
    discount_pct: number;
    governorate_target?: string;
    valid_from: string;
    valid_until: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/promotions`, dto);
  }

  deletePromotion(promoId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/promotions/${promoId}`);
  }


  // ── CRM API Methods ────────────────────────────────────────────────────────

  getCrmStats(): Observable<CrmStats> {
    return this.http.get<CrmStats>(`${this.base}/crm/stats`);
  }

  getCrmClients(filters: {
    search?: string;
    segment?: string;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    isArchived?: boolean;
  }): Observable<CrmClient[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.segment) params = params.set('segment', filters.segment);
    if (filters.tags && filters.tags.length > 0) params = params.set('tags', filters.tags.join(','));
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    if (filters.isArchived !== undefined) params = params.set('isArchived', String(filters.isArchived));

    return this.http.get<CrmClient[]>(`${this.base}/crm/clients`, { params });
  }

  getCrmClientById(id: string): Observable<CrmClient> {
    return this.http.get<CrmClient>(`${this.base}/crm/clients/${id}`);
  }

  getClientOrders(clientId: string): Observable<SupplierOrder[]> {
    return this.http.get<SupplierOrder[]>(`${this.base}/crm/clients/${clientId}/orders`);
  }

  getClientNotes(clientId: string): Observable<CrmNote[]> {
    return this.http.get<CrmNote[]>(`${this.base}/crm/clients/${clientId}/notes`);
  }

  addNote(clientId: string, dto: { note_type: string; content: string; is_pinned?: boolean; related_order_id?: string }): Observable<CrmNote> {
    return this.http.post<CrmNote>(`${this.base}/crm/clients/${clientId}/notes`, dto);
  }

  updateNote(noteId: string, dto: { content?: string; is_pinned?: boolean }): Observable<CrmNote> {
    return this.http.patch<CrmNote>(`${this.base}/crm/notes/${noteId}`, dto);
  }

  deleteNote(noteId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/crm/notes/${noteId}`);
  }

  getClientReminders(clientId: string): Observable<CrmReminder[]> {
    return this.http.get<CrmReminder[]>(`${this.base}/crm/clients/${clientId}/reminders`);
  }

  addReminder(clientId: string, dto: { title: string; description?: string; reminder_date: string }): Observable<CrmReminder> {
    return this.http.post<CrmReminder>(`${this.base}/crm/clients/${clientId}/reminders`, dto);
  }

  completeReminder(reminderId: string): Observable<CrmReminder> {
    return this.http.patch<CrmReminder>(`${this.base}/crm/reminders/${reminderId}/complete`, {});
  }

  deleteReminder(reminderId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/crm/reminders/${reminderId}`);
  }

  updateCrmClient(clientId: string, dto: Partial<CrmClient>): Observable<CrmClient> {
    return this.http.patch<CrmClient>(`${this.base}/crm/clients/${clientId}`, dto);
  }

  archiveCrmClient(clientId: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.base}/crm/clients/${clientId}/archive`, {});
  }

  getUpcomingReminders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/crm/reminders/upcoming`);
  }
}

// ── CRM Interfaces ────────────────────────────────────────────────────────

export interface CrmClient {
  id: string;
  supplier_id: string;
  buyer_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  tax_id: string | null;
  address: string | null;
  governorate: string | null;
  notes: string | null;
  tags: string[] | null;
  segment: 'VIP' | 'FIDELE' | 'OCCASIONNEL' | 'INACTIF' | 'NOUVEAU' | null;
  segment_updated_at?: string;
  total_orders_count: number;
  total_spent_tnd: number;
  average_order_value_tnd: number;
  first_order_date: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;
  lifetime_value_score: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: string;
  crm_client_id: string;
  note_type: 'NOTE' | 'APPEL' | 'VISITE' | 'RELANCE' | 'COMMANDE' | 'PAIEMENT';
  content: string;
  is_pinned: boolean;
  related_order_id?: string | null;
  created_by_id?: string;
  created_at: string;
}

export interface CrmReminder {
  id: string;
  crm_client_id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  client_name?: string;
}

export interface CrmStats {
  total_clients: number;
  vip_count: number;
  fidele_count: number;
  inactif_count: number;
  nouveau_count: number;
  occasionnel_count: number;
  clients_sans_commande_30j: number;
  revenue_total_tnd: number;
  average_ltv: number;
  reminders_today: number;
}
