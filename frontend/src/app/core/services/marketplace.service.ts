import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

export type ListingCategory =
  | 'FRESH_PRODUCE' | 'LIVESTOCK' | 'FORAGE_FEED' | 'EQUIPMENT'
  | 'LAND' | 'PROCESSED' | 'SEEDS' | 'GENERAL';

export interface PublicListing {
  id: string;
  title: string;
  category: ListingCategory;
  crop_type: string | null;
  description: string | null;
  photo_urls: string[];
  quantity_value: number | null;
  quantity_unit: string | null;
  price_tnd: number | null;
  price_on_request: boolean;
  location_label: string | null;
  created_at: string;
  seller_id: string;
  seller_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  livestock_type?: string | null;
  equipment_condition?: 'NEW' | 'USED' | null;
  land_size_ha?: number | null;
  land_water_access?: boolean | null;
  land_soil_type?: string | null;
  land_open_for_bidding?: boolean | null;
  status?: string;
  floral_origin?: string | null;
  sanitary_cert?: boolean | null;
  breeding_method?: string | null;
  traceability_ref_id?: string | null;
}

export interface PublicListingPage {
  items: PublicListing[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private apiUrl = `${environment.apiUrl}/marketplace`;

  // Authenticated view signals (for farmer/B2B dashboards)
  listings = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  hasError = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  // ─── PUBLIC (unauthenticated) ───────────────────────────────────────────────

  fetchPublicListings(filters: {
    category?: ListingCategory;
    search?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    priceOnRequest?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Observable<PublicListingPage> {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search)   params = params.set('search', filters.search);
    if (filters.location) params = params.set('location', filters.location);
    if (filters.minPrice !== undefined && filters.minPrice !== null) params = params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) params = params.set('maxPrice', String(filters.maxPrice));
    if (filters.priceOnRequest !== undefined && filters.priceOnRequest !== null) params = params.set('priceOnRequest', String(filters.priceOnRequest));
    if (filters.sortBy)   params = params.set('sortBy', filters.sortBy);
    if (filters.page)     params = params.set('page', String(filters.page));
    if (filters.limit)    params = params.set('limit', String(filters.limit));
    return this.http.get<PublicListingPage>(`${this.apiUrl}/public`, { params });
  }

  fetchPublicListing(id: string): Observable<PublicListing> {
    return this.http.get<PublicListing>(`${this.apiUrl}/public/${id}`);
  }

  submitInquiry(data: {
    listing_id: string;
    inquirer_name: string;
    inquirer_email: string;
    inquirer_phone?: string;
    message: string;
  }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/public/inquiry`, data);
  }

  // ─── AUTHENTICATED ──────────────────────────────────────────────────────────

  fetchListings(options?: { cropType?: string; cooperativeId?: string }) {
    this.hasError.set(false);
    this.isLoading.set(true);
    let url = this.apiUrl;
    const params: string[] = [];
    if (options?.cropType) params.push(`crop=${options.cropType}`);
    if (options?.cooperativeId) params.push(`cooperative_id=${options.cooperativeId}`);
    if (params.length > 0) url += '?' + params.join('&');

    this.http.get<any>(url).pipe(
      tap(res => {
        const data = Array.isArray(res) ? res : (res.items || []);
        this.listings.set(data);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error(err);
        this.isLoading.set(false);
        this.hasError.set(true);
        return of([]);
      })
    ).subscribe();
  }

  /** Create listing with optional photos (FormData or JSON object) */
  createListing(data: FormData | any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  expressInterest(listingId: string, data: { message?: string; quantity_tonnes?: number }) {
    return this.http.post(`${this.apiUrl}/${listingId}/interest`, data);
  }

  getConnections() {
    return this.http.get<any[]>(`${this.apiUrl}/connections/me`);
  }

  respondToConnection(connectionId: string, status: 'CONFIRM' | 'REJECT') {
    return this.http.patch(`${this.apiUrl}/connections/${connectionId}/respond`, { action: status });
  }

  updateListingStatus(listingId: string, status: string) {
    return this.http.patch(`${this.apiUrl}/${listingId}/status`, { status });
  }

  /** Edit listing details: title, price, quantity, description, etc. */
  updateListing(listingId: string, data: Partial<any>): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${listingId}`, data);
  }

  deleteListing(listingId: string) {
    return this.http.delete(`${this.apiUrl}/${listingId}`);
  }

  addMedia(listingId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${listingId}/media`, formData);
  }

  reorderMedia(listingId: string, newOrder: { url: string; position: number }[]): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${listingId}/media/reorder`, { newOrder });
  }

  setPrimary(listingId: string, position: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${listingId}/media/primary`, { position });
  }

  removeMedia(listingId: string, position: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${listingId}/media/${position}`);
  }

  getMyStats() {
    return this.http.get<any>(`${this.apiUrl}/my-stats`);
  }

  fetchMyListings(): Observable<PublicListing[]> {
    return this.http.get<PublicListing[]>(`${this.apiUrl}/my-listings`);
  }

  // ─── MESSAGES ───────────────────────────────────────────────────────────────

  sendMessage(receiverId: string, content: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/messages`, { receiverId, content });
  }

  getThread(interlocutorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/messages/${interlocutorId}`);
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/messages`);
  }
}
