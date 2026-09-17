import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of, Observable } from 'rxjs';

export interface JobOffer {
  id: string;
  task_type: string;
  description?: string;
  employer?: { name: string; phone?: string };
  daily_pay_tnd: number;
  duration_days: number;
  start_date: string;
  governorate: string;
  lat: number;
  lng: number;
  status: string;
  applications?: any[]; // Farmer dashboard specific
  _deleting?: boolean; // UI delete state
}

export interface MissionContextSnapshot {
  parcel_name: string;
  surface_ha?: number | null;
  center_gps?: { lat: number; lng: number } | null;
  boundary_geojson?: any;
  crop_type: string;
  task_type: string;
  description: string;
  daily_pay_tnd: number;
  duration_days: number;
  estimated_total_earnings_tnd: number;
  start_date: string;
  employer_name: string;
  employer_phone?: string | null;
  navigation_deep_link?: string | null;
}

export interface WorkerApplication {
  id: string;
  job_offer_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  applied_at: string;
  navigation_deep_link?: string | null;
  mission_context_snapshot?: MissionContextSnapshot | null;
  jobOffer: JobOffer;
}

export interface WorkerProfile {
  id: string;
  skills: string[];
  radius_km: number;
  daily_rate_tnd?: number;
  bio?: string;
  governorate?: string;
  is_available?: boolean;
  rating?: number;
  total_jobs_done?: number;
  user?: { name: string; phone?: string };
}

export interface WorkerCertification {
  id: string;
  certification_name: string;
  issuing_organization?: string;
  issued_date?: string;
  expiry_date?: string;
  description?: string;
  document_url?: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejection_reason?: string;
  created_at?: string;
}

export interface WorkerEarning {
  id: string;
  task_type: string;
  duration_days: number;
  daily_pay_tnd: number;
  total_earned_tnd: number;
  governorate?: string;
  work_start_date: string;
  completed_at: string;
}

export interface WorkerEarningStats {
  total_earned_all_time: number;
  total_earned_this_month: number;
  total_missions_completed: number;
  average_daily_rate: number;
}

export interface WorkerEarningsPayload {
  earnings: WorkerEarning[];
  stats: WorkerEarningStats;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  payload?: any;
}

@Injectable({ providedIn: 'root' })
export class AgriJobApiService {
  availableJobs = signal<JobOffer[]>([]);
  myApplications = signal<WorkerApplication[]>([]);
  profile = signal<WorkerProfile | null>(null);
  unreadNotificationsCount = signal<number>(0);

  isLoadingJobs = signal(false);
  isLoadingApps = signal(false);

  constructor(private http: HttpClient) {}

  fetchAvailableJobs(lat?: number, lng?: number, radius = 50) {
    this.isLoadingJobs.set(true);
    let url = `${environment.apiUrl}/workers/job-offers?limit=50`;
    if (lat && lng) {
      url += `&lat=${lat}&lng=${lng}&radius_km=${radius}`;
    }

    return this.http.get<any>(url).pipe(
      tap(data => {
        const items = data.items || data || [];
        this.availableJobs.set(items);
        this.isLoadingJobs.set(false);
      }),
      catchError(() => {
        this.isLoadingJobs.set(false);
        return of([]);
      })
    );
  }

  fetchMyApplications() {
    this.isLoadingApps.set(true);
    return this.http.get<WorkerApplication[]>(`${environment.apiUrl}/workers/my-applications`).pipe(
      tap(data => {
        this.myApplications.set(data);
        this.isLoadingApps.set(false);
      }),
      catchError(() => {
        this.isLoadingApps.set(false);
        return of([]);
      })
    );
  }

  applyToJob(jobId: string, coverMessage?: string) {
    return this.http.post(`${environment.apiUrl}/workers/job-offers/${jobId}/apply`, { cover_message: coverMessage });
  }

  fetchMyProfile() {
    return this.http.get<WorkerProfile>(`${environment.apiUrl}/workers/profile/me`).pipe(
      tap(data => this.profile.set(data))
    );
  }

  updateProfile(profile: Partial<WorkerProfile>) {
    return this.http.put(`${environment.apiUrl}/workers/profile/my`, profile).pipe(
      tap(data => this.profile.set(data as WorkerProfile))
    );
  }

  // ─── CERTIFICATIONS ────────────────────────────────────────────────────────

  getMyCertifications(): Observable<WorkerCertification[]> {
    return this.http.get<WorkerCertification[]>(`${environment.apiUrl}/workers/certifications/mine`);
  }

  addCertification(cert: Partial<WorkerCertification>): Observable<WorkerCertification> {
    return this.http.post<WorkerCertification>(`${environment.apiUrl}/workers/certifications`, cert);
  }

  deleteCertification(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/workers/certifications/${id}`);
  }

  // ─── REVENUS ───────────────────────────────────────────────────────────────

  getMyEarnings(): Observable<WorkerEarningsPayload> {
    return this.http.get<WorkerEarningsPayload>(`${environment.apiUrl}/workers/earnings/mine`);
  }

  // ─── NOTATIONS ─────────────────────────────────────────────────────────────

  getMyRatings(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/workers/ratings/mine`);
  }

  // ─── CENTRE DE NOTIFICATIONS ───────────────────────────────────────────────

  getNotifications(page = 1, limit = 50): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/notifications/my?page=${page}&limit=${limit}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).pipe(
      tap(res => this.unreadNotificationsCount.set(res.count))
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/notifications/mark-all-read`, {}).pipe(
      tap(() => this.unreadNotificationsCount.set(0))
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => this.unreadNotificationsCount.update(c => Math.max(0, c - 1)))
    );
  }
}
