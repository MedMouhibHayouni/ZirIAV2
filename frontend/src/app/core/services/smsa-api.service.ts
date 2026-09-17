import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface SmsaMember {
  id: string;
  name: string;
  governorate?: string;
  delegation?: string;
  phone: string;
  role?: string;
  verified?: boolean;
}

export interface SmsaParcel {
  id: string;
  crop_type: string;
  surface_ha: number;
  lat: number;
  lng: number;
  status: 'ok' | 'weather_risk' | 'disease_alert';
  owner?: { name: string };
}

export interface SmsaStats {
  cooperative_name: string;
  active_members: number;
  active_listings: number;
  pending_transactions: number;
  active_alerts: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'sale' | 'disease' | 'job' | 'other';
  actor_name: string;
  action: string;
  entity_name: string;
  created_at: string;
}

export interface WeatherForecast {
  date: string;
  temp: number;
  temp_max?: number;
  temp_min?: number;
  humidity: number;
  description: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class SmsaApiService {
  members = signal<SmsaMember[]>([]);
  parcels = signal<SmsaParcel[]>([]);
  stats = signal<SmsaStats | null>(null);
  activityFeed = signal<ActivityFeedItem[]>([]);
  weather = signal<WeatherForecast[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  constructor(private http: HttpClient) {}

  // Sprint 4: Use cooperative-scoped endpoint, NOT admin users endpoint
  fetchMembers(page: number = 1, limit: number = 20, search: string = '') {
    this.isLoading.set(true);
    this.hasError.set(false);
    const url = `${environment.apiUrl}/cooperatives/my/members`;
    this.http.get<any>(url).pipe(
      tap(data => {
        let results = Array.isArray(data) ? data : (data.data || data.items || []);
        if (search) {
          const q = search.toLowerCase();
          results = results.filter((m: any) =>
            m.name?.toLowerCase().includes(q) ||
            m.phone?.includes(q) ||
            m.email?.toLowerCase().includes(q)
          );
        }
        this.members.set(results);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.hasError.set(true);
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe();
  }

  fetchParcels(coopId: string = 'my') {
    this.isLoading.set(true);
    this.hasError.set(false);
    const url = `${environment.apiUrl}/parcels?cooperative=${coopId}`;
    this.http.get<SmsaParcel[]>(url).pipe(
      tap(data => {
        this.parcels.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.hasError.set(true);
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe();
  }

  getParcelDetails(id: string) {
    return this.http.get<any>(`${environment.apiUrl}/parcels/${id}`);
  }

  getParcelCropZones(id: string) {
    return this.http.get<any[]>(`${environment.apiUrl}/parcels/${id}/crop-zones`);
  }

  fetchMemberParcels(userId: string) {
    return this.http.get<SmsaParcel[]>(`${environment.apiUrl}/parcels/my?user_id=${userId}`);
  }

  createParcel(parcelData: any) {
    return this.http.post<SmsaParcel>(`${environment.apiUrl}/parcels`, parcelData);
  }

  // Sprint 5: Accept governorate from AuthService to use real region for weather
  fetchOverviewData(governorate?: string) {
    this.isLoading.set(true);
    this.hasError.set(false);

    // Stats / KPIs
    this.http.get<any>(`${environment.apiUrl}/cooperatives/my/stats`).pipe(
      tap(data => {
        this.stats.set({
          cooperative_name: data.cooperative_name || 'Ma Coopérative',
          active_members: data.total_members || 0,
          active_listings: data.total_listings || 0,
          pending_transactions: data.pending_transactions || 0,
          active_alerts: data.active_alerts || 0
        });
      }),
      catchError(() => of(null))
    ).subscribe();

    // Activity Feed
    this.http.get<ActivityFeedItem[]>(`${environment.apiUrl}/cooperatives/my/activity-feed`).pipe(
      tap(data => this.activityFeed.set(Array.isArray(data) ? data : [])),
      catchError(() => of([]))
    ).subscribe();

    // Sprint 5: Weather — use real governorate, fallback to coordinates
    const gov = governorate || 'Kasserine';
    this.http.get<WeatherForecast[]>(`${environment.apiUrl}/weather?city=${encodeURIComponent(gov)}&days=3`).pipe(
      tap(data => this.weather.set(Array.isArray(data) ? data : [])),
      catchError(() => {
        return this.http.get<WeatherForecast[]>(`${environment.apiUrl}/weather?lat=35.17&lng=8.83&days=3`).pipe(
          tap(data => this.weather.set(Array.isArray(data) ? data : [])),
          catchError(() => of([]))
        );
      })
    ).subscribe();

    setTimeout(() => this.isLoading.set(false), 500);
  }

  broadcastAlert(message: string) {
    return this.http.post(`${environment.apiUrl}/cooperatives/my/broadcast`, { message });
  }
}
