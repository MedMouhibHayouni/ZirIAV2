import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTicket, lucideCheck, lucideX, lucideUser,
  lucideClock, lucideFilter, lucideMessageSquare
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface ServiceRequest {
  id: string;
  ticketNumber: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  farmer?: { id: string; name?: string; phoneNumber?: string };
  assignedAgent?: { id: string; name?: string } | null;
  agentResolutionReport?: string | null;
}

interface Kpis {
  total: number;
  pending: number;
  resolved: number;
  rejected: number;
  resolutionRate: number;
  byStatus: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { color: string; pillClass: string }> = {
  RECEIVED:    { color: '#f59e0b', pillClass: 'status-pill--amber' },
  ASSIGNED:    { color: '#6366f1', pillClass: 'status-pill--violet' },
  IN_PROGRESS: { color: '#0ea5e9', pillClass: 'status-pill--blue' },
  RESOLVED:    { color: '#10b981', pillClass: 'status-pill--emerald' },
  REJECTED:    { color: '#ef4444', pillClass: 'status-pill--red' },
};

@Component({
  selector: 'app-crda-service-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideTicket, lucideCheck, lucideX, lucideUser,
    lucideClock, lucideFilter, lucideMessageSquare
  })],
  styles: [`
    :host { --zir-violet: #8b5cf6; }
    .crda-request-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; border-radius: 12px; cursor: pointer;
      border: 1px solid var(--border); background: var(--bg-card);
      transition: all 0.2s;
    }
    .crda-request-row:hover { border-color: rgba(139,92,246,0.4); transform: translateX(2px); }
    .crda-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .crda-request-body { flex: 1; min-width: 0; }
    .crda-request-top { display: flex; align-items: center; gap: 8px; }
    .crda-request-subject { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .crda-request-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; }
    .crda-request-date { font-size: 0.72rem; color: var(--text-muted); flex-shrink: 0; }
    .crda-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .crda-detail-cell { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); }
    .crda-detail-cell__label { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px; }
    .crda-detail-cell__value { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
    .crda-action-btn {
      flex: 1; padding: 8px; border-radius: 10px; font-size: 0.78rem;
      font-weight: 700; cursor: pointer; border: none; font-family: inherit;
      transition: all 0.2s;
    }
    .crda-action-btn--resolve { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .crda-action-btn--resolve:hover { background: rgba(16,185,129,0.25); }
    .crda-action-btn--reject { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .crda-action-btn--reject:hover { background: rgba(239,68,68,0.22); }
    .crda-report-box {
      padding: 12px; border-radius: 10px; border: 1px solid rgba(139,92,246,0.2);
      background: rgba(139,92,246,0.06); margin-top: 8px;
    }
    .crda-report-box__label { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px; }
    .crda-report-box__text { font-size: 0.82rem; color: var(--text-secondary); }
    .crda-filter-active { opacity: 1 !important; }
    .crda-filter-inactive { opacity: 0.5; }
  `],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--violet">
            <ng-icon name="lucideTicket"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Demandes de Service</h1>
            <p class="inst-header__sub">Gestion et suivi des demandes agriculteurs</p>
          </div>
        </div>
      </header>

      <!-- KPIs -->
      @if (kpis(); as k) {
        <div class="inst-kpi-grid">
          <div class="inst-kpi">
            <p class="inst-kpi__label">Total</p>
            <p class="inst-kpi__value">{{ k.total }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">En attente</p>
            <p class="inst-kpi__value" style="color: #f59e0b">{{ k.pending }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Résolues</p>
            <p class="inst-kpi__value" style="color: #10b981">{{ k.resolved }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Rejetées</p>
            <p class="inst-kpi__value" style="color: #ef4444">{{ k.rejected }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Taux résolution</p>
            <p class="inst-kpi__value" style="color: #a78bfa">{{ k.resolutionRate }}%</p>
          </div>
        </div>
      }

      <!-- Skeleton KPIs -->
      @if (loading()) {
        <div class="inst-kpi-grid">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="inst-kpi sk-row">
              <div class="sk sk--h12 sk--w40"></div>
              <div class="sk sk--h20 sk--w60"></div>
            </div>
          }
        </div>
      }

      <!-- Filter Chips -->
      <div class="inst-filters">
        @for (f of filters; track f.value) {
          <button class="inst-chip"
            [class.inst-chip--active]="activeFilter() === f.value"
            [class.crda-filter-inactive]="activeFilter() !== f.value"
            (click)="activeFilter.set(f.value); load()">
            {{ f.label }}
          </button>
        }
      </div>

      <!-- Request Detail Modal -->
      @if (selected(); as s) {
        <div class="inst-modal-backdrop" (click)="selected.set(null)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <div>
                <p style="margin: 0; font-size: 0.72rem; font-family: monospace; color: var(--text-muted)">#{{ s.ticketNumber }}</p>
                <h3>{{ s.subject }}</h3>
              </div>
              <button class="inst-modal__close" (click)="selected.set(null)">
                <ng-icon name="lucideX"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary)">{{ s.description }}</p>

              <div class="crda-detail-grid">
                <div class="crda-detail-cell">
                  <p class="crda-detail-cell__label"><ng-icon name="lucideUser" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Agriculteur</p>
                  <p class="crda-detail-cell__value">{{ s.farmer?.name || '—' }}</p>
                </div>
                <div class="crda-detail-cell">
                  <p class="crda-detail-cell__label"><ng-icon name="lucideUser" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Agent assigné</p>
                  <p class="crda-detail-cell__value">{{ s.assignedAgent?.name || 'Non assigné' }}</p>
                </div>
              </div>

              @if (s.status === 'RECEIVED' || s.status === 'ASSIGNED') {
                <div class="inst-field">
                  <label><ng-icon name="lucideMessageSquare" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Rapport / Raison</label>
                  <input [(ngModel)]="actionText" placeholder="Décrivez la résolution ou le motif de rejet...">
                </div>
                <div style="display: flex; gap: 10px">
                  <button class="crda-action-btn crda-action-btn--resolve" (click)="doResolve()">
                    <ng-icon name="lucideCheck" style="width:14px;height:14px;vertical-align:-2px"></ng-icon>
                    Résoudre
                  </button>
                  <button class="crda-action-btn crda-action-btn--reject" (click)="doReject()">
                    <ng-icon name="lucideX" style="width:14px;height:14px;vertical-align:-2px"></ng-icon>
                    Rejeter
                  </button>
                </div>
              }

              @if (s.agentResolutionReport) {
                <div class="crda-report-box">
                  <p class="crda-report-box__label"><ng-icon name="lucideClock" style="width:11px;height:11px;vertical-align:-2px"></ng-icon> Rapport d'agent</p>
                  <p class="crda-report-box__text">{{ s.agentResolutionReport }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Request List -->
      @if (loading()) {
        <div style="display: flex; flex-direction: column; gap: 10px">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="inst-card" style="padding: 16px">
              <div class="sk-row" style="display: flex; gap: 12px; align-items: center">
                <div class="sk" style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0"></div>
                <div style="flex: 1" class="sk-row">
                  <div class="sk sk--h12 sk--w60"></div>
                  <div class="sk sk--h12 sk--w40"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (requests().length === 0) {
        <div class="inst-card">
          <div class="inst-empty">
            <ng-icon name="lucideTicket"></ng-icon>
            <p>Aucune demande pour ce filtre.</p>
          </div>
        </div>
      } @else {
        <div style="display: flex; flex-direction: column; gap: 8px">
          @for (r of requests(); track r.id) {
            <div class="crda-request-row" (click)="selected.set(r)">
              <div class="crda-dot" [style.background]="statusColor(r.status)"></div>
              <div class="crda-request-body">
                <div class="crda-request-top">
                  <span class="crda-request-subject">{{ r.subject }}</span>
                  <span class="status-pill" [class]="statusPillClass(r.status)">
                    <span class="status-pill__dot"></span>
                    {{ r.status }}
                  </span>
                </div>
                <p class="crda-request-meta">#{{ r.ticketNumber }} · {{ r.type.replace('_',' ') }}</p>
              </div>
              <span class="crda-request-date">{{ r.createdAt | date:'dd/MM/yy' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CrdaServiceRequestsComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  requests = signal<ServiceRequest[]>([]);
  kpis = signal<Kpis | null>(null);
  loading = signal(true);
  selected = signal<ServiceRequest | null>(null);
  activeFilter = signal('');
  actionText = '';

  filters = [
    { value: '', label: 'Toutes' },
    { value: 'RECEIVED', label: 'Reçues' },
    { value: 'ASSIGNED', label: 'Assignées' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'RESOLVED', label: 'Résolues' },
    { value: 'REJECTED', label: 'Rejetées' },
  ];

  private get headers() { return { Authorization: `Bearer ${this.authStore.token()}` }; }

  ngOnInit() { this.load(); this.loadKpis(); }

  load() {
    this.loading.set(true);
    const params = this.activeFilter() ? `?status=${this.activeFilter()}` : '';
    this.http.get<ServiceRequest[]>(`${environment.apiUrl}/crda/service-requests${params}`, { headers: this.headers })
      .subscribe({ next: d => { this.requests.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  loadKpis() {
    this.http.get<Kpis>(`${environment.apiUrl}/crda/service-requests/kpis`, { headers: this.headers })
      .subscribe({ next: d => this.kpis.set(d) });
  }

  doResolve() {
    if (!this.selected() || !this.actionText) return;
    this.http.patch<ServiceRequest>(
      `${environment.apiUrl}/crda/service-requests/${this.selected()!.id}/resolve`,
      { resolutionReport: this.actionText },
      { headers: this.headers }
    ).subscribe({ next: r => { this.updateList(r); this.selected.set(r); this.actionText = ''; } });
  }

  doReject() {
    if (!this.selected() || !this.actionText) return;
    this.http.patch<ServiceRequest>(
      `${environment.apiUrl}/crda/service-requests/${this.selected()!.id}/reject`,
      { reason: this.actionText },
      { headers: this.headers }
    ).subscribe({ next: r => { this.updateList(r); this.selected.set(r); this.actionText = ''; } });
  }

  private updateList(r: ServiceRequest) {
    this.requests.update(l => l.map(x => x.id === r.id ? r : x));
    this.loadKpis();
  }

  statusColor(s: string) { return STATUS_CONFIG[s]?.color || '#94a3b8'; }
  statusPillClass(s: string) { return 'status-pill ' + (STATUS_CONFIG[s]?.pillClass || 'status-pill--gray'); }
}
