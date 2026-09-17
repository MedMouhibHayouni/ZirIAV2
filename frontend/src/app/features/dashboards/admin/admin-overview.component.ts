import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideActivity, lucideUsers, lucideShieldCheck, lucideBanknote,
  lucideShoppingBag, lucideLoader, lucideCheckCircle, lucideXCircle,
  lucideAlertTriangle, lucideTrendingUp, lucideTrendingDown, lucideDatabase,
  lucideZap, lucideCrown, lucideServer, lucideWifi, lucideUserCheck,
  lucideUserPlus, lucideDollarSign, lucideBarChart2, lucidePackage,
  lucideArrowUpRight, lucideArrowDownRight,
} from '@ng-icons/lucide';

interface AdminKpi {
  active_users_by_role: Record<string, number>;
  transactions_today: number;
  commission_today_tnd: number;
  active_listings: number;
  new_users_this_week: number;
  pending_validations: number;
  disease_detections_this_week: number;
  active_subscriptions_by_plan: Record<string, number>;
  active_subscription_revenue_tnd: number;
}

interface UnverifiedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  governorate: string;
  created_at: string;
  verifying?: boolean;
}

interface SystemHealth {
  db_status: string;
  websocket_connections: number;
  pending_commissions: number;
  uptime_seconds: number;
  node_env: string;
  total_users: number;
  memory_usage_mb: number;
}

interface BtsReport {
  monthly_revenue: { month: string; commission_tnd: number; transaction_count: number }[];
  growth_rate_pct: number;
  subscription_revenue_tnd: number;
}

const ROLE_LABELS: Record<string, string> = {
  FARMER: 'Agriculteur', B2B_BUYER: 'B2B', SUPPLIER: 'Fournisseur',
  DRIVER: 'Chauffeur', WORKER: 'Ouvrier', EXPERT: 'Expert',
  LAND_OWNER: 'Propriétaire', EQUIP_OWNER: 'Équipement', ADMIN: 'Admin',
  FARMER_AMBASSADOR: 'Ambassadeur', COOP_PRESIDENT: 'SMSA',
};

const ROLE_EMOJIS: Record<string, string> = {
  FARMER: '🌾', B2B_BUYER: '🏭', SUPPLIER: '📦', DRIVER: '🚚', WORKER: '👷',
  EXPERT: '🔬', LAND_OWNER: '🗺️', EQUIP_OWNER: '🚜', ADMIN: '👑',
  FARMER_AMBASSADOR: '🌍', COOP_PRESIDENT: '🏢',
};

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({
    lucideActivity, lucideUsers, lucideShieldCheck, lucideBanknote,
    lucideShoppingBag, lucideLoader, lucideCheckCircle, lucideXCircle,
    lucideAlertTriangle, lucideTrendingUp, lucideTrendingDown, lucideDatabase,
    lucideZap, lucideCrown, lucideServer, lucideWifi, lucideUserCheck,
    lucideUserPlus, lucideDollarSign, lucideBarChart2, lucidePackage,
    lucideArrowUpRight, lucideArrowDownRight,
  })],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.scss'],
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private pollInterval: any;

  kpis = signal<AdminKpi | null>(null);
  health = signal<SystemHealth | null>(null);
  btsReport = signal<BtsReport | null>(null);
  unverifiedUsers = signal<UnverifiedUser[]>([]);
  isLoading = signal(true);
  lastUpdated = signal(new Date());

  get roleEntries() {
    const r = this.kpis()?.active_users_by_role ?? {};
    return Object.entries(r)
      .map(([role, count]) => ({ role, count, label: ROLE_LABELS[role] ?? role, emoji: ROLE_EMOJIS[role] ?? '👤' }))
      .sort((a, b) => (b.count as number) - (a.count as number));
  }

  get totalUsers() {
    return this.roleEntries.reduce((a, e) => a + (e.count as number), 0);
  }

  get planEntries() {
    const p = this.kpis()?.active_subscriptions_by_plan ?? {};
    return Object.entries(p).map(([plan, count]) => ({ plan, count }));
  }

  get totalSubs() {
    return this.planEntries.reduce((a, e) => a + (e.count as number), 0);
  }

  getPlanPercent(count: number): number {
    return this.totalSubs > 0 ? Math.round((count / this.totalSubs) * 100) : 0;
  }

  get maxBarValue() {
    return Math.max(...this.roleEntries.map(e => e.count as number), 1);
  }

  get revenueMonths() {
    const months = this.btsReport()?.monthly_revenue ?? [];
    const maxVal = Math.max(...months.map(m => m.commission_tnd), 1);
    return months.map(m => ({
      ...m,
      pct: Math.round((m.commission_tnd / maxVal) * 100),
      label: m.month.substring(5), // MM only
    }));
  }

  ngOnInit() {
    this.loadAll();
    this.pollInterval = setInterval(() => this.loadAll(), 30000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadAll() {
    this.http.get<AdminKpi>(`${environment.apiUrl}/admin/kpis`).subscribe({
      next: (data) => { this.kpis.set(data); this.isLoading.set(false); this.lastUpdated.set(new Date()); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); },
    });
    this.http.get<any>(`${environment.apiUrl}/admin/users?verified=false&limit=8`).subscribe({
      next: (res) => { this.unverifiedUsers.set(res.items ?? []); this.cdr.markForCheck(); },
    });
    this.http.get<SystemHealth>(`${environment.apiUrl}/admin/system-health`).subscribe({
      next: (h) => { this.health.set(h); this.cdr.markForCheck(); },
    });
    this.http.get<BtsReport>(`${environment.apiUrl}/admin/reports/bts`).subscribe({
      next: (r) => { this.btsReport.set(r); this.cdr.markForCheck(); },
    });
  }

  verifyUser(user: UnverifiedUser) {
    user.verifying = true;
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/verify`, { approved: true }).subscribe({
      next: () => this.unverifiedUsers.update(users => users.filter(u => u.id !== user.id)),
      error: () => { user.verifying = false; },
    });
  }

  rejectUser(user: UnverifiedUser) {
    user.verifying = true;
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/verify`, { approved: false }).subscribe({
      next: () => this.unverifiedUsers.update(users => users.filter(u => u.id !== user.id)),
      error: () => { user.verifying = false; },
    });
  }

  formatUptime(s: number): string {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return `${d}j ${h}h ${m}m`;
  }

  formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-TN').format(Math.round(n));
  }

  getRoleLabel(role: string): string { return ROLE_LABELS[role] ?? role; }
  getRoleEmoji(role: string): string { return ROLE_EMOJIS[role] ?? '👤'; }

  getPlanLabel(plan: string): string {
    const m: Record<string, string> = { FREE: 'Gratuit', STARTER: 'Starter', PRO: 'Pro', BUSINESS: 'Business' };
    return m[plan] ?? plan;
  }

  getPlanColor(plan: string): string {
    const m: Record<string, string> = { FREE: '#64748b', STARTER: '#f59e0b', PRO: '#10b981', BUSINESS: '#8b5cf6' };
    return m[plan] ?? '#64748b';
  }
}
