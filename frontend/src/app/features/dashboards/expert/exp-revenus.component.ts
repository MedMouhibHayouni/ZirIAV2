import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTrendingUp, lucideDollarSign, lucideCalendar,
  lucidePercent, lucideDownload, lucideBarChart2, lucideArrowUpRight, lucideArrowDownRight,
  lucideStar, lucideEdit3, lucideCheck, lucideX, lucideChevronLeft, lucideChevronRight,
  lucideLoader, lucideCreditCard, lucideWallet, lucideReceipt, lucideShoppingCart
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { ToastService } from './shared/toast.service';

interface EarningsBreakdown {
  period: string;
  gross_amount_tnd: number;
  net_to_expert_tnd: number;
  platform_commission_tnd: number;
  consultation_count: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exp-revenus',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, SkeletonLoaderComponent],
  providers: [provideIcons({
    lucideTrendingUp, lucideDollarSign, lucideCalendar,
    lucidePercent, lucideDownload, lucideBarChart2, lucideArrowUpRight, lucideArrowDownRight,
    lucideStar, lucideEdit3, lucideCheck, lucideX, lucideChevronLeft, lucideChevronRight,
    lucideLoader, lucideCreditCard, lucideWallet, lucideReceipt, lucideShoppingCart
  })],
  template: `
    <div class="revenus-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mes Revenus</h1>
          <p class="page-sub">Tableau de bord financier — Consultations</p>
        </div>
      </div>

      <!-- KPI Cards (4 correct ones) -->
      @if (loading()) {
        <div class="kpi-grid">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton-loader width="100%" height="100px" borderRadius="16px"></app-skeleton-loader>
          }
        </div>
      } @else {
        <div class="kpi-grid">
          <div class="kpi-card accent">
            <div class="kpi-icon-wrap">
              <ng-icon name="lucideWallet" class="kpi-icon"></ng-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-val">{{ summary()?.net_to_expert_tnd | number:'1.2-2' }} TND</span>
              <span class="kpi-label">Gains nets total</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-wrap secondary">
              <ng-icon name="lucideCreditCard" class="kpi-icon"></ng-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-val">{{ summary()?.gross_amount_tnd | number:'1.2-2' }} TND</span>
              <span class="kpi-label">Facturation brute</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-wrap warn">
              <ng-icon name="lucideReceipt" class="kpi-icon"></ng-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-val">{{ summary()?.platform_commission_tnd | number:'1.2-2' }} TND</span>
              <span class="kpi-label">Commission plateforme</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon-wrap neutral">
              <ng-icon name="lucideCalendar" class="kpi-icon"></ng-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-val">{{ summary()?.consultation_count || 0 }}</span>
              <span class="kpi-label">Consultations terminées</span>
            </div>
          </div>
        </div>
      }

      <!-- Tarif Section -->
      @if (!loading()) {
        <div class="tarif-card">
          <div class="tarif-header">
            <h3 class="tarif-title">
              <ng-icon name="lucideDollarSign"></ng-icon>
              Mon Tarif de Consultation
            </h3>
            @if (!editingTarif()) {
              <button class="btn-edit-tarif" (click)="startEditTarif()">
                <ng-icon name="lucideEdit3"></ng-icon>
                Modifier
              </button>
            }
          </div>
          <div class="tarif-body">
            @if (editingTarif()) {
              <div class="tarif-edit-row">
                <input type="number" class="tarif-input" [(ngModel)]="tarifValue" min="0" step="0.5" />
                <span class="tarif-currency">TND</span>
                <button class="btn-save-tarif" (click)="saveTarif()" [disabled]="savingTarif()">
                  @if (savingTarif()) {
                    <ng-icon name="lucideLoader" class="spinning"></ng-icon>
                  } @else {
                    <ng-icon name="lucideCheck"></ng-icon>
                  }
                  Enregistrer
                </button>
                <button class="btn-cancel-tarif" (click)="editingTarif.set(false)">
                  <ng-icon name="lucideX"></ng-icon>
                </button>
              </div>
            } @else {
              <div class="tarif-display">
                <span class="tarif-value">{{ summary()?.consultation_rate_tnd || 0 }} TND</span>
                <span class="tarif-note">par consultation</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Star Rating Display -->
      @if (!loading() && summary()?.rating) {
        <div class="rating-card">
          <div class="rating-label">Note moyenne</div>
          <div class="rating-stars">
            @for (star of [1,2,3,4,5]; track star) {
              <ng-icon name="lucideStar" class="star" [class.filled]="star <= (summary()?.rating || 0)"></ng-icon>
            }
          </div>
          <span class="rating-value">{{ summary()?.rating | number:'1.1-1' }}/5</span>
        </div>
      }

      <!-- Earnings table by month with pagination -->
      @if (!loading()) {
        <div class="card mt-24">
          <div class="card-header">
            <h2 class="card-title">
              <ng-icon name="lucideTrendingUp" class="title-icon"></ng-icon>
              Historique mensuel
            </h2>
          </div>

          @if (breakdown().length === 0) {
            <div class="empty-state">
              <p>Aucune consultation facturée pour le moment</p>
            </div>
          } @else {
            <table class="earnings-table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Consultations</th>
                  <th>Brut</th>
                  <th>Commission</th>
                  <th>Net</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                @for (row of paginatedBreakdown(); track row.period) {
                  <tr>
                    <td class="period-cell">{{ row.period }}</td>
                    <td><span class="count-pill">{{ row.consultation_count }}</span></td>
                    <td class="amount">{{ row.gross_amount_tnd | number:'1.2-2' }} TND</td>
                    <td class="comm">−{{ row.platform_commission_tnd | number:'1.2-2' }} TND</td>
                    <td class="net"><strong>{{ row.net_to_expert_tnd | number:'1.2-2' }} TND</strong></td>
                    <td class="trend">
                      @if (getTrend(row) === 'up') {
                        <span class="trend-up"><ng-icon name="lucideArrowUpRight"></ng-icon></span>
                      } @else if (getTrend(row) === 'down') {
                        <span class="trend-down"><ng-icon name="lucideArrowDownRight"></ng-icon></span>
                      } @else {
                        <span class="trend-neutral">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="total-label">Total</td>
                  <td class="net total-val">{{ totalNet() | number:'1.2-2' }} TND</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="page-btn" (click)="prevPage()" [disabled]="currentPage() === 1">
                  <ng-icon name="lucideChevronLeft"></ng-icon>
                </button>
                <span class="page-info">Page {{ currentPage() }} / {{ totalPages() }}</span>
                <button class="page-btn" (click)="nextPage()" [disabled]="currentPage() === totalPages()">
                  <ng-icon name="lucideChevronRight"></ng-icon>
                </button>
              </div>
            }
          }
        </div>
      }

      <!-- Recent transactions -->
      @if (!loading() && recentConsultations().length > 0) {
        <div class="card mt-16">
          <div class="card-header">
            <h2 class="card-title">
              <ng-icon name="lucideCalendar" class="title-icon"></ng-icon>
              Transactions récentes
            </h2>
          </div>
          <div class="trans-list">
            @for (c of recentConsultations(); track c.id) {
              <div class="trans-row">
                <div class="trans-left">
                  <div class="trans-dot"></div>
                  <div>
                    <span class="trans-farmer">{{ c.farmer_name }}</span>
                    <span class="trans-type">{{ c.consultation_type || 'Consultation' }} · {{ c.created_at | date:'dd/MM/yy' }}</span>
                  </div>
                </div>
                <span class="trans-amount">+{{ c.net_to_expert_tnd | number:'1.2-2' }} TND</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Commission Prescriptions (Phase 5) -->
      @if (!loading() && prescriptionPurchases().length > 0) {
        <div class="card mt-16">
          <div class="card-header">
            <h2 class="card-title">
              <ng-icon name="lucideShoppingCart" class="title-icon comm-icon"></ng-icon>
              Commissions Prescriptions
            </h2>
          </div>
          <div class="trans-list">
            @for (p of prescriptionPurchases(); track p.id) {
              <div class="trans-row">
                <div class="trans-left">
                  <div class="trans-dot comm-dot"></div>
                  <div>
                    <span class="trans-farmer">{{ p.product_name || p.order_product || 'Produit' }}</span>
                    <span class="trans-type">{{ p.farmer_name || 'Agriculteur' }} · {{ p.created_at | date:'dd/MM/yy' }}</span>
                  </div>
                </div>
                <div class="trans-comm-info">
                  <span class="comm-pct">{{ p.commission_percentage }}%</span>
                  <span class="comm-amount">+{{ p.commission_amount | number:'1.2-2' }} TND</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .revenus-page { padding: 24px; max-width: 1100px; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .page-sub { color: var(--text-secondary); font-size: 0.9rem; }
    .mt-24 { margin-top: 24px; }
    .mt-16 { margin-top: 16px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-card.accent { border-color: var(--zir-emerald-alpha-20); background: var(--zir-emerald-alpha-10); }
    .kpi-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--zir-emerald); }
    .kpi-icon-wrap.secondary { background: var(--info); }
    .kpi-icon-wrap.warn { background: var(--warning); }
    .kpi-icon-wrap.neutral { background: var(--text-secondary); }
    .kpi-icon { font-size: 1.3rem; color: white; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-val { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    .kpi-label { color: var(--text-secondary); font-size: 0.78rem; margin-top: 2px; }

    /* Tarif Card */
    .tarif-card {
      margin-top: 16px; background: var(--bg-card);
      border: 1px solid var(--border-color); border-radius: 16px;
      overflow: hidden;
    }
    .tarif-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid var(--border-color);
    }
    .tarif-title {
      display: flex; align-items: center; gap: 8px;
      margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary);
    }
    .btn-edit-tarif {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 8px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-secondary); font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-edit-tarif:hover { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border-color: var(--zir-emerald-alpha-20); }
    .tarif-body { padding: 16px 20px; }
    .tarif-display { display: flex; align-items: baseline; gap: 8px; }
    .tarif-value { font-size: 1.5rem; font-weight: 800; color: var(--zir-emerald); }
    .tarif-note { color: var(--text-secondary); font-size: 0.85rem; }

    .tarif-edit-row {
      display: flex; align-items: center; gap: 10px;
    }
    .tarif-input {
      width: 120px; padding: 10px 14px; border-radius: 10px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      color: var(--text-primary); font-size: 1.1rem; font-weight: 700;
      outline: none;
    }
    .tarif-input:focus { border-color: var(--zir-emerald); }
    .tarif-currency { font-weight: 700; color: var(--text-secondary); }
    .btn-save-tarif {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px;
      background: var(--zir-emerald); color: white;
      border: none; font-weight: 700; font-size: 0.85rem;
      cursor: pointer; transition: opacity 0.2s;
    }
    .btn-save-tarif:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel-tarif {
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; padding: 4px;
    }
    .btn-cancel-tarif:hover { color: var(--danger); }

    /* Star Rating */
    .rating-card {
      margin-top: 16px; padding: 16px 20px;
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 16px; display: flex; align-items: center; gap: 12px;
    }
    .rating-label { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .rating-stars { display: flex; gap: 4px; }
    .star { font-size: 1.2rem; color: var(--border-color); }
    .star.filled { color: var(--warning); fill: var(--warning); }
    .rating-value { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }

    /* Table */
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
    .card-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
    .card-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--text-primary); font-size: 1rem; margin: 0; }
    .title-icon { font-size: 1rem; color: var(--zir-emerald); }

    .earnings-table { width: 100%; border-collapse: collapse; }
    .earnings-table th { background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 20px; text-align: left; font-weight: 700; }
    .earnings-table td { padding: 14px 20px; border-bottom: 1px solid var(--border-color); font-size: 0.88rem; color: var(--text-secondary); }
    .earnings-table tfoot td { border-top: 2px solid var(--border-color); border-bottom: none; font-size: 0.9rem; }
    .period-cell { font-weight: 700; color: var(--text-primary); }
    .count-pill { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
    .amount { color: var(--text-primary); }
    .comm { color: var(--danger); }
    .net { color: var(--zir-emerald); }
    .total-label { text-align: right; font-weight: 700; color: var(--text-secondary); padding-right: 8px; }
    .total-val { font-size: 1.1rem !important; }
    .trend { text-align: center; }
    .trend-up { color: var(--zir-emerald); font-size: 1rem; }
    .trend-down { color: var(--danger); font-size: 1rem; }
    .trend-neutral { color: var(--text-secondary); font-size: 0.9rem; }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      padding: 16px; border-top: 1px solid var(--border-color);
    }
    .page-btn {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-primary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border-color: var(--zir-emerald-alpha-20); }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; }

    /* Transactions */
    .trans-list { padding: 8px 24px 16px; }
    .trans-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
    .trans-row:last-child { border-bottom: none; }
    .trans-left { display: flex; align-items: center; gap: 14px; }
    .trans-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--zir-emerald); flex-shrink: 0; }
    .trans-farmer { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; display: block; }
    .trans-type { color: var(--text-secondary); font-size: 0.78rem; }
    .trans-amount { font-weight: 800; color: var(--zir-emerald); font-size: 0.95rem; }

    .empty-state { padding: 40px; text-align: center; color: var(--text-secondary); font-size: 0.9rem; }

    .comm-icon { color: var(--zir-gold, #D4AF37); }
    .comm-dot { background: var(--zir-gold, #D4AF37); }

    .trans-comm-info { display: flex; align-items: center; gap: 8px; }

    .comm-pct {
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(212, 175, 55, 0.1);
      color: var(--zir-gold, #D4AF37);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .comm-amount {
      font-weight: 800;
      color: var(--zir-gold, #D4AF37);
      font-size: 0.95rem;
    }

    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ExpRevenusComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(true);
  readonly rawData = signal<any>(null);
  readonly editingTarif = signal(false);
  readonly savingTarif = signal(false);
  tarifValue = 0;

  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly summary = computed<any>(() => {
    const d = this.rawData();
    if (!d) return null;
    return {
      net_to_expert_tnd: d.net_to_expert_tnd ?? 0,
      gross_amount_tnd: d.gross_amount_tnd ?? 0,
      platform_commission_tnd: d.platform_commission_tnd ?? 0,
      consultation_count: d.consultation_count ?? 0,
      consultation_rate_tnd: d.consultation_rate_tnd ?? 0,
      rating: d.rating ?? 0,
    };
  });

  readonly breakdown = computed<EarningsBreakdown[]>(() => {
    return this.rawData()?.monthly_breakdown ?? [];
  });

  readonly totalPages = computed(() => Math.ceil(this.breakdown().length / this.pageSize));

  readonly paginatedBreakdown = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.breakdown().slice(start, start + this.pageSize);
  });

  readonly recentConsultations = computed<any[]>(() => {
    return this.rawData()?.recent_consultations ?? [];
  });

  readonly prescriptionPurchases = signal<any[]>([]);

  readonly totalNet = computed(() =>
    this.breakdown().reduce((s, r) => s + Number(r.net_to_expert_tnd), 0)
  );

  ngOnInit() {
    this.api.getEarningsDashboard().subscribe({
      next: (data) => {
        this.rawData.set(data);
        this.tarifValue = data?.consultation_rate_tnd || 0;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });

    this.api.getPrescriptionPurchases().subscribe({
      next: (data) => { this.prescriptionPurchases.set(data || []); this.cdr.markForCheck(); },
      error: () => { this.prescriptionPurchases.set([]); }
    });
  }

  getTrend(row: EarningsBreakdown): 'up' | 'down' | 'neutral' {
    const idx = this.breakdown().indexOf(row);
    if (idx === this.breakdown().length - 1) return 'neutral';
    return row.net_to_expert_tnd >= this.breakdown()[idx + 1].net_to_expert_tnd ? 'up' : 'down';
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  startEditTarif() {
    this.tarifValue = this.summary()?.consultation_rate_tnd || 0;
    this.editingTarif.set(true);
  }

  saveTarif() {
    this.savingTarif.set(true);
    this.api.updateProfile({ consultation_rate_tnd: this.tarifValue }).subscribe({
      next: () => {
        this.editingTarif.set(false);
        this.savingTarif.set(false);
        this.rawData.update(d => ({ ...d, consultation_rate_tnd: this.tarifValue }));
        this.toast.success('Tarif mis à jour');
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingTarif.set(false);
        this.toast.error('Erreur lors de la mise à jour');
        this.cdr.markForCheck();
      }
    });
  }
}
