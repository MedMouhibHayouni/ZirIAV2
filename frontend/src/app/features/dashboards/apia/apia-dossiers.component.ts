import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBriefcase, lucideFileText, lucideCheck, lucideX,
  lucideChevronLeft, lucideChevronRight, lucideFolder,
  lucideSearch, lucideFilter
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

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
  assignedAgent?: { id: string; name: string } | null;
  documents?: { id: string; documentName: string; reviewStatus: string }[];
}

const STATUS_CONFIG: Record<DossierStatus, { label: string; color: string; bg: string }> = {
  SUBMITTED:    { label: 'Soumis',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  UNDER_REVIEW: { label: 'En revision', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:     { label: 'Approuve',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:     { label: 'Rejete',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  INCOMPLETE:   { label: 'Incomplet',   color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  DRAFT:        { label: 'Brouillon',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  CLOSED:       { label: 'Cloture',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  WITHDRAWN:    { label: 'Retire',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

@Component({
  selector: 'app-apia-dossiers',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideBriefcase, lucideFileText, lucideCheck, lucideX,
    lucideChevronLeft, lucideChevronRight, lucideFolder,
    lucideSearch, lucideFilter
  })],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon">
            <ng-icon name="lucideBriefcase"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Gestion des Dossiers APIA</h1>
            <p class="inst-header__sub">{{ total() }} dossiers au total</p>
          </div>
        </div>
      </header>

      <!-- Filters -->
      <div class="inst-filters">
        @for (s of statusFilters; track s.key) {
          <button class="inst-chip" [class.inst-chip--active]="activeStatus() === s.key"
                  (click)="setStatusFilter(s.key)">
            {{ s.label }}
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="sk-grid">
          @for (i of [1,2,3]; track i) {
            <div class="inst-card"><div class="inst-card__body"><div class="sk sk--h60 sk--full"></div></div></div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && dossiers().length === 0) {
        <div class="inst-empty">
          <ng-icon name="lucideFolder"></ng-icon>
          <p class="inst-empty__title">Aucun dossier trouve</p>
          <p class="inst-empty__desc">Modifiez les filtres ou attendez de nouvelles soumissions</p>
        </div>
      }

      <!-- Dossier Cards -->
      @if (!loading() && dossiers().length > 0) {
        <div class="dossier-list">
          @for (d of dossiers(); track d.id) {
            <div class="dossier-card" (click)="selectDossier(d)">
              <div class="dossier-card__main">
                <div class="dossier-card__info">
                  <div class="dossier-card__meta">
                    <span class="dossier-card__ref">{{ d.referenceNumber }}</span>
                    <span class="status-pill"
                          [style.background]="statusConfig(d.status).bg"
                          [style.color]="statusConfig(d.status).color">
                      <span class="status-pill__dot"></span>
                      {{ statusConfig(d.status).label }}
                    </span>
                  </div>
                  <p class="dossier-card__name">{{ d.programName }}</p>
                  <p class="dossier-card__farmer">{{ d.farmer?.name || 'Agriculteur' }} — {{ d.farmer?.governorate || '—' }}</p>
                  @if (d.documents?.length) {
                    <div class="dossier-card__docs">
                      <ng-icon name="lucideFileText"></ng-icon>
                      {{ d.documents!.length }} piece(s) jointe(s)
                    </div>
                  }
                </div>
                <div class="dossier-card__amount">
                  <p class="dossier-card__value">{{ d.requestedAmountTnd | number:'1.3-3' }}</p>
                  <p class="dossier-card__unit">DT demande</p>
                  <p class="dossier-card__date">{{ d.createdAt | date:'dd/MM/yyyy' }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Pagination -->
      @if (total() > 20) {
        <div class="inst-pagination">
          <button class="inst-btn inst-btn--ghost" (click)="prevPage()" [disabled]="page() === 1">
            <ng-icon name="lucideChevronLeft"></ng-icon> Precedent
          </button>
          <span class="inst-pagination__page">Page {{ page() }}</span>
          <button class="inst-btn inst-btn--ghost" (click)="nextPage()" [disabled]="page() * 20 >= total()">
            Suivant <ng-icon name="lucideChevronRight"></ng-icon>
          </button>
        </div>
      }

      <!-- Detail Modal -->
      @if (selected()) {
        <div class="inst-modal-backdrop" (click)="selected.set(null)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>Dossier {{ selected()!.referenceNumber }}</h3>
              <button class="inst-modal__close" (click)="selected.set(null)">
                <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <!-- Status Update -->
              <div class="inst-field">
                <label>Changer le statut</label>
                <div class="inst-filters">
                  @for (s of changeableStatuses; track s.key) {
                    <button class="inst-chip" (click)="updateStatus(selected()!.id, s.key)"
                            [style.background]="s.bg" [style.color]="s.color"
                            [style.border-color]="s.color + '40'">
                      {{ s.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="inst-field">
                <label>Note interne (optionnel)</label>
                <input type="text" placeholder="Ajouter une note..." [(ngModel)]="statusNote"/>
              </div>

              <!-- Documents -->
              @if (selected()!.documents?.length) {
                <div class="inst-field">
                  <label>Pieces jointes</label>
                  <div class="doc-list">
                    @for (doc of selected()!.documents; track doc.id) {
                      <div class="doc-row">
                        <div class="doc-row__info">
                          <span class="doc-row__name">{{ doc.documentName }}</span>
                          <span class="doc-row__status"
                                [style.color]="doc.reviewStatus === 'ACCEPTED' ? '#10b981' : doc.reviewStatus === 'REJECTED' ? '#ef4444' : '#f59e0b'">
                            {{ doc.reviewStatus }}
                          </span>
                        </div>
                        <div class="doc-row__actions">
                          <button class="doc-btn doc-btn--accept" (click)="reviewDoc(doc.id, 'ACCEPTED')">
                            <ng-icon name="lucideCheck"></ng-icon>
                          </button>
                          <button class="doc-btn doc-btn--reject" (click)="reviewDoc(doc.id, 'REJECTED')">
                            <ng-icon name="lucideX"></ng-icon>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .sk-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .dossier-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dossier-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dossier-card:hover {
      border-color: color-mix(in srgb, var(--zir-emerald) 30%, transparent);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .dossier-card__main {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .dossier-card__info { flex: 1; min-width: 0; }

    .dossier-card__meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .dossier-card__ref {
      font-size: 0.72rem;
      font-weight: 700;
      font-family: monospace;
      color: var(--zir-emerald);
    }

    .dossier-card__name {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dossier-card__farmer {
      margin: 4px 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .dossier-card__docs {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .dossier-card__docs ng-icon { width: 13px; height: 13px; }

    .dossier-card__amount {
      text-align: right;
      flex-shrink: 0;
    }

    .dossier-card__value {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .dossier-card__unit {
      margin: 2px 0 0;
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .dossier-card__date {
      margin: 6px 0 0;
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .inst-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
    }

    .inst-pagination__page {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .doc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .doc-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px;
    }

    .doc-row__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .doc-row__name {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .doc-row__status {
      font-size: 0.7rem;
      font-weight: 600;
    }

    .doc-row__actions {
      display: flex;
      gap: 6px;
    }

    .doc-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .doc-btn ng-icon { width: 14px; height: 14px; }

    .doc-btn--accept {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .doc-btn--accept:hover { background: rgba(16, 185, 129, 0.25); }

    .doc-btn--reject {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .doc-btn--reject:hover { background: rgba(239, 68, 68, 0.25); }

    .inst-empty__title {
      margin: 0;
      font-weight: 700;
      color: var(--text-primary);
    }

    .inst-empty__desc {
      margin: 0;
      font-size: 0.78rem;
    }
  `]
})
export class ApiaDossiersComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  dossiers = signal<Dossier[]>([]);
  total = signal(0);
  loading = signal(true);
  page = signal(1);
  activeStatus = signal<string>('');
  selected = signal<Dossier | null>(null);
  statusNote = '';

  statusFilters = [
    { key: '', label: 'Tous', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
    { key: 'SUBMITTED', ...STATUS_CONFIG.SUBMITTED },
    { key: 'UNDER_REVIEW', ...STATUS_CONFIG.UNDER_REVIEW },
    { key: 'INCOMPLETE', ...STATUS_CONFIG.INCOMPLETE },
    { key: 'APPROVED', ...STATUS_CONFIG.APPROVED },
    { key: 'REJECTED', ...STATUS_CONFIG.REJECTED },
  ];

  changeableStatuses = [
    STATUS_CONFIG.UNDER_REVIEW,
    STATUS_CONFIG.INCOMPLETE,
    STATUS_CONFIG.APPROVED,
    STATUS_CONFIG.REJECTED,
    STATUS_CONFIG.CLOSED,
  ].map((c, i) => ({ ...c, key: Object.keys(STATUS_CONFIG)[i + 1] as DossierStatus }));

  statusConfig(status: DossierStatus) {
    return STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }

  private get institutionId() {
    return (this.authStore.currentUser() as any)?.institutionMember?.institutionId;
  }

  private get authHeaders() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  ngOnInit() { this.load(); }

  load() {
    const id = this.institutionId;
    if (!id) { this.loading.set(false); return; }
    const status = this.activeStatus();
    const url = `${environment.apiUrl}/dossiers/institution/${id}?page=${this.page()}&limit=20${status ? '&status=' + status : ''}`;
    this.loading.set(true);
    this.http.get<{ data: Dossier[]; total: number }>(url, { headers: this.authHeaders }).subscribe({
      next: (res) => { this.dossiers.set(res.data); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setStatusFilter(key: string) { this.activeStatus.set(key); this.page.set(1); this.load(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { if (this.page() * 20 < this.total()) { this.page.update(p => p + 1); this.load(); } }
  selectDossier(d: Dossier) { this.selected.set(d); }

  updateStatus(dossierId: string, status: DossierStatus) {
    this.http.patch(
      `${environment.apiUrl}/dossiers/${dossierId}/status`,
      { status, note: this.statusNote || undefined },
      { headers: this.authHeaders }
    ).subscribe(() => { this.selected.set(null); this.statusNote = ''; this.load(); });
  }

  reviewDoc(docId: string, reviewStatus: 'ACCEPTED' | 'REJECTED') {
    this.http.patch(
      `${environment.apiUrl}/dossiers/documents/${docId}/review`,
      { reviewStatus, rejectionReason: reviewStatus === 'REJECTED' ? 'Document non conforme' : undefined },
      { headers: this.authHeaders }
    ).subscribe(() => this.load());
  }
}
