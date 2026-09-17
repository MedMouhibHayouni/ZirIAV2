import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCircleDollarSign, lucidePackage, lucideAlertTriangle,
  lucideTrendingUp, lucideTrendingDown, lucideArrowUp, lucideArrowDown,
  lucideRefreshCcw
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgIconComponent, RouterLink],
  providers: [provideIcons({
    lucideCircleDollarSign, lucidePackage, lucideAlertTriangle,
    lucideTrendingUp, lucideTrendingDown, lucideArrowUp, lucideArrowDown,
    lucideRefreshCcw
  })],
  template: `
    <div class="dash-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Chargement de votre tableau de bord...</span>
        </div>
      } @else {
        <div class="kpi-grid">
          <!-- Net monthly income -->
          <div class="kpi-card" [class.positive]="monthlyNet() >= 0" [class.negative]="monthlyNet() < 0">
            <div class="kpi-head">
              <span class="kpi-label">Revenu Net du Mois</span>
              <span class="kpi-trend">
                <ng-icon [name]="monthlyNet() >= 0 ? 'lucideTrendingUp' : 'lucideTrendingDown'"></ng-icon>
                {{ monthlyNet() >= 0 ? 'Excédent' : 'Déficit' }}
              </span>
            </div>
            <div class="kpi-value">{{ formatNum(monthlyNet()) }} <span class="kpi-unit">TND</span></div>
            <div class="kpi-bar">
              <div class="kpi-bar-inner" [style.width.%]="85"></div>
            </div>
            <div class="kpi-detail">
              <span><ng-icon name="lucideArrowUp"></ng-icon> {{ formatNum(monthlyIncome()) }} TND</span>
              <span><ng-icon name="lucideArrowDown"></ng-icon> {{ formatNum(monthlyExpense()) }} TND</span>
            </div>
          </div>

          <!-- Stock value -->
          <div class="kpi-card">
            <div class="kpi-head">
              <span class="kpi-label">Valeur du Stock</span>
              <span class="kpi-trend neutral">Actif</span>
            </div>
            <div class="kpi-value">{{ formatNum(stockData()?.estimated_value_tnd || 0) }} <span class="kpi-unit">TND</span></div>
            <div class="kpi-bar">
              <div class="kpi-bar-inner" [style.width.%]="60"></div>
            </div>
            <div class="kpi-detail">
              <span>{{ stockData()?.total_stock_items || 0 }} références</span>
              <span>{{ stockData()?.stock_by_type?.length || 0 }} types</span>
            </div>
          </div>

          <!-- Alerts -->
          <div class="kpi-card alert-card" [class.has-alert]="(stockData()?.low_stock_count || 0) > 0">
            <div class="kpi-head">
              <span class="kpi-label">Alertes Stock</span>
              <span class="kpi-trend" [class.negative]="(stockData()?.low_stock_count || 0) > 0">
                {{ (stockData()?.low_stock_count || 0) > 0 ? 'Attention' : 'OK' }}
              </span>
            </div>
            <div class="kpi-value">
              <ng-icon name="lucideAlertTriangle"></ng-icon>
              {{ stockData()?.low_stock_count || 0 }}
              <span class="kpi-unit">alertes</span>
            </div>
            <div class="kpi-bar">
              <div class="kpi-bar-inner danger" [style.width.%]="Math.min((stockData()?.low_stock_count || 0) * 20, 100)"></div>
            </div>
            <div class="kpi-detail">
              <span>Entrées 7j: {{ formatNum(stockData()?.last_7d_in_tonnes || 0) }} t</span>
              <span>Sorties 7j: {{ formatNum(stockData()?.last_7d_out_tonnes || 0) }} t</span>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="quick-actions">
          <h3>Actions rapides</h3>
          <div class="action-grid">
            <a class="action-card" routerLink="stock">
              <ng-icon name="lucidePackage"></ng-icon>
              <span>Ajouter au stock</span>
            </a>
            <a class="action-card" routerLink="finance">
              <ng-icon name="lucideCircleDollarSign"></ng-icon>
              <span>Nouvelle transaction</span>
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .dash-page { padding: 24px; max-width: 900px; margin: 0 auto; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 80px 20px; color: var(--text-muted); gap: 12px;
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--zir-emerald);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 32px; }

    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.2s;
    }
    .kpi-card:hover { border-color: var(--zir-emerald-alpha-20); }
    .kpi-card.positive { border-left: 4px solid var(--zir-emerald); }
    .kpi-card.negative { border-left: 4px solid #ef4444; }
    .kpi-card.alert-card.has-alert { border-left: 4px solid #f59e0b; }

    .kpi-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }
    .kpi-label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .kpi-trend {
      font-size: 0.72rem; font-weight: 700; padding: 2px 8px;
      border-radius: 6px; display: flex; align-items: center; gap: 3px;
    }
    .kpi-trend ng-icon { width: 14px; height: 14px; }
    .kpi-card.positive .kpi-trend { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .kpi-card.negative .kpi-trend { background: rgba(239,68,68,0.1); color: #ef4444; }
    .kpi-trend.neutral { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .kpi-card.alert-card.has-alert .kpi-trend { background: rgba(245,158,11,0.1); color: #f59e0b; }

    .kpi-value {
      font-size: 1.8rem; font-weight: 800; color: var(--text-primary);
      display: flex; align-items: center; gap: 4px; margin-bottom: 12px;
    }
    .kpi-value ng-icon { width: 24px; height: 24px; color: #f59e0b; }
    .kpi-unit { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }

    .kpi-bar {
      height: 4px; background: var(--zir-emerald-alpha-10); border-radius: 4px;
      margin-bottom: 10px; overflow: hidden;
    }
    .kpi-bar-inner { height: 100%; background: var(--zir-emerald); border-radius: 4px; transition: width 0.5s; }
    .kpi-bar-inner.danger { background: #f59e0b; }

    .kpi-detail {
      display: flex; justify-content: space-between;
      font-size: 0.78rem; color: var(--text-muted);
    }
    .kpi-detail ng-icon { width: 14px; height: 14px; vertical-align: middle; }
    .kpi-card.positive .kpi-detail ng-icon { color: var(--zir-emerald); }
    .kpi-card.negative .kpi-detail ng-icon { color: #ef4444; }

    .quick-actions { margin-top: 8px; }
    .quick-actions h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .action-card {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; text-decoration: none; color: var(--text-primary);
      font-weight: 600; font-size: 0.9rem; transition: all 0.15s; cursor: pointer;
    }
    .action-card:hover { border-color: var(--zir-emerald); background: var(--zir-emerald-alpha-10); }
    .action-card ng-icon { width: 20px; height: 20px; color: var(--zir-emerald); }
  `]
})
export class FarmerErpDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  readonly loading = signal(true);
  readonly stockData = signal<any>(null);
  readonly financeSummaries = signal<any[]>([]);

  monthlyNet = computed(() => this.financeSummaries()[0]?.net ?? 0);
  monthlyIncome = computed(() => this.financeSummaries()[0]?.total_income ?? 0);
  monthlyExpense = computed(() => this.financeSummaries()[0]?.total_expenses ?? 0);
  readonly Math = Math;

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/inventory/stats`).subscribe({
      next: (s) => { this.stockData.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.http.get<any[]>(`${environment.apiUrl}/finance/records/summary`).subscribe({
      next: (s) => { this.financeSummaries.set(Array.isArray(s) ? s : []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private nf = new Intl.NumberFormat('fr-TN');
  formatNum(n: number): string { return this.nf.format(Math.round(n || 0)); }
}
