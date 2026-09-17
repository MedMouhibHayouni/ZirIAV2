import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePackage, lucideShoppingBag, lucideTrendingUp, lucideAlertTriangle,
  lucideArrowRight, lucideBarChart2, lucideCheckCircle, lucideClock,
  lucideTruck, lucideLoader, lucideCircleDollarSign, lucideBoxes
} from '@ng-icons/lucide';
import { SupplierApiService, SupplierStats, SupplierOrder } from '../../../core/services/supplier-api.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-supplier-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, RouterLink],
  providers: [provideIcons({
    lucidePackage, lucideShoppingBag, lucideTrendingUp, lucideAlertTriangle,
    lucideArrowRight, lucideBarChart2, lucideCheckCircle, lucideClock,
    lucideTruck, lucideLoader, lucideCircleDollarSign, lucideBoxes
  })],
  templateUrl: './supplier-overview.component.html',
  styleUrl: './supplier-overview.component.scss'
})
export class SupplierOverviewComponent implements OnInit {
  private readonly api = inject(SupplierApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  stats = signal<SupplierStats | null>(null);
  isLoading = signal(true);

  statusLabel = (s: string) => ({
    PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'En préparation',
    SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée'
  })[s] ?? s;

  statusClass = (s: string) => ({
    PENDING: 'badge--warning', CONFIRMED: 'badge--info', PREPARING: 'badge--purple',
    SHIPPED: 'badge--blue', DELIVERED: 'badge--success', CANCELLED: 'badge--danger'
  })[s] ?? '';

  ngOnInit(): void {
    this.api.getStats().subscribe({
      next: (data) => { this.stats.set(data); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); }
    });
  }
}
