import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogisticsApiService, FreightMission } from '../../../core/services/logistics-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTruck, lucideHistory, lucideCheckCircle, lucideX, lucideClock,
  lucideArrowRight, lucidePackage, lucideWeight, lucideMapPin,
  lucideDollarSign, lucideStar
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-history',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideTruck, lucideHistory, lucideCheckCircle, lucideX, lucideClock,
    lucideArrowRight, lucidePackage, lucideWeight, lucideMapPin,
    lucideDollarSign, lucideStar
  })],
  templateUrl: './driver-history.component.html',
  styleUrl: './driver-history.component.scss'
})
export class DriverHistoryComponent implements OnInit {
  private api = inject(LogisticsApiService);
  private cdr = inject(ChangeDetectorRef);

  history = this.api.missionHistory;
  isLoading = signal(true);

  // Stats
  totalDelivered = signal(0);
  totalEarned = signal(0);
  avgRating = signal(5.0);

  ngOnInit() {
    this.api.fetchHistory().subscribe({
      next: (data) => {
        const delivered = (data || []).filter(m => m.status === 'DELIVERED');
        this.totalDelivered.set(delivered.length);
        this.totalEarned.set(delivered.reduce((sum, m) => sum + (m.accepted_price_tnd || m.proposed_price_tnd || 0), 0));
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'DELIVERED': 'status-delivered',
      'CANCELLED': 'status-cancelled',
      'IN_TRANSIT': 'status-transit',
      'ACCEPTED': 'status-accepted',
      'PENDING': 'status-pending'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DELIVERED': '✓ Livré',
      'CANCELLED': '✗ Annulé',
      'IN_TRANSIT': '🚛 En transit',
      'ACCEPTED': 'Accepté',
      'PENDING': 'En attente'
    };
    return labels[status] || status;
  }

  formatAmount(price: number): string {
    return (price || 0).toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}
