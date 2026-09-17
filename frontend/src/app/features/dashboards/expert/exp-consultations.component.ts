import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideInbox, lucideCheckCircle, lucideXCircle, lucideClock,
  lucideChevronDown, lucideChevronUp, lucideSend, lucideEye,
  lucideDollarSign, lucideFilter, lucideRefreshCw, lucideLoader,
  lucideAlertTriangle, lucideInfo, lucideCheck, lucideX,
  lucideMapPin, lucideSprout, lucidePackage, lucideUser,
  lucideMessageSquare, lucideCalendar, lucideActivity, lucideTrendingUp
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { ToastService } from './shared/toast.service';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  AWAITING_INFO: 'Infos complémentaires',
};

const ACTIVITY_LABELS: Record<string, string> = {
  CROP: 'Agriculteur',
  LIVESTOCK: 'Éleveur',
  MIXED: 'Polyculteur',
};

const ACTIVITY_COLORS: Record<string, string> = {
  CROP: 'var(--zir-emerald)',
  LIVESTOCK: 'var(--warning)',
  MIXED: 'var(--info)',
};

const ACTIVITY_ICONS: Record<string, string> = {
  CROP: 'lucideSprout',
  LIVESTOCK: 'lucidePackage',
  MIXED: 'lucideActivity',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exp-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, SkeletonLoaderComponent],
  providers: [provideIcons({
    lucideInbox, lucideCheckCircle, lucideXCircle, lucideClock,
    lucideChevronDown, lucideChevronUp, lucideSend, lucideEye,
    lucideDollarSign, lucideFilter, lucideRefreshCw, lucideLoader,
    lucideAlertTriangle, lucideInfo, lucideCheck, lucideX,
    lucideMapPin, lucideSprout, lucidePackage, lucideUser,
    lucideMessageSquare, lucideCalendar, lucideActivity, lucideTrendingUp
  })],
  template: `
    <div class="consult-page">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Consultations</h1>
          <p class="page-sub">Demandes des agriculteurs &bullet; {{ filtered().length }} affichées</p>
        </div>
        <button class="btn-refresh" (click)="reload()">
          <ng-icon name="lucideRefreshCw" [class.spinning]="loading()"></ng-icon>
          <span class="btn-label">Actualiser</span>
        </button>
      </div>

      <!-- KPI row -->
      <div class="kpi-strip">
        @for (k of kpis(); track k.label) {
          <div class="kpi-card">
            <div class="kpi-icon" [style.background]="k.bg">
              <ng-icon [name]="k.icon" [style.color]="k.color"></ng-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-val">{{ k.value }}</span>
              <span class="kpi-label">{{ k.label }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Sub-tabs -->
      <div class="sub-tabs">
        <button class="sub-tab" [class.active]="activeSubTab() === 'queue'" (click)="activeSubTab.set('queue')">
          <ng-icon name="lucideClock"></ng-icon>
          <span>File d'Attente</span>
          @if (queueCount() > 0) {
            <span class="tab-badge urgent">{{ queueCount() }}</span>
          }
        </button>
        <button class="sub-tab" [class.active]="activeSubTab() === 'inprogress'" (click)="activeSubTab.set('inprogress')">
          <ng-icon name="lucideSend"></ng-icon>
          <span>En Cours</span>
          @if (inProgressCount() > 0) {
            <span class="tab-badge active">{{ inProgressCount() }}</span>
          }
        </button>
        <button class="sub-tab" [class.active]="activeSubTab() === 'completed'" (click)="activeSubTab.set('completed')">
          <ng-icon name="lucideCheckCircle"></ng-icon>
          <span>Terminées</span>
          @if (completedCount() > 0) {
            <span class="tab-badge">{{ completedCount() }}</span>
          }
        </button>
      </div>

      <!-- Cards -->
      @if (loading()) {
        <div class="skeleton-grid">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton-loader width="100%" height="100px" borderRadius="16px"></app-skeleton-loader>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <ng-icon name="lucideInbox" class="empty-icon"></ng-icon>
          <p class="empty-title">Aucune consultation</p>
          <p class="empty-sub">
            {{ activeSubTab() === 'queue' ? 'Aucune demande en attente.' :
               activeSubTab() === 'inprogress' ? 'Aucune consultation en cours.' :
               'Aucune consultation terminée.' }}
          </p>
        </div>
      } @else {
        <div class="consult-grid">
          @for (c of filtered(); track c.id) {
            <div class="consult-card" [class.expanded]="expandedId() === c.id"
                 [style.--card-accent]="getAccentColor(c)">
              <div class="card-top" (click)="toggle(c.id)">
                <!-- Farmer avatar + info -->
                <div class="card-farmer">
                  <div class="farmer-avatar" [style.background]="getActivityColor(c.farmer_activity_type) + '20'"
                       [style.color]="getActivityColor(c.farmer_activity_type)">
                    {{ (c.farmer_name || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div class="farmer-details">
                    <span class="farmer-name">{{ c.farmer_name || 'Agriculteur' }}</span>
                    <span class="farmer-meta">
                      <ng-icon [name]="getActivityIcon(c.farmer_activity_type)" class="meta-icon"></ng-icon>
                      {{ getActivityLabel(c.farmer_activity_type) }}
                      @if (c.farmer_governorate) {
                        <ng-icon name="lucideMapPin" class="meta-icon"></ng-icon>
                        {{ c.farmer_governorate }}
                      }
                    </span>
                  </div>
                </div>
                <!-- Status + Amount + Date -->
                <div class="card-meta">
                  <span class="status-pill" [class]="c.status?.toLowerCase()">{{ getStatus(c.status) }}</span>
                  @if (c.net_to_expert_tnd && c.status === 'COMPLETED') {
                    <span class="amount-pill">{{ c.net_to_expert_tnd | number:'1.0-0' }} TND</span>
                  }
                  <span class="date-text">{{ c.created_at | date:'dd/MM/yy' }}</span>
                  <ng-icon [name]="expandedId() === c.id ? 'lucideChevronUp' : 'lucideChevronDown'" class="chevron"></ng-icon>
                </div>
              </div>

              @if (expandedId() === c.id) {
                <div class="card-body animate-in">
                  <!-- Parcels if available -->
                  @if (c.parcels?.length) {
                    <div class="parcels-row">
                      @for (p of c.parcels; track p.id) {
                        <div class="parcel-chip">
                          <ng-icon name="lucideSprout" class="chip-icon"></ng-icon>
                          <span>{{ p.name || p.crop_type }}</span>
                          @if (p.surface_ha) {
                            <span class="chip-surface">{{ p.surface_ha }} ha</span>
                          }
                        </div>
                      }
                    </div>
                  }

                  <!-- Description -->
                  <div class="desc-block">
                    <div class="block-label">Description</div>
                    <p class="desc-text">{{ c.description }}</p>
                  </div>

                  <!-- AI Suggestions -->
                  @if (getAiSuggestions(c).length > 0) {
                    <div class="ai-chips">
                      <div class="block-label">Suggestions IA</div>
                      <div class="chips-row">
                        @for (s of getAiSuggestions(c); track $index) {
                          <button class="ai-chip" (click)="insertSuggestion(c.id, s.text)"
                                  [style.--chip-color]="s.color">
                            <ng-icon [name]="s.icon"></ng-icon>
                            <span>{{ s.text }}</span>
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <!-- Response (if already responded) -->
                  @if (c.expert_response) {
                    <div class="response-block">
                      <div class="block-label">Votre réponse</div>
                      <p class="response-text">{{ c.expert_response }}</p>
                      @if (c.net_to_expert_tnd) {
                        <div class="earnings-note">
                          <ng-icon name="lucideTrendingUp"></ng-icon>
                          <span><strong>{{ c.net_to_expert_tnd | number:'1.2-2' }} TND</strong> nets reçus</span>
                          <span class="comm-muted">(commission: {{ c.platform_commission_tnd | number:'1.2-2' }} TND)</span>
                        </div>
                      }
                    </div>
                  }

                  <!-- Action: Accept (OPEN) -->
                  @if (c.status === 'OPEN') {
                    <div class="action-accept">
                      <button class="btn-accept" (click)="accept(c)" [disabled]="actingId() === c.id">
                        @if (actingId() === c.id) {
                          <ng-icon name="lucideLoader" class="spinning"></ng-icon>
                        } @else {
                          <ng-icon name="lucideCheckCircle"></ng-icon>
                        }
                        Accepter la consultation
                      </button>
                    </div>
                  }

                  <!-- Action: Respond (IN_PROGRESS, no response yet) -->
                  @if (c.status === 'IN_PROGRESS' && !c.expert_response) {
                    <div class="respond-block">
                      <div class="block-label">Votre réponse</div>
                      <textarea class="resp-textarea" [id]="'resp-' + c.id"
                                [(ngModel)]="responseDraft[c.id]"
                                rows="4" placeholder="Rédigez votre réponse..."></textarea>
                      <div class="respond-actions">
                        <button class="btn-send" (click)="respond(c)"
                                [disabled]="actingId() === c.id || !responseDraft[c.id]?.trim()">
                          @if (actingId() === c.id) {
                            <ng-icon name="lucideLoader" class="spinning"></ng-icon>
                          } @else {
                            <ng-icon name="lucideSend"></ng-icon>
                          }
                          Envoyer la réponse
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; --card-accent: var(--zir-emerald); }

    .consult-page { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .page-header-left { min-width: 0; }
    .page-title { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; }
    .page-sub { color: var(--text-secondary); font-size: 0.88rem; margin: 0; }
    .btn-refresh { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 18px; color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-refresh:hover { color: var(--zir-emerald); border-color: var(--zir-emerald); }
    .spinning { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* KPI strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 14px; }
    .kpi-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .kpi-body { display: flex; flex-direction: column; min-width: 0; }
    .kpi-val { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1.2; }
    .kpi-label { color: var(--text-secondary); font-size: 0.75rem; }

    /* Sub-tabs */
    .sub-tabs { display: flex; gap: 2px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); overflow-x: auto; }
    .sub-tab { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: none; border: none; color: var(--text-secondary); font-weight: 600; font-size: 0.92rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
    .sub-tab.active { color: var(--zir-emerald); border-bottom-color: var(--zir-emerald); }
    .sub-tab:hover:not(.active) { color: var(--text-primary); }
    .tab-badge { background: var(--bg-tertiary); color: var(--text-primary); padding: 2px 9px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
    .tab-badge.urgent { background: #dc2626; color: white; animation: pulse 2s infinite; }
    .tab-badge.active { background: var(--zir-emerald); color: white; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

    /* Grid */
    .consult-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 768px) { .consult-grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1200px) { .consult-grid { grid-template-columns: 1fr 1fr; } }

    .consult-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 16px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s;
      border-left: 4px solid var(--card-accent, var(--border-color));
    }
    .consult-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .consult-card.expanded { box-shadow: 0 6px 24px rgba(0,0,0,0.08); border-color: var(--card-accent, var(--border-color)); }

    .card-top { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; cursor: pointer; gap: 12px; }
    .card-farmer { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .farmer-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
    .farmer-details { display: flex; flex-direction: column; min-width: 0; }
    .farmer-name { font-weight: 700; color: var(--text-primary); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .farmer-meta { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 0.75rem; flex-wrap: wrap; }
    .meta-icon { font-size: 12px; }

    .card-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .status-pill { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
    .status-pill.open { background: #fef3c7; color: #92400e; }
    .status-pill.in_progress { background: #dbeafe; color: #1e40af; }
    .status-pill.completed { background: #d1fae5; color: #065f46; }
    .status-pill.cancelled { background: #fce4ec; color: #c62828; }
    .status-pill.awaiting_info { background: #f3e8ff; color: #6b21a8; }

    @media (prefers-color-scheme: dark) {
      .status-pill.open { background: rgba(251,191,36,0.15); color: #fbbf24; }
      .status-pill.in_progress { background: rgba(59,130,246,0.15); color: #93c5fd; }
      .status-pill.completed { background: rgba(16,185,129,0.15); color: #6ee7b7; }
      .status-pill.cancelled { background: rgba(220,38,38,0.15); color: #fca5a5; }
      .status-pill.awaiting_info { background: rgba(139,92,246,0.15); color: #c4b5fd; }
    }

    .amount-pill { background: rgba(16,185,129,0.1); color: var(--zir-emerald); padding: 3px 9px; border-radius: 6px; font-size: 0.73rem; font-weight: 700; white-space: nowrap; }
    .date-text { color: var(--text-secondary); font-size: 0.75rem; white-space: nowrap; }
    .chevron { color: var(--text-secondary); font-size: 1rem; flex-shrink: 0; }

    /* Card body */
    .card-body { padding: 0 18px 18px; border-top: 1px solid var(--border-color); }
    .animate-in { animation: slideDown 0.25s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

    .block-label { font-weight: 700; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; margin: 14px 0 6px; }

    /* Parcels */
    .parcels-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .parcel-chip { display: flex; align-items: center; gap: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 6px 12px; font-size: 0.8rem; color: var(--text-primary); }
    .chip-icon { font-size: 14px; color: var(--zir-emerald); }
    .chip-surface { color: var(--text-secondary); font-size: 0.72rem; }

    .desc-text { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.65; background: var(--bg-secondary); border-radius: 12px; padding: 12px 14px; margin: 0; }
    .response-text { color: var(--text-primary); font-size: 0.9rem; line-height: 1.65; background: rgba(16,185,129,0.06); border-left: 3px solid var(--zir-emerald); border-radius: 0 12px 12px 0; padding: 12px 16px; margin: 0; }
    .earnings-note { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.82rem; margin-top: 10px; flex-wrap: wrap; }
    .earnings-note strong { color: var(--zir-emerald); }
    .comm-muted { color: var(--text-secondary); font-size: 0.75rem; opacity: 0.6; }

    /* AI Chips */
    .ai-chips { margin-top: 8px; }
    .chips-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .ai-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--chip-color, var(--border-color)) 30%, transparent);
      background: color-mix(in srgb, var(--chip-color, transparent) 8%, var(--bg-card));
      cursor: pointer; transition: all 0.2s; font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .ai-chip:hover { background: color-mix(in srgb, var(--chip-color, transparent) 15%, var(--bg-secondary)); transform: translateX(2px); }
    .ai-chip ng-icon { font-size: 14px; color: var(--chip-color); }

    /* Action accept */
    .action-accept { margin-top: 14px; }
    .btn-accept { display: flex; align-items: center; gap: 8px; background: var(--zir-emerald); color: white; border: none; border-radius: 12px; padding: 12px 24px; font-weight: 700; font-size: 0.92rem; cursor: pointer; transition: opacity 0.2s; width: 100%; justify-content: center; }
    .btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-accept:hover:not(:disabled) { opacity: 0.9; }

    /* Respond */
    .respond-block { margin-top: 10px; }
    .resp-textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-size: 0.9rem; padding: 12px 14px; resize: vertical; outline: none; box-sizing: border-box; font-family: inherit; transition: border-color 0.2s; }
    .resp-textarea:focus { border-color: var(--zir-emerald); }
    .respond-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    .btn-send { display: flex; align-items: center; gap: 8px; background: var(--zir-emerald); color: white; border: none; border-radius: 12px; padding: 10px 22px; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: opacity 0.2s; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Skeleton */
    .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 768px) { .skeleton-grid { grid-template-columns: 1fr 1fr; } }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 20px; grid-column: 1 / -1; }
    .empty-icon { font-size: 3rem; color: var(--text-secondary); opacity: 0.25; margin-bottom: 12px; }
    .empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .empty-sub { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }

    /* Responsive small screens */
    @media (max-width: 600px) {
      .consult-page { padding: 16px; }
      .page-title { font-size: 1.3rem; }
      .btn-label { display: none; }
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .card-top { flex-direction: column; align-items: flex-start; gap: 8px; }
      .card-meta { width: 100%; justify-content: flex-start; }
      .farmer-meta { font-size: 0.7rem; }
    }
  `]
})
export class ExpConsultationsComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly consultations = signal<any[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);
  readonly actingId = signal<string | null>(null);
  readonly activeSubTab = signal<'queue' | 'inprogress' | 'completed'>('queue');

  responseDraft: Record<string, string> = {};

  readonly queueCount = computed(() =>
    this.consultations().filter(c => c.status === 'OPEN').length
  );

  readonly inProgressCount = computed(() =>
    this.consultations().filter(c => c.status === 'IN_PROGRESS').length
  );

  readonly completedCount = computed(() =>
    this.consultations().filter(c => c.status === 'COMPLETED').length
  );

  readonly filtered = computed(() => {
    const tab = this.activeSubTab();
    if (tab === 'queue') return this.consultations().filter(c => c.status === 'OPEN');
    if (tab === 'inprogress') return this.consultations().filter(c => c.status === 'IN_PROGRESS');
    return this.consultations().filter(c => c.status === 'COMPLETED');
  });

  readonly kpis = computed(() => {
    const all = this.consultations();
    const total = all.length;
    const open = all.filter(c => c.status === 'OPEN').length;
    const done = all.filter(c => c.status === 'COMPLETED').length;
    const inProg = all.filter(c => c.status === 'IN_PROGRESS').length;
    const earnings = all
      .filter(c => c.status === 'COMPLETED' && c.net_to_expert_tnd)
      .reduce((sum, c) => sum + parseFloat(c.net_to_expert_tnd || 0), 0);
    return [
      { value: open, label: 'En attente', icon: 'lucideClock', bg: '#fef3c7', color: '#d97706' },
      { value: inProg, label: 'En cours', icon: 'lucideMessageSquare', bg: '#dbeafe', color: '#2563eb' },
      { value: done, label: 'Terminées', icon: 'lucideCheckCircle', bg: '#d1fae5', color: '#059669' },
      { value: earnings.toFixed(0) + ' TND', label: 'Gains nets', icon: 'lucideTrendingUp', bg: '#f3e8ff', color: '#7c3aed' },
    ];
  });

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.api.getConsultationsQueue().subscribe({
      next: (data) => { this.consultations.set(data); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  toggle(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  getStatus(s: string): string { return STATUS_LABELS[s] || s; }
  getActivityLabel(t: string | null): string { return ACTIVITY_LABELS[t ?? ''] || 'Agriculteur'; }
  getActivityColor(t: string | null): string { return ACTIVITY_COLORS[t ?? ''] || 'var(--text-secondary)'; }
  getActivityIcon(t: string | null): string { return ACTIVITY_ICONS[t ?? ''] || 'lucideUser'; }

  getAccentColor(c: any): string {
    if (c.status === 'COMPLETED') return 'var(--zir-emerald)';
    if (c.status === 'IN_PROGRESS') return 'var(--info)';
    return 'var(--warning)';
  }

  getAiSuggestions(c: any): { icon: string; text: string; color: string }[] {
    const s: { icon: string; text: string; color: string }[] = [];
    const type = c.consultation_type || '';
    const activity = c.farmer_activity_type || '';

    if (type === 'DIAGNOSTIC') {
      s.push({ icon: 'lucideInfo', text: 'Vérifier historique des maladies sur la parcelle', color: '#3b82f6' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Demander photos supplémentaires si nécessaire', color: '#f59e0b' });
    }
    if (type === 'FERTILISATION') {
      s.push({ icon: 'lucideInfo', text: 'Analyser le pH et la matière organique du sol', color: '#10b981' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Vérifier l\'historique des apports NPK', color: '#f59e0b' });
    }
    if (type === 'IRRIGATION') {
      s.push({ icon: 'lucideInfo', text: 'Vérifier pression et débit à l\'entrée du réseau', color: '#3b82f6' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Consulter les relevés pluviométriques récents', color: '#f59e0b' });
    }
    if (type === 'EAU_SOUTERRAINE') {
      s.push({ icon: 'lucideInfo', text: 'Analyser l\'historique piézométrique du puits', color: '#06b6d4' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Vérifier les analyses de qualité d\'eau', color: '#f59e0b' });
    }
    if (type === 'NUTRITION_ANIMALE') {
      s.push({ icon: 'lucideInfo', text: 'Analyser la ration actuelle et l\'état corporel', color: '#10b981' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Vérifier les antécédents sanitaires du troupeau', color: '#f59e0b' });
    }
    if (type === 'PROPHYLAXIE') {
      s.push({ icon: 'lucideInfo', text: 'Consulter le calendrier vaccinal de l\'élevage', color: '#8b5cf6' });
      s.push({ icon: 'lucideAlertTriangle', text: 'Vérifier les foyers épidémiologiques voisins', color: '#f59e0b' });
    }

    // Activity-specific
    if (activity === 'LIVESTOCK') {
      s.push({ icon: 'lucidePackage', text: 'Vérifier les indicateurs de production animale', color: '#d97706' });
    }
    if (activity === 'CROP') {
      s.push({ icon: 'lucideSprout', text: 'Vérifier le stade phénologique des cultures', color: '#059669' });
    }

    return s;
  }

  insertSuggestion(consultationId: string, text: string) {
    const current = this.responseDraft[consultationId] || '';
    this.responseDraft[consultationId] = current ? current + '\n' + text : text;
    this.cdr.markForCheck();
  }

  accept(c: any) {
    this.actingId.set(c.id);
    this.api.acceptConsultation(c.id).subscribe({
      next: () => {
        this.consultations.update(list =>
          list.map(x => x.id === c.id ? { ...x, status: 'IN_PROGRESS' } : x)
        );
        this.actingId.set(null);
        this.toast.success('Consultation acceptée');
        this.cdr.markForCheck();
      },
      error: () => { this.actingId.set(null); this.toast.error('Erreur lors de l\'acceptation'); this.cdr.markForCheck(); }
    });
  }

  respond(c: any) {
    const response = this.responseDraft[c.id]?.trim();
    if (!response) return;
    this.actingId.set(c.id);
    this.api.respondToConsultation(c.id, response).subscribe({
      next: () => {
        this.consultations.update(list =>
          list.map(x => x.id === c.id ? { ...x, status: 'COMPLETED', expert_response: response } : x)
        );
        this.actingId.set(null);
        this.toast.success('Réponse envoyée avec succès');
        this.cdr.markForCheck();
      },
      error: () => { this.actingId.set(null); this.toast.error('Erreur lors de l\'envoi'); this.cdr.markForCheck(); }
    });
  }
}
