import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ZoneStats {
  zone: { id: string; name: string; delegation: string; governorate: string; center_lat: number; center_lng: number };
  total_farmers: number;
  active_farmers_this_week: number;
  total_parcels: number;
  total_area_ha: number;
  active_alerts: { critical: number; warning: number; normal: number };
  active_listings: number;
  zone_health_score: number;
  harvests_this_week: { farmer_display_name: string; crop_type: string; eta_days: number }[];
}

export interface ZoneFarmer {
  id: string;
  display_name: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  privacy_level: 'ANONYMOUS' | 'SEMI_PUBLIC' | 'OPEN';
  governorate: string;
  delegation?: string;
  parcel_count: number;
  total_area_ha: number;
  alert_level: string;
  crop_types: string[];
  last_activity: string;
}

export interface ZoneAlert {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL';
  disease_name: string;
  confidence_score: number;
  detected_at: string;
  farmer_display_name: string;
  parcel_name: string;
  crop_type: string;
  photo_url?: string;
  requires_action: boolean;
}

export interface FieldReport {
  id: string;
  description: string;
  observations?: string;
  recommendations?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'EXPERT_REVIEWING' | 'RESOLVED';
  affected_crop_type?: string;
  crop_type?: string;
  affected_area_ha?: number;
  location_lat?: number;
  location_lng?: number;
  gps_lat?: number;
  gps_lng?: number;
  photo_urls?: string[];
  farmer_id?: string;
  created_at: string;
  notified_experts?: number;
}

export interface ActivityFeedItem {
  type: 'DISEASE' | 'JOB_OFFER' | 'MARKETPLACE';
  actor_name: string;
  description: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AmbassadorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ambassador`;

  getZoneStats(): Observable<ZoneStats> {
    return this.http.get<ZoneStats>(`${this.base}/zone-stats`).pipe(catchError(() => of(null as any)));
  }

  getZoneFarmers(): Observable<ZoneFarmer[]> {
    return this.http.get<ZoneFarmer[]>(`${this.base}/zone-farmers`).pipe(catchError(() => of([])));
  }

  getZoneAlerts(): Observable<ZoneAlert[]> {
    return this.http.get<ZoneAlert[]>(`${this.base}/zone-alerts`).pipe(catchError(() => of([])));
  }

  getExpertAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/expert-alerts`).pipe(catchError(() => of([])));
  }

  getFieldReports(): Observable<FieldReport[]> {
    return this.http.get<FieldReport[]>(`${this.base}/field-reports`).pipe(catchError(() => of([])));
  }

  submitFieldReport(dto: Partial<FieldReport> & { severity: string }): Observable<FieldReport> {
    return this.http.post<FieldReport>(`${this.base}/field-reports`, dto);
  }

  registerFarmer(dto: { name: string; phone?: string; governorate: string; delegation?: string; privacy_level?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/farmers/register`, dto);
  }

  /** Sprint 10: Full registration with credentials */
  registerFarmerFull(dto: {
    first_name: string; last_name: string; phone?: string; national_id?: string;
    email?: string; password: string; governorate: string; delegation?: string;
    village?: string; parcel_count?: number; privacy_level?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/register-farmer`, dto);
  }

  /** Sprint 10: Zone activity feed */
  getActivityFeed(): Observable<ActivityFeedItem[]> {
    return this.http.get<ActivityFeedItem[]>(`${this.base}/activity-feed`).pipe(catchError(() => of([])));
  }

  proxyAction(dto: { farmer_id: string; action_type: string; payload: Record<string, unknown> }): Observable<any> {
    return this.http.post<any>(`${this.base}/proxy-action`, dto);
  }
}
