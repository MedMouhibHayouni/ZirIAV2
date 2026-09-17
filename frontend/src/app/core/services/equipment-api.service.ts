import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface Equipment {
  id: string;
  type: string;
  brand?: string;
  daily_rate_tnd: number;
  available: boolean;
  owner_id?: string;
  owner?: { name: string };
  description?: string;
  location?: string;
}

export interface EquipmentReservation {
  id: string;
  equipment_id: string;
  lessee_id: string;
  start_date: string;
  end_date: string;
  total_price_tnd: number;
  created_at: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  equipment?: { type: string; daily_rate_tnd: number; brand?: string; model?: string };
  lessee?: { name: string; phone: string; governorate?: string };
}

@Injectable({ providedIn: 'root' })
export class EquipmentApiService {
  fleet           = signal<Equipment[]>([]);
  reservations    = signal<EquipmentReservation[]>([]);
  isLoadingFleet  = signal(false);
  isLoadingReqs   = signal(false);
  processingId    = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  fetchMyFleet() {
    this.isLoadingFleet.set(true);
    this.http.get<Equipment[]>(`${environment.apiUrl}/equipment/my`).pipe(
      tap(data => {
        this.fleet.set(data);
        this.isLoadingFleet.set(false);
      }),
      catchError(() => {
        this.isLoadingFleet.set(false);
        return of([]);
      })
    ).subscribe();
  }

  fetchPendingRequests() {
    this.isLoadingReqs.set(true);
    this.http.get<EquipmentReservation[]>(`${environment.apiUrl}/equipment/requests/pending`).pipe(
      tap(data => {
        this.reservations.set(data);
        this.isLoadingReqs.set(false);
      }),
      catchError(() => {
        this.isLoadingReqs.set(false);
        return of([]);
      })
    ).subscribe();
  }

  approveReservation(reservationId: string) {
    this.processingId.set(reservationId);
    return this.http.patch(
      `${environment.apiUrl}/equipment/reservations/${reservationId}/approve`, {}
    ).pipe(
      tap(() => {
        this.reservations.update(list =>
          list.map(r => r.id === reservationId ? { ...r, status: 'APPROVED' as const } : r)
        );
        this.processingId.set(null);
      }),
      catchError(err => {
        this.processingId.set(null);
        throw err; // ErrorInterceptor (Sprint 9) will surface the 409 Conflict toast
      })
    );
  }

  rejectReservation(reservationId: string) {
    this.processingId.set(reservationId);
    return this.http.patch(
      `${environment.apiUrl}/equipment/reservations/${reservationId}/reject`, {}
    ).pipe(
      tap(() => {
        this.reservations.update(list =>
          list.map(r => r.id === reservationId ? { ...r, status: 'REJECTED' as const } : r)
        );
        this.processingId.set(null);
      }),
      catchError(err => {
        this.processingId.set(null);
        throw err;
      })
    );
  }
}
