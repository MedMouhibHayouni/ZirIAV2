import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideZap, lucideTrendingUp, lucideDollarSign, lucideRefreshCw, lucideUsers, lucideAlertTriangle, lucideCheck, lucideChevronRight } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-storage-revenue',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  viewProviders: [provideIcons({ lucideZap, lucideTrendingUp, lucideDollarSign, lucideRefreshCw, lucideUsers, lucideAlertTriangle, lucideCheck, lucideChevronRight })],
  templateUrl: './storage-revenue.component.html',
  styleUrls: ['./storage-revenue.component.scss']
})
export class StorageRevenueComponent implements OnInit {
  loading = signal(true);
  revenue = signal<any>(null);
  rooms = signal<any[]>([]);
  facilityId = signal<string>('');

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/storage/revenue/summary`).subscribe({
      next: (data) => {
        this.revenue.set(data);
        this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/my`).subscribe({
          next: (facs) => {
            if (facs.length > 0) {
              this.facilityId.set(facs[0].id);
              this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/${facs[0].id}/rooms`).subscribe({
                next: (rooms) => { this.rooms.set(rooms); this.loading.set(false); },
                error: () => this.loading.set(false)
              });
            } else { this.loading.set(false); }
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  get energyRatio() {
    const gross = Number(this.revenue()?.monthly_revenue || 0);
    const elec = Number(this.revenue()?.monthly_electricity_cost || 0);
    return gross > 0 ? Math.round((elec / gross) * 100) : 0;
  }

  getUnitLabel(unit: string): string {
    const map: Record<string, string> = { M3: 'm³', CAJOT: 'cajots', KG: 'kg', LITRE: 'L', FORFAIT: 'forfait' };
    return map[unit] || unit;
  }

  getClientProRataElec(room: any, reservation: any): number {
    const occupiedTotal = Number(room.occupied_capacity || 0);
    if (occupiedTotal === 0) return 0;
    const ratio = Number(reservation.occupied_capacity) / occupiedTotal;
    return Math.round(Number(room.monthly_elec_cost_tnd || 0) * ratio);
  }
}
