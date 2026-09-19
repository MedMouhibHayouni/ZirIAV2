import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard, lucideBriefcase, lucideUsers, lucideShield,
  lucideMap, lucideSprout, lucideShieldAlert, lucideClipboardList,
  lucidePackage, lucideDroplets, lucideRadio, lucideMessageSquare,
  lucideBarChart2, lucideSettings, lucideGlobe, lucideMapPin,
  lucideArrowUpRight, lucideArrowDownRight, lucideSearch, lucideLock,
  lucideFolder, lucideChevronRight
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface DossierKpi {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
  approved: number;
  rejectionRate: number;
}

@Component({
  selector: 'app-crda-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideLayoutDashboard, lucideBriefcase, lucideUsers, lucideShield,
    lucideMap, lucideSprout, lucideShieldAlert, lucideClipboardList,
    lucidePackage, lucideDroplets, lucideRadio, lucideMessageSquare,
    lucideBarChart2, lucideSettings, lucideGlobe, lucideMapPin,
    lucideArrowUpRight, lucideArrowDownRight, lucideSearch, lucideLock,
    lucideFolder, lucideChevronRight
  })],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--violet">
            <ng-icon name="lucideGlobe"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">CRDA — Bureau Regional</h1>
            <p class="inst-header__sub">Commissariat Regional au Developpement Agricole</p>
            @if (officeName()) {
              <p class="inst-header__location">
                <ng-icon name="lucideMapPin"></ng-icon>
                {{ officeName() }}
              </p>
            }
          </div>
        </div>
        <div class="inst-header__badge inst-header__badge--violet">
          <span class="inst-status-dot"></span>
          Systeme Actif
        </div>
      </header>

      <!-- KPI Cards -->
      <div class="inst-kpi-grid">
        @for (kpi of kpiCards(); track kpi.label) {
          <div class="inst-kpi">
            <p class="inst-kpi__label">{{ kpi.label }}</p>
            @if (loading()) {
              <div class="sk sk--h36"></div>
              <div class="sk sk--h12 sk--w60"></div>
            } @else {
              <p class="inst-kpi__value">{{ kpi.value }}</p>
              <p class="inst-kpi__trend" [class.inst-kpi__trend--neg]="kpi.trend < 0">
                <ng-icon [name]="kpi.trend >= 0 ? 'lucideArrowUpRight' : 'lucideArrowDownRight'"></ng-icon>
                {{ kpi.subtitle }}
              </p>
            }
          </div>
        }
      </div>

      <!-- Content Grid -->
      <div class="inst-grid">
        <!-- Status Breakdown -->
        <div class="inst-card">
          <div class="inst-card__head">
            <h3 class="inst-card__title">Repartition par statut</h3>
          </div>
          <div class="inst-card__body">
            @if (loading()) {
              @for (i of [1,2,3,4]; track i) {
                <div class="sk-row"><div class="sk sk--h12 sk--full"></div></div>
              }
            } @else if (kpi()) {
              @for (entry of statusEntries(); track entry.label) {
                <div class="status-row">
                  <div class="status-row__info">
                    <span class="status-row__dot" [style.background]="entry.color"></span>
                    <span class="status-row__label">{{ entry.label }}</span>
                    <span class="status-row__count">{{ entry.count }}</span>
                  </div>
                  <div class="status-row__bar">
                    <div class="status-row__fill"
                         [style.width.%]="kpi()!.total > 0 ? (entry.count / kpi()!.total) * 100 : 0"
                         [style.background]="entry.color"></div>
                  </div>
                </div>
              }
            } @else {
              <div class="inst-empty">Aucune donnee disponible</div>
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="inst-card">
          <div class="inst-card__head">
            <h3 class="inst-card__title">Actions rapides</h3>
          </div>
          <div class="inst-card__body inst-card__body--actions">
            <a class="action-row action-row--violet" routerLink="/dashboard/crda/dossiers">
              <div class="action-row__icon">
                <ng-icon name="lucideFolder"></ng-icon>
              </div>
              <div class="action-row__text">
                <span class="action-row__label">Dossiers Techniques</span>
                <span class="action-row__desc">{{ kpi()?.pendingReview || 0 }} en attente</span>
              </div>
              <ng-icon name="lucideChevronRight" class="action-row__arrow"></ng-icon>
            </a>
            <a class="action-row action-row--indigo" routerLink="/dashboard/crda/agriculteurs">
              <div class="action-row__icon">
                <ng-icon name="lucideMap"></ng-icon>
              </div>
              <div class="action-row__text">
                <span class="action-row__label">Territoire Agricole</span>
                <span class="action-row__desc">Consultation perimetre regional</span>
              </div>
              <ng-icon name="lucideChevronRight" class="action-row__arrow"></ng-icon>
            </a>
            <a class="action-row action-row--amber" routerLink="/dashboard/crda/consentements">
              <div class="action-row__icon">
                <ng-icon name="lucideLock"></ng-icon>
              </div>
              <div class="action-row__text">
                <span class="action-row__label">Journal d'Audit</span>
                <span class="action-row__desc">Traçabilite RGPD Agricole</span>
              </div>
              <ng-icon name="lucideChevronRight" class="action-row__arrow"></ng-icon>
            </a>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .inst-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px 48px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Header ──────────────────────────────────────────────── */
    .inst-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .inst-header__left {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .inst-header__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
    }

    .inst-header__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .inst-header__sub {
      margin: 2px 0 0;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .inst-header__location {
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 6px 0 0;
      font-size: 0.75rem;
      font-weight: 600;
      color: #a78bfa;
    }

    .inst-header__badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      background: color-mix(in srgb, var(--zir-emerald) 10%, transparent);
      color: var(--zir-emerald);
      border: 1px solid color-mix(in srgb, var(--zir-emerald) 25%, transparent);
      white-space: nowrap;
    }

    .inst-header__badge--violet {
      background: rgba(139, 92, 246, 0.1);
      color: #a78bfa;
      border-color: rgba(139, 92, 246, 0.25);
    }

    .inst-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    /* ── KPI Grid ────────────────────────────────────────────── */
    .inst-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    @media (max-width: 1100px) { .inst-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .inst-kpi-grid { grid-template-columns: 1fr; } }

    .inst-kpi {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      transition: all 0.2s;
    }

    .inst-kpi:hover {
      border-color: rgba(139, 92, 246, 0.3);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .inst-kpi__label {
      margin: 0 0 8px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .inst-kpi__value {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .inst-kpi__trend {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 6px 0 0;
      font-size: 0.72rem;
      font-weight: 600;
      color: #a78bfa;
    }

    .inst-kpi__trend ng-icon { width: 13px; height: 13px; }

    .inst-kpi__trend--neg { color: var(--error); }

    /* ── Content Grid ────────────────────────────────────────── */
    .inst-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 900px) { .inst-grid { grid-template-columns: 1fr; } }

    .inst-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }

    .inst-card__head {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .inst-card__title {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .inst-card__body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .inst-card__body--actions {
      gap: 10px;
    }

    .inst-empty {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    /* ── Status Row ──────────────────────────────────────────── */
    .status-row__info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .status-row__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-row__label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      flex: 1;
    }

    .status-row__count {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .status-row__bar {
      height: 6px;
      background: var(--bg-skeleton);
      border-radius: 3px;
      overflow: hidden;
    }

    .status-row__fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Action Row ──────────────────────────────────────────── */
    .action-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 12px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .action-row:hover { transform: translateX(3px); }

    .action-row--violet {
      background: rgba(139, 92, 246, 0.08);
      border-color: rgba(139, 92, 246, 0.18);
    }
    .action-row--violet:hover { border-color: rgba(139, 92, 246, 0.35); }
    .action-row--violet .action-row__icon { background: rgba(139, 92, 246, 0.12); color: #a78bfa; }

    .action-row--indigo {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.18);
    }
    .action-row--indigo:hover { border-color: rgba(99, 102, 241, 0.35); }
    .action-row--indigo .action-row__icon { background: rgba(99, 102, 241, 0.12); color: #818cf8; }

    .action-row--amber {
      background: color-mix(in srgb, #f59e0b 8%, transparent);
      border-color: color-mix(in srgb, #f59e0b 18%, transparent);
    }
    .action-row--amber:hover { border-color: color-mix(in srgb, #f59e0b 35%, transparent); }
    .action-row--amber .action-row__icon { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

    .action-row__icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .action-row__icon ng-icon { width: 18px; height: 18px; }

    .action-row__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .action-row__label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .action-row__desc {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .action-row__arrow {
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .action-row:hover .action-row__arrow { transform: translateX(3px); }

    /* ── Skeleton ────────────────────────────────────────────── */
    .sk {
      border-radius: 6px;
      background: var(--bg-skeleton);
      position: relative;
      overflow: hidden;
    }

    .sk::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, var(--bg-skeleton-shine), transparent);
      animation: shimmer 1.4s infinite;
    }

    .sk--h12 { height: 12px; }
    .sk--h36 { height: 36px; margin-bottom: 8px; }
    .sk--w60 { width: 60%; }
    .sk--full { width: 100%; }

    .sk-row { display: flex; flex-direction: column; gap: 6px; }

    @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

    @media (prefers-reduced-motion: reduce) {
      @keyframes shimmer { from { transform: none; } to { transform: none; } }
    }

    @media (max-width: 768px) {
      .inst-page { padding: 0 12px 32px; }
      .inst-header { flex-direction: column; }
      .inst-header__title { font-size: 1.2rem; }
    }
  `]
})
export class CrdaDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  kpi = signal<DossierKpi | null>(null);
  loading = signal(true);
  officeName = signal<string | null>(null);

  kpiCards = () => {
    const k = this.kpi();
    return [
      { label: 'Total Dossiers', value: k?.total ?? 0, subtitle: 'Toutes periodes', trend: 1 },
      { label: 'En revision', value: k?.pendingReview ?? 0, subtitle: 'En attente', trend: 0 },
      { label: 'Approuves', value: k?.approved ?? 0, subtitle: 'Ce cycle', trend: 1 },
      { label: 'Taux rejet', value: `${k?.rejectionRate ?? 0}%`, subtitle: 'Sur total', trend: -1 },
    ];
  };

  statusEntries = () => {
    const k = this.kpi();
    if (!k) return [];
    const colorMap: Record<string, string> = {
      SUBMITTED: '#8b5cf6',
      UNDER_REVIEW: '#f59e0b',
      APPROVED: '#10b981',
      REJECTED: '#ef4444',
      INCOMPLETE: '#f97316',
      DRAFT: '#94a3b8',
      CLOSED: '#6b7280',
    };
    return Object.entries(k.byStatus).map(([status, count]) => ({
      label: status.replace(/_/g, ' '),
      count,
      color: colorMap[status] || '#94a3b8',
    }));
  };

  ngOnInit() {
    const member = (this.authStore.currentUser() as any)?.institutionMember;
    const institutionId = member?.institutionId;
    if (member?.institution?.name) this.officeName.set(member.institution.name);
    if (institutionId) {
      this.http.get<DossierKpi>(
        `${environment.apiUrl}/dossiers/institution/${institutionId}/kpis`,
        { headers: { Authorization: `Bearer ${this.authStore.token()}` } }
      ).subscribe({
        next: (data) => { this.kpi.set(data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }
}
