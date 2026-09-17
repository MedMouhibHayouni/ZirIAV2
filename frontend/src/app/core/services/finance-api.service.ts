import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WalletSummary {
  balance_available_tnd: number;
  balance_pending_tnd: number;
  total_earned_all_time_tnd: number;
  total_platform_commission_deducted_tnd: number;
  transactions: any[];
}

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance`;

  getWalletSummary(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`${this.base}/wallet/summary`).pipe(
      catchError(() => of({
        balance_available_tnd: 0,
        balance_pending_tnd: 0,
        total_earned_all_time_tnd: 0,
        total_platform_commission_deducted_tnd: 0,
        transactions: []
      }))
    );
  }
}
