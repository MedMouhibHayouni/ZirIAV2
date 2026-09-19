import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideFolder, lucideFileText, lucideCheck, lucideX, lucideFilter } from '@ng-icons/lucide';

type DossierStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE' | 'DRAFT' | 'CLOSED' | 'WITHDRAWN';

interface Dossier {
  id: string;
  referenceNumber: string;
  type: string;
  status: DossierStatus;
  programName: string;
  requestedAmountTnd: number;
  approvedAmountTnd?: number | null;
  createdAt: string;
  farmer?: { id: string; name: string; phone?: string; governorate?: string };
  documents?: { id: string; documentName: string; reviewStatus: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED:    { label: 'Soumis',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  UNDER_REVIEW: { label: 'En révision', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:     { label: 'Approuvé',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:     { label: 'Rejeté',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  INCOMPLETE:   { label: 'Incomplet',   color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  DRAFT:        { label: 'Brouillon',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  CLOSED:       { label: 'Clôturé',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

@Component({
  selector: 'app-crda-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideFolder, lucideFileText, lucideCheck, lucideX, lucideFilter
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: '--zir-violet: #8b5cf6' },
  template: `
    <div class="inst-page">
      <div class="inst-header">
        <div>
          <h1 class="inst-page-title">
            <ng-icon name="lucideFolder" size="20" />
            Dossiers Techniques CRDA
          </h1>
          <p class="inst-page-subtitle">{{ total() }} dossiers enregistrés</p>
        </div>
      </div>

      <div class="inst-filter-bar">
        <button *ngFor="let s of statusFilters"
                (click)="setFilter(s.key)"
                class="inst-btn inst-btn--chip"
                [class.inst-btn--chip-active]="activeStatus() === s.key"
                [style.--chip-color]="s.color"
                [style.--chip-bg]="s.bg">
          <ng-icon name="lucideFilter" size="14" />
          {{ s.label }}
        </button>
      </div>

      @if (loading()) {
        <div class="inst-skeleton-list">
          @for (i of [1, 2, 3]; track i) {
            <div class="sk sk-card"></div>
          }
        </div>
      } @else if (dossiers().length === 0) {
        <div class="inst-empty-state">
          <ng-icon name="lucideFileText" size="48" class="inst-empty-icon" />
          <p class="inst-empty-title">Aucun dossier trouvé</p>
        </div>
      } @else {
        <div class="inst-card-list">
          @for (d of dossiers(); track d.id) {
            <div class="inst-card inst-card--interactive" (click)="selected.set(d)">
              <div class="inst-card-row">
                <div class="inst-card-main">
                  <div class="inst-card-meta">
                    <span class="inst-ref mono">{{ d.referenceNumber }}</span>
                    <span class="status-pill"
                          [style.--pill-color]="cfg(d.status).color"
                          [style.--pill-bg]="cfg(d.status).bg">
                      {{ cfg(d.status).label }}
                    </span>
                  </div>
                  <p class="inst-card-title">{{ d.programName }}</p>
                  <p class="inst-card-subtitle">
                    {{ d.farmer?.name || '—' }} · {{ d.farmer?.governorate || '—' }}
                  </p>
                </div>
                <div class="inst-card-amount">
                  <p class="inst-amount-value">{{ d.requestedAmountTnd | number:'1.3-3' }}</p>
                  <p class="inst-amount-label">DT demandé</p>
                  <p class="inst-amount-date">{{ d.createdAt | date:'dd/MM/yyyy' }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (selected()) {
        <div class="inst-modal-backdrop" (click)="selected.set(null)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal-header">
              <h2 class="inst-modal-title">
                <ng-icon name="lucideFileText" size="18" />
                Mettre à jour : {{ selected()!.referenceNumber }}
              </h2>
              <button class="inst-btn inst-btn--icon" (click)="selected.set(null)">
                <ng-icon name="lucideX" size="18" />
              </button>
            </div>
            <div class="inst-modal-body">
              <div class="inst-status-grid">
                @for (s of changeableStatuses; track s.key) {
                  <button class="inst-btn inst-btn--status"
                          (click)="updateStatus(selected()!.id, s.key)"
                          [style.--status-color]="s.color"
                          [style.--status-bg]="s.bg">
                    <ng-icon name="lucideCheck" size="14" />
                    {{ s.label }}
                  </button>
                }
              </div>
              <div class="inst-field">
                <label class="inst-label">Note (optionnel)</label>
                <input [(ngModel)]="statusNote"
                       placeholder="Ajouter une note..."
                       class="inst-input" />
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CrdaDossiersComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  readonly lucideFolder = lucideFolder;
  readonly lucideFileText = lucideFileText;
  readonly lucideCheck = lucideCheck;
  readonly lucideX = lucideX;
  readonly lucideFilter = lucideFilter;

  dossiers = signal<Dossier[]>([]);
  total = signal(0);
  loading = signal(true);
  activeStatus = signal('');
  selected = signal<Dossier | null>(null);
  statusNote = '';

  statusFilters = Object.entries(STATUS_CONFIG).map(([key, v]) => ({ key, ...v }));
  changeableStatuses = ['UNDER_REVIEW', 'INCOMPLETE', 'APPROVED', 'REJECTED', 'CLOSED']
    .map(k => ({ key: k, ...STATUS_CONFIG[k] }));

  cfg(status: string) { return STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }; }

  private get id() { return (this.authStore.currentUser() as any)?.institutionMember?.institutionId; }
  private get h() { return { Authorization: `Bearer ${this.authStore.token()}` }; }

  ngOnInit() { this.load(); }

  load() {
    if (!this.id) { this.loading.set(false); return; }
    const s = this.activeStatus();
    this.loading.set(true);
    this.http.get<{ data: Dossier[]; total: number }>(
      `${environment.apiUrl}/dossiers/institution/${this.id}?page=1&limit=20${s ? '&status=' + s : ''}`,
      { headers: this.h }
    ).subscribe({ next: r => { this.dossiers.set(r.data); this.total.set(r.total); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  setFilter(k: string) { this.activeStatus.set(k); this.load(); }

  updateStatus(id: string, status: string) {
    this.http.patch(`${environment.apiUrl}/dossiers/${id}/status`, { status, note: this.statusNote || undefined }, { headers: this.h })
      .subscribe(() => { this.selected.set(null); this.statusNote = ''; this.load(); });
  }
}
