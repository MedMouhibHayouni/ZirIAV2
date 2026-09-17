import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCircleDollarSign, lucidePlus, lucideDownload,
  lucideTrendingUp, lucideTrendingDown, lucideCalendar,
  lucideCheckCircle, lucideX, lucideArrowUp, lucideArrowDown
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideCircleDollarSign, lucidePlus, lucideDownload,
    lucideTrendingUp, lucideTrendingDown, lucideCalendar,
    lucideCheckCircle, lucideX, lucideArrowUp, lucideArrowDown
  })],
  template: `
    <div class="finance-page">
      <!-- Header -->
      <div class="finance-header">
        <div class="period-tabs">
          <button class="period-tab" [class.active]="period() === 'week'" (click)="changePeriod('week')">Semaine</button>
          <button class="period-tab" [class.active]="period() === 'month'" (click)="changePeriod('month')">Mois</button>
          <button class="period-tab" [class.active]="period() === 'year'" (click)="changePeriod('year')">Année</button>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="exportPdf()"><ng-icon name="lucideDownload"></ng-icon> PDF</button>
          <button class="btn btn-primary" (click)="showModal = true"><ng-icon name="lucidePlus"></ng-icon> Ajouter</button>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="summary-row">
        <div class="summary-card income">
          <span class="sum-label">Revenus</span>
          <span class="sum-value">{{ formatNum(summaryIncome()) }} <small>TND</small></span>
          <span class="sum-icon"><ng-icon name="lucideArrowUp"></ng-icon></span>
        </div>
        <div class="summary-card expense">
          <span class="sum-label">Dépenses</span>
          <span class="sum-value">{{ formatNum(summaryExpense()) }} <small>TND</small></span>
          <span class="sum-icon"><ng-icon name="lucideArrowDown"></ng-icon></span>
        </div>
        <div class="summary-card net" [class.positive]="summaryNet() >= 0" [class.negative]="summaryNet() < 0">
          <span class="sum-label">Solde Net</span>
          <span class="sum-value">{{ formatNum(summaryNet()) }} <small>TND</small></span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-wrap">
        <canvas #chartCanvas></canvas>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else {
        <!-- Transaction list -->
        <div class="tx-list">
          <h3>Transactions</h3>
          @if (records().length === 0) {
            <div class="empty-tx">Aucune transaction pour cette période</div>
          }
          @for (r of records(); track r.id) {
            <div class="tx-row" [class.income]="r.record_type === 'INCOME'" [class.expense]="r.record_type === 'EXPENSE'">
              <div class="tx-dot"></div>
              <div class="tx-info">
                <span class="tx-cat">{{ getCatLabel(r.category) }}</span>
                <span class="tx-desc">{{ r.description || '—' }}</span>
              </div>
              <div class="tx-amount">
                <span>{{ r.record_type === 'INCOME' ? '+' : '-' }}{{ formatNum(r.amount_tnd) }}</span>
                <small>TND</small>
              </div>
              <span class="tx-date">{{ formatDate(r.recorded_at) }}</span>
            </div>
          }
        </div>
      }
    </div>

    <!-- Add transaction modal -->
    @if (showModal) {
      <div class="modal-backdrop" (click)="showModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showModal = false"><ng-icon name="lucideX"></ng-icon></button>
          <h3>Nouvelle transaction</h3>
          <div class="modal-body">
            <div class="type-toggle">
              <button [class.active]="form.record_type === 'INCOME'" (click)="form.record_type = 'INCOME'" class="type-btn income">Revenu</button>
              <button [class.active]="form.record_type === 'EXPENSE'" (click)="form.record_type = 'EXPENSE'" class="type-btn expense">Dépense</button>
            </div>
            <label>Catégorie</label>
            <select [(ngModel)]="form.category" class="form-select">
              @for (c of form.record_type === 'INCOME' ? INCOME_CATS : EXPENSE_CATS; track c.value) {
                <option [value]="c.value">{{ c.label }}</option>
              }
            </select>
            <label>Montant (TND)</label>
            <input type="number" [(ngModel)]="form.amount_tnd" class="form-input" min="0" step="1" />
            <label>Description</label>
            <input type="text" [(ngModel)]="form.description" class="form-input" placeholder="Optionnelle" />
            <button class="btn btn-primary" (click)="submitTx()" [disabled]="!form.amount_tnd || form.amount_tnd <= 0 || submitting()">
              {{ submitting() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .finance-page { padding: 20px; max-width: 900px; margin: 0 auto; }

    .finance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .period-tabs { display: flex; gap: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 3px; }
    .period-tab {
      padding: 7px 16px; border: none; border-radius: 8px;
      background: transparent; color: var(--text-muted); font-weight: 600;
      font-size: 0.8rem; cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .period-tab.active { background: var(--zir-emerald); color: white; }

    .header-actions { display: flex; gap: 8px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border: none; border-radius: 10px;
      font-weight: 700; font-size: 0.82rem; cursor: pointer;
      transition: all 0.15s; font-family: inherit; white-space: nowrap;
    }
    .btn-primary { background: var(--zir-emerald); color: white; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border); color: var(--text-secondary); }
    .btn-outline:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .btn ng-icon { width: 16px; height: 16px; }

    .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 16px; position: relative; overflow: hidden;
    }
    .summary-card.income { border-left: 4px solid var(--zir-emerald); }
    .summary-card.expense { border-left: 4px solid #ef4444; }
    .summary-card.net.positive { border-left: 4px solid var(--zir-emerald); }
    .summary-card.net.negative { border-left: 4px solid #ef4444; }
    .sum-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .sum-value { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); }
    .sum-value small { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); }
    .summary-card.income .sum-value { color: var(--zir-emerald); }
    .summary-card.expense .sum-value { color: #ef4444; }
    .summary-card.net.positive .sum-value { color: var(--zir-emerald); }
    .summary-card.net.negative .sum-value { color: #ef4444; }
    .sum-icon { position: absolute; right: 12px; top: 12px; }
    .sum-icon ng-icon { width: 24px; height: 24px; }
    .summary-card.income .sum-icon ng-icon { color: var(--zir-emerald); }
    .summary-card.expense .sum-icon ng-icon { color: #ef4444; }

    .chart-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 24px; height: 220px; }

    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .tx-list h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
    .empty-tx { text-align: center; padding: 32px; color: var(--text-muted); font-size: 0.85rem; }
    .tx-list { display: flex; flex-direction: column; gap: 6px; }
    .tx-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: 10px; font-size: 0.82rem;
    }
    .tx-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .tx-row.income .tx-dot { background: var(--zir-emerald); }
    .tx-row.expense .tx-dot { background: #ef4444; }
    .tx-info { flex: 1; min-width: 0; }
    .tx-cat { display: block; font-weight: 700; color: var(--text-primary); }
    .tx-desc { display: block; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-amount { font-weight: 800; font-size: 0.95rem; white-space: nowrap; text-align: right; }
    .tx-row.income .tx-amount { color: var(--zir-emerald); }
    .tx-row.expense .tx-amount { color: #ef4444; }
    .tx-amount small { font-size: 0.65rem; font-weight: 600; color: var(--text-muted); }
    .tx-date { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .modal {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 24px; width: 380px; max-width: 90vw; position: relative;
    }
    .modal-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
    .modal-close ng-icon { width: 20px; height: 20px; }
    .modal h3 { margin: 0 0 16px; font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .modal-body { display: flex; flex-direction: column; gap: 10px; }
    .modal-body label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .type-toggle { display: flex; gap: 4px; background: var(--bg-primary); border-radius: 10px; padding: 3px; }
    .type-btn {
      flex: 1; padding: 8px; border: none; border-radius: 8px;
      font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s;
      font-family: inherit;
    }
    .type-btn.income { background: transparent; color: var(--text-muted); }
    .type-btn.income.active { background: var(--zir-emerald); color: white; }
    .type-btn.expense { background: transparent; color: var(--text-muted); }
    .type-btn.expense.active { background: #ef4444; color: white; }
    .form-select, .form-input {
      padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--bg-primary); color: var(--text-primary);
      font-size: 0.88rem; font-family: inherit; outline: none;
    }
    .form-select:focus, .form-input:focus { border-color: var(--zir-emerald); }
  `]
})
export class FarmerErpFinanceComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  readonly loading = signal(true);
  readonly records = signal<any[]>([]);
  readonly period = signal('month');
  readonly submitting = signal(false);
  showModal = false;

  form = { record_type: 'INCOME' as 'INCOME' | 'EXPENSE', category: 'SALE', amount_tnd: 0, description: '' };
  readonly INCOME_CATS = [
    { value: 'SALE', label: 'Vente de produits' },
    { value: 'LAND_REVENUE', label: 'Location terrain' },
    { value: 'OTHER', label: 'Autre revenu' },
  ];
  readonly EXPENSE_CATS = [
    { value: 'LABOR_COST', label: 'Main d\'oeuvre' },
    { value: 'EQUIPMENT_RENTAL', label: 'Location équipement' },
    { value: 'TRANSPORT_FEE', label: 'Transport' },
    { value: 'OTHER', label: 'Autre dépense' },
  ];

  summaryIncome = computed(() => this.records().filter(r => r.record_type === 'INCOME').reduce((s, r) => s + Number(r.amount_tnd), 0));
  summaryExpense = computed(() => this.records().filter(r => r.record_type === 'EXPENSE').reduce((s, r) => s + Number(r.amount_tnd), 0));
  summaryNet = computed(() => this.summaryIncome() - this.summaryExpense());

  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.chart?.destroy(); }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/finance/records/me?period=${this.period()}&page=1&limit=50`).subscribe({
      next: (res) => {
        this.records.set(Array.isArray(res) ? res : (res.items || []));
        this.loading.set(false);
        setTimeout(() => this.initChart(), 200);
      },
      error: () => this.loading.set(false)
    });
  }

  changePeriod(p: string) {
    this.period.set(p);
    this.chart?.destroy();
    this.chart = null;
    this.load();
  }

  private initChart() {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;
    this.chart?.destroy();
    const records = this.records();
    const map = new Map<string, { i: number; e: number }>();
    records.forEach((r: any) => {
      const d = new Date(r.recorded_at);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (!map.has(key)) map.set(key, { i: 0, e: 0 });
      const e = map.get(key)!;
      if (r.record_type === 'INCOME') e.i += Number(r.amount_tnd);
      else e.e += Number(r.amount_tnd);
    });
    const labels = Array.from(map.keys()).slice(-14);
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Revenus', data: labels.map(k => map.get(k)?.i ?? 0), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
          { label: 'Dépenses', data: labels.map(k => map.get(k)?.e ?? 0), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter', size: 12 } } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
        }
      }
    });
  }

  submitTx() {
    if (!this.form.amount_tnd || this.form.amount_tnd <= 0) return;
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/finance/records`, {
      record_type: this.form.record_type,
      category: this.form.category,
      amount_tnd: Number(this.form.amount_tnd),
      description: this.form.description,
    }).subscribe({
      next: () => {
        this.toast.success('Finances', 'Transaction enregistrée');
        this.showModal = false;
        this.submitting.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Erreur lors de l\'enregistrement');
        this.submitting.set(false);
      }
    });
  }

  exportPdf() {
    this.http.get(`${environment.apiUrl}/finance/export`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZirIA_Relevé_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('PDF', 'Relevé téléchargé');
      },
      error: () => this.toast.error('Erreur', 'Erreur lors de l\'export PDF')
    });
  }

  getCatLabel(cat: string): string {
    const m: Record<string, string> = {
      SALE: 'Vente', COMMISSION: 'Commission', TRANSPORT_FEE: 'Transport',
      LABOR_COST: 'Main d\'œuvre', EQUIPMENT_RENTAL: 'Équipement',
      LAND_REVENUE: 'Location terrain', OTHER: 'Autre'
    };
    return m[cat] || cat;
  }

  private nf = new Intl.NumberFormat('fr-TN');
  private df = new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' });
  formatNum(n: number): string { return this.nf.format(Math.round(n || 0)); }
  formatDate(d: string): string { return d ? this.df.format(new Date(d)) : '—'; }
}
