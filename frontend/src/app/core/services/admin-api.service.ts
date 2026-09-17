import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface KpiData {
  total_users: number;
  today_transactions_count: number;
  today_transactions_volume: number;
  today_commissions: number;
  active_critical_alerts: number;
}

export interface AdminTransaction {
  id: string;
  amount_tnd: number;
  status: string;
  created_at: string;
  type: string;
  user_id?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  kpis = signal<KpiData | null>(null);
  recentTransactions = signal<AdminTransaction[]>([]);
  isLoadingKpis = signal(false);
  isLoadingTransactions = signal(false);

  constructor(private http: HttpClient) {}

  fetchKpis() {
    this.isLoadingKpis.set(true);
    this.http.get<KpiData>(`${environment.apiUrl}/admin/kpis`).pipe(
      tap(data => {
        this.kpis.set(data);
        this.isLoadingKpis.set(false);
      }),
      catchError(() => {
        this.isLoadingKpis.set(false);
        return of(null);
      })
    ).subscribe();
  }

  fetchRecentTransactions() {
    this.isLoadingTransactions.set(true);
    this.http.get<AdminTransaction[]>(`${environment.apiUrl}/admin/transactions`).pipe(
      tap(data => {
        this.recentTransactions.set(data);
        this.isLoadingTransactions.set(false);
      }),
      catchError(() => {
        this.recentTransactions.set([]);
        this.isLoadingTransactions.set(false);
        return of([]);
      })
    ).subscribe();
  }
}
