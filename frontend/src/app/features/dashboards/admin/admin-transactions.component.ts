import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote, lucideDownload, lucideFilter, lucideLoader,
  lucideChevronLeft, lucideChevronRight, lucideTrendingUp,
  lucideTrendingDown, lucideCalendar, lucideDollarSign,
  lucideBarChart2, lucideActivity,
} from '@ng-icons/lucide';

interface Transaction {
  id: string;
  type: string;
  date: string;
  gross_tnd: number;
  commission_tnd: number;
  payer_name: string;
  payee_name: string;
  governorate: string;
  status: string;
}

interface Summary {
  total_tnd: number;
  total_commission: number;
  tx_count: number;
  avg_tnd: number;
}

const TX_TYPES = ['MARKETPLACE_SALE', 'EQUIPMENT_RENTAL', 'LAND_AUCTION', 'SUBSCRIPTION', 'TRANSPORT'];

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideBanknote, lucideDownload, lucideFilter, lucideLoader,
    lucideChevronLeft, lucideChevronRight, lucideTrendingUp,
    lucideTrendingDown, lucideCalendar, lucideDollarSign,
    lucideBarChart2, lucideActivity,
  })],
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.scss'],
})
export class AdminTransactionsComponent implements OnInit {
  private http = inject(HttpClient);

  transactions = signal<Transaction[]>([]);
  total = signal(0);
  summary = signal<Summary | null>(null);
  isLoading = signal(true);
  isExporting = signal(false);

  page = 1;
  limit = 20;
  typeFilter = '';
  fromDate = '';
  toDate = '';

  readonly txTypes = TX_TYPES;

  get totalPages() { return Math.ceil(this.total() / this.limit); }

  ngOnInit() { this.setPreset('month'); }

  buildParams(): URLSearchParams {
    const p = new URLSearchParams({ page: String(this.page), limit: String(this.limit) });
    if (this.typeFilter) p.set('type', this.typeFilter);
    if (this.fromDate) p.set('from', this.fromDate);
    if (this.toDate) p.set('to', this.toDate);
    return p;
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/transactions?${this.buildParams()}`).subscribe({
      next: (res) => {
        this.transactions.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.summary.set(res.summary ?? null);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  applyFilters() { this.page = 1; this.loadTransactions(); }
  prevPage() { if (this.page > 1) { this.page--; this.loadTransactions(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.loadTransactions(); } }

  setPreset(preset: 'today' | 'week' | 'month' | '30d') {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;

    switch (preset) {
      case 'today': from = to; break;
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().split('T')[0]; break; }
      case 'month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); from = d.toISOString().split('T')[0]; break; }
      case '30d': { const d = new Date(now); d.setDate(d.getDate() - 30); from = d.toISOString().split('T')[0]; break; }
      default: from = to;
    }

    this.fromDate = from;
    this.toDate = to;
    this.page = 1;
    this.loadTransactions();
  }

  exportCsv() {
    this.isExporting.set(true);
    const params = this.buildParams();
    params.set('format', 'csv');
    this.http.get(`${environment.apiUrl}/admin/transactions?${params}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting.set(false);
      },
      error: () => this.isExporting.set(false),
    });
  }

  getTypeBadge(type: string): string {
    const map: Record<string, string> = {
      MARKETPLACE_SALE: 'badge-green', EQUIPMENT_RENTAL: 'badge-blue',
      LAND_AUCTION: 'badge-amber', SUBSCRIPTION: 'badge-purple', TRANSPORT: 'badge-gray',
    };
    return map[type] ?? 'badge-gray';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      MARKETPLACE_SALE: 'Vente', EQUIPMENT_RENTAL: 'Location', LAND_AUCTION: 'Enchère',
      SUBSCRIPTION: 'Abonnement', TRANSPORT: 'Transport',
    };
    return map[type] ?? type;
  }

  formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-TN').format(Math.round(n));
  }
}
