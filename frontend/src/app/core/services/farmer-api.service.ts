import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';

export interface Conversation {
  farmer_id: string;
  farmer_name: string;
  governorate?: string;
  role?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  attachment_type?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'pdf' | 'document';
  attachment_name?: string;
}

export interface CropZone {
  id: string;
  parcel_id: string;
  name?: string;
  crop_type: string;
  surface_ha: number;
  planted_at: string;
  harvest_prediction_date?: string;
  gdd_accumulated: number;
  gdd_target: number;
  plant_count: number;
}

export interface FarmerParcel {
  id: string;
  name?: string;
  crop_type: string;
  // area_ha is computed from PostGIS boundary; surface_ha is manually entered
  surface_ha: number | null;
  area_ha: number | null;
  // center_lat/center_lng are computed from PostGIS boundary
  center_lat: number | null;
  center_lng: number | null;
  // lat/lng are legacy manual fields
  lat: number | null;
  lng: number | null;
  status: 'ok' | 'weather_risk' | 'disease_alert';
  alert_level?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  zones?: CropZone[];
  color_hex?: string;
}

export interface InventoryItem {
  id: string;
  category: 'PRODUCTION' | 'INPUT';
  name: string;
  quantity: number;
  unit: string;
  min_threshold?: number;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface FinanceRecord {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  description: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FarmerApiService {
  parcels = signal<FarmerParcel[]>([]);
  inventory = signal<InventoryItem[]>([]);
  financeSummary = signal<FinanceSummary | null>(null);
  notifications = signal<AppNotification[]>([]);
  unreadNotifCount = signal(0);
  
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  fetchParcels() {
    this.isLoading.set(true);
    return this.http.get<FarmerParcel[]>(`${environment.apiUrl}/parcels/my`).pipe(
      tap(data => {
        // Ensure data is mapped if needed (though we updated the interface)
        this.parcels.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  fetchInventory() {
    return this.http.get<InventoryItem[]>(`${environment.apiUrl}/inventory/my`).pipe(
      tap(data => this.inventory.set(data)),
      catchError(() => of([]))
    );
  }

  declareMovement(payload: { type: 'IN' | 'OUT', item_id?: string, name?: string, category: string, quantity: number, reason?: string }) {
    return this.http.post(`${environment.apiUrl}/inventory/movement`, payload);
  }

  fetchFinanceSummary(period: string = 'month') {
    return this.http.get<FinanceSummary>(`${environment.apiUrl}/finance/records/summary?period=${period}`).pipe(
      tap(data => this.financeSummary.set(data)),
      catchError(() => of(null))
    );
  }

  fetchFinanceRecords(period: string = 'month', page: number = 1, limit: number = 20) {
    return this.http.get<any>(`${environment.apiUrl}/finance/records/me?period=${period}&page=${page}&limit=${limit}`);
  }

  exportFinancePDF() {
    return this.http.get(`${environment.apiUrl}/finance/export`, { responseType: 'blob' });
  }

  fetchNotifications(page: number = 1, limit: number = 30) {
    return this.http.get<any>(`${environment.apiUrl}/notifications?page=${page}&limit=${limit}`);
  }

  fetchUnreadCount() {
    return this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).pipe(
      tap(res => this.unreadNotifCount.set(res.count)),
      catchError(() => of({ count: 0 }))
    );
  }

  markNotifRead(id: string) {
    return this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {});
  }

  markAllNotifsRead() {
    return this.http.patch(`${environment.apiUrl}/notifications/read-all`, {});
  }

  addCropZone(parcelId: string, payload: any) {
    return this.http.post(`${environment.apiUrl}/parcels/${parcelId}/crop-zones`, payload);
  }

  analyzeDisease(file: File, lat: number, lng: number, cropType?: string, parcelId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lat', lat.toString());
    formData.append('lng', lng.toString());
    if (cropType) formData.append('crop_type', cropType);
    if (parcelId) formData.append('parcel_id', parcelId);
    
    return this.http.post<any>(`${environment.apiUrl}/ai/analyze-disease`, formData);
  }

  fetchMyDetections() {
    return this.http.get<any>(`${environment.apiUrl}/disease-detections/my?page=1&limit=10`);
  }

  requestExpertValidation(detectionId: string, expertId?: string) {
    return this.http.post(`${environment.apiUrl}/disease-detections/${detectionId}/request-validation`, { expert_id: expertId });
  }

  fetchExperts() {
    return this.http.get<any[]>(`${environment.apiUrl}/users/experts`).pipe(
      catchError(() => of([]))
    );
  }

  linkDetectionToParcel(detectionId: string, parcelId: string) {
    return this.http.patch(`${environment.apiUrl}/disease-detections/${detectionId}/link-parcel`, { parcel_id: parcelId });
  }

  fetchSuppliers(lat: number, lng: number, radius = 50) {
    return this.http.get<any[]>(`${environment.apiUrl}/suppliers?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  createOrder(payload: any) {
    return this.http.post(`${environment.apiUrl}/orders`, payload);
  }

  requestExpertLink(expertId: string, note?: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/farmer/expert-relations/request`, { expert_id: expertId, note });
  }

  // ── Phase 2: Expert Discovery ────────────────────────────────────────────
  discoverExperts(params: {
    lat?: number; lng?: number; problem?: string; type?: string; expert_type?: string;
  }): Observable<any[]> {
    const q = new URLSearchParams();
    if (params.lat) q.set('lat', params.lat.toString());
    if (params.lng) q.set('lng', params.lng.toString());
    if (params.problem) q.set('problem', params.problem);
    if (params.type) q.set('type', params.type);
    if (params.expert_type) q.set('expert_type', params.expert_type);
    return this.http.get<any[]>(`${environment.apiUrl}/farmer/discover-experts?${q}`)
      .pipe(catchError(() => of([])));
  }

  // ── Phase 3: Cancel Pending Request ───────────────────────────────────────
  cancelPendingExpertRequest(expertId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/farmer/expert-relations/pending/${expertId}`);
  }

  // ── Phase 4: Submit Additional Info ────────────────────────────────────────
  submitConsultationInfo(consultationId: string, text?: string, photoUrls?: string[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/farmer/consultations/${consultationId}/submit-info`, { text, photo_urls: photoUrls });
  }

  // ── Phase 5: Create Prescription Purchase ─────────────────────────────────
  createPrescriptionPurchase(dto: {
    prescription_id: string; expert_id: string; supplier_id?: string;
    product_id?: string; quantity?: number; unit_price?: number;
    commission_percentage?: number;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/farmer/prescription-purchases`, dto);
  }

  // ── Phase 7: My Linked Experts ────────────────────────────────────────────
  getMyLinkedExperts(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/farmer/my-experts`).pipe(catchError(() => of([])));
  }

  checkCrdaAutoAssignment(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/farmer/crda-auto-assignment`).pipe(catchError(() => of(null)));
  }

  // ── Messaging (via shared ExpertController endpoints) ──────────────────
  private readonly msgBase = `${environment.apiUrl}/expert/messages`;

  getMessageConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.msgBase}/conversations`).pipe(catchError(() => of([])));
  }

  getMessages(partnerId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.msgBase}/thread/${partnerId}`).pipe(catchError(() => of([])));
  }

  sendMessage(receiverId: string, body: string): Observable<any> {
    return this.http.post(`${this.msgBase}/send`, { receiver_id: receiverId, body });
  }

  getMessageUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.msgBase}/unread-count`).pipe(
      catchError(() => of({ unread_count: 0 }))
    );
  }
}
