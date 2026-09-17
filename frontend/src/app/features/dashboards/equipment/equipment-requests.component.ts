import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideWrench, lucideLoader, lucideCheckCircle, lucideXCircle,
  lucideCalendar, lucideTrendingUp, lucideMapPin
} from '@ng-icons/lucide';

interface RentalRequest {
  id: string;
  requester_name?: string;
  equipment_name?: string;
  start_date: string;
  end_date: string;
  governorate: string;
  proposed_price_tnd: number;
  status: string;
  _accepting?: boolean;
  _rejecting?: boolean;
}

interface EquipStats {
  total_equipment: number;
  active_rentals: number;
  monthly_revenue_tnd: number;
  utilization_pct: number;
}

@Component({
  selector: 'app-equipment-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucideWrench, lucideLoader, lucideCheckCircle, lucideXCircle, lucideCalendar, lucideTrendingUp, lucideMapPin })],
  templateUrl: './equipment-requests.component.html',
  styleUrls: ['./equipment-requests.component.scss'],
})
export class EquipmentRequestsComponent implements OnInit {
  private http = inject(HttpClient);

  stats = signal<EquipStats | null>(null);
  pending = signal<RentalRequest[]>([]);
  active = signal<RentalRequest[]>([]);
  history = signal<RentalRequest[]>([]);
  isLoading = signal(true);
  
  activeTab = signal<'PENDING' | 'ACTIVE' | 'HISTORY'>('PENDING');

  ngOnInit() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/equipment/reservations`).subscribe({
      next: (res) => {
        const all: RentalRequest[] = res ?? [];
        this.pending.set(all.filter(r => r.status === 'PENDING'));
        this.active.set(all.filter(r => r.status === 'APPROVED'));
        this.history.set(all.filter(r => r.status === 'REJECTED' || r.status === 'COMPLETED'));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
    this.http.get<any>(`${environment.apiUrl}/equipment/revenue/summary?period=month`).subscribe({
      next: (s) => {
        if (s) {
          this.stats.set({
            total_equipment: 0, // Not provided by revenue summary but we can keep it
            active_rentals: 0,
            monthly_revenue_tnd: s.total_revenue || 0,
            utilization_pct: 75 // Placeholder
          });
        }
      },
      error: () => {},
    });
  }

  setTab(tab: 'PENDING' | 'ACTIVE' | 'HISTORY') {
    this.activeTab.set(tab);
  }

  acceptRequest(req: RentalRequest) {
    req._accepting = true;
    this.http.patch(`${environment.apiUrl}/equipment/reservations/${req.id}/accept`, {}).subscribe({
      next: () => {
        this.pending.update(list => list.filter(r => r.id !== req.id));
        this.active.update(list => [{ ...req, status: 'APPROVED' }, ...list]);
      },
      error: () => { req._accepting = false; },
    });
  }

  rejectRequest(req: RentalRequest) {
    req._rejecting = true;
    this.http.patch(`${environment.apiUrl}/equipment/reservations/${req.id}/reject`, {}).subscribe({
      next: () => { 
        this.pending.update(list => list.filter(r => r.id !== req.id));
        this.history.update(list => [{ ...req, status: 'REJECTED' }, ...list]);
      },
      error: () => { req._rejecting = false; },
    });
  }

  getDuration(req: RentalRequest): string {
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    return `${days} jour${days > 1 ? 's' : ''}`;
  }

  getDaysRemaining(req: RentalRequest): number {
    const end = new Date(req.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }
  
  getTotalDays(req: RentalRequest): number {
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  }
  
  getProgressPercentage(req: RentalRequest): number {
    const total = this.getTotalDays(req);
    const remaining = this.getDaysRemaining(req);
    const passed = total - remaining;
    return Math.min(100, Math.max(0, (passed / total) * 100));
  }
}
