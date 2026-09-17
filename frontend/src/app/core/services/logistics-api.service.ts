import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_type: string;
  capacity_tonnes: number;
  governorate: string | null;
  is_available: boolean;
  vehicle_plate: string | null;
  license_number: string | null;
  rating: number;
  live_lat?: number | null;
  live_lng?: number | null;
  is_tracking_active?: boolean;
  user?: { name: string; phone: string };
}

export interface FreightMission {
  id: string;
  origin_address: string;
  destination_address: string;
  cargo_type: string;
  weight_tonnes: number;
  proposed_price_tnd: number;
  accepted_price_tnd: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
  requester?: { name: string; phone: string; };
}

@Injectable({ providedIn: 'root' })
export class LogisticsApiService {
  availableMissions = signal<FreightMission[]>([]);
  activeMission = signal<FreightMission | null>(null);
  missionHistory = signal<FreightMission[]>([]);
  myProfile = signal<DriverProfile | null>(null);
  
  isLoadingAvailable = signal(false);
  isLoadingActive = signal(false);
  isLoadingProfile = signal(false);
  
  constructor(private http: HttpClient) {}

  fetchMyProfile() {
    this.isLoadingProfile.set(true);
    return this.http.get<DriverProfile>(`${environment.apiUrl}/drivers/profile/me`).pipe(
      tap(data => {
        this.myProfile.set(data);
        this.isLoadingProfile.set(false);
      }),
      catchError(() => {
        this.isLoadingProfile.set(false);
        return of(null);
      })
    );
  }

  updateProfile(dto: Partial<DriverProfile>) {
    return this.http.post<DriverProfile>(`${environment.apiUrl}/drivers/profile`, dto).pipe(
      tap(data => this.myProfile.set(data))
    );
  }

  fetchAvailableMissions() {
    this.isLoadingAvailable.set(true);
    return this.http.get<FreightMission[]>(`${environment.apiUrl}/drivers/transport-requests/available`).pipe(
      tap(data => {
        this.availableMissions.set(data || []);
        this.isLoadingAvailable.set(false);
      }),
      catchError(() => {
        this.isLoadingAvailable.set(false);
        return of([]);
      })
    );
  }

  fetchHistory() {
    return this.http.get<FreightMission[]>(`${environment.apiUrl}/drivers/transport-requests/my-missions`).pipe(
      tap(data => this.missionHistory.set(data || []))
    );
  }

  fetchMyActiveMission() {
    this.isLoadingActive.set(true);
    return this.http.get<FreightMission[]>(`${environment.apiUrl}/drivers/transport-requests/my-missions`).pipe(
      tap(data => {
        const active = (data || []).find(m => m.status === 'ACCEPTED' || m.status === 'IN_TRANSIT' || m.status === 'PENDING') || null;
        this.activeMission.set(active);
        this.isLoadingActive.set(false);
      }),
      catchError(() => {
        this.isLoadingActive.set(false);
        return of(null);
      })
    );
  }

  acceptMission(id: string) {
    return this.http.patch(`${environment.apiUrl}/drivers/transport-requests/${id}/accept`, {});
  }

  completeMission(id: string) {
    return this.http.patch(`${environment.apiUrl}/drivers/transport-requests/${id}/complete`, {});
  }

  updateTransportStatus(id: string, stage: 'IN_TRANSIT' | 'DELIVERED') {
    return this.http.patch(`${environment.apiUrl}/drivers/requests/${id}/stage`, { stage });
  }
}
