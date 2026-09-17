import {
  Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideDatabase, lucideWifi, lucideActivity, lucideLoader, lucideSearch,
  lucideCheckCircle, lucideAlertTriangle, lucideFileText, lucideXCircle, lucideUsers, lucideBarChart2,
} from '@ng-icons/lucide';

interface SystemHealth {
  db_status: string;
  websocket_connections: number;
  pending_commissions: number;
  uptime_seconds: number;
  node_env: string;
}

interface BtsReport {
  period: string;
  monthly_revenue: { month: string; commission_tnd: number; transaction_count: number }[];
  total_active_users: number;
  total_transactions: number;
  subscription_revenue_tnd: number;
  growth_rate_pct: number;
}

@Component({
  selector: 'app-admin-system',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideDatabase, lucideWifi, lucideActivity, lucideLoader, lucideSearch,
    lucideCheckCircle, lucideAlertTriangle, lucideFileText, lucideXCircle, lucideUsers, lucideBarChart2,
  })],
  templateUrl: './admin-system.component.html',
  styleUrls: ['./admin-system.component.scss'],
})
export class AdminSystemComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private pollInterval: any;

  health = signal<SystemHealth | null>(null);
  btsReport = signal<BtsReport | null>(null);
  showBtsModal = false;
  isLoadingBts = signal(false);

  searchQuery = '';
  searchResults = signal<any[]>([]);
  isSearching = signal(false);

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${mins}m`;
  }

  ngOnInit() {
    this.loadHealth();
    this.pollInterval = setInterval(() => { if (!document.hidden) this.loadHealth(); }, 30000);
  }

  ngOnDestroy() { if (this.pollInterval) clearInterval(this.pollInterval); }

  loadHealth() {
    this.http.get<SystemHealth>(`${environment.apiUrl}/admin/system-health`).subscribe({
      next: (data) => this.health.set(data),
      error: () => {},
    });
  }

  openBtsReport() {
    this.showBtsModal = true;
    this.isLoadingBts.set(true);
    this.http.get<BtsReport>(`${environment.apiUrl}/admin/reports/bts`).subscribe({
      next: (data) => { this.btsReport.set(data); this.isLoadingBts.set(false); },
      error: () => this.isLoadingBts.set(false),
    });
  }

  searchUsers() {
    if (!this.searchQuery.trim()) { this.searchResults.set([]); return; }
    this.isSearching.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/users?search=${encodeURIComponent(this.searchQuery)}&limit=5`).subscribe({
      next: (res) => { this.searchResults.set(res.items ?? []); this.isSearching.set(false); },
      error: () => this.isSearching.set(false),
    });
  }

  suspendUser(userId: string) {
    if (!confirm('Confirmer la suspension de cet utilisateur ?')) return;
    this.http.post(`${environment.apiUrl}/admin/users/${userId}/suspend`, {}).subscribe({
      next: () => this.searchResults.update(users => users.filter(u => u.id !== userId)),
      error: () => alert('Erreur lors de la suspension.'),
    });
  }
}
