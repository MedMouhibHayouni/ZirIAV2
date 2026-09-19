import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMegaphone, lucidePlus, lucidePlay, lucideSquare, lucideCalendar, lucideUsers, lucideTarget, lucideX } from '@ng-icons/lucide';

interface Campaign {
  id: string;
  title: string;
  type: string;
  targetCropOrLivestock: string;
  startDate: string;
  endDate: string;
  status: string;
  targetDelegations: string[];
  targetParticipantsCount: number;
  enrollments: { id: string; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#f59e0b',
  ACTIVE: '#10b981',
  COMPLETED: '#8b5cf6',
  CANCELLED: '#ef4444',
};

const TYPE_LABELS: Record<string, string> = {
  VACCINATION: 'Vaccination',
  PHYTOSANITARY_TREATMENT: 'Phytosanitaire',
  SOWING_DECLARATION: 'Déclaration Semis',
  HARVEST_DECLARATION: 'Déclaration Récolte',
  WATER_MANAGEMENT: 'Gestion Eau',
};

@Component({
  selector: 'app-crda-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideMegaphone, lucidePlus, lucidePlay, lucideSquare, lucideCalendar, lucideUsers, lucideTarget, lucideX
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: '--zir-violet: #8b5cf6' },
  template: `
    <div class="inst-page">

      <div class="inst-header">
        <div>
          <h1 class="inst-page-title">
            <ng-icon name="lucideMegaphone" size="22" />
            Campagnes Agricoles
          </h1>
          <p class="inst-page-subtitle">Planification et suivi des campagnes régionales</p>
        </div>
        <button class="inst-btn inst-btn--primary" (click)="showCreate.set(true)">
          <ng-icon name="lucidePlus" size="16" />
          Nouvelle campagne
        </button>
      </div>

      @if (showCreate()) {
        <div class="inst-modal-backdrop" (click)="showCreate.set(false)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal-header">
              <h2 class="inst-modal-title">
                <ng-icon name="lucideMegaphone" size="18" />
                Créer une campagne
              </h2>
              <button class="inst-btn inst-btn--icon" (click)="showCreate.set(false)">
                <ng-icon name="lucideX" size="18" />
              </button>
            </div>
            <div class="inst-modal-body">
              <div class="inst-field">
                <label class="inst-label">Titre *</label>
                <input [(ngModel)]="newTitle" placeholder="Titre de la campagne" class="inst-input" />
              </div>
              <div class="inst-field">
                <label class="inst-label">Type *</label>
                <select [(ngModel)]="newType" class="inst-select">
                  <option value="">-- Sélectionner un type --</option>
                  @for (t of typeOptions; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="inst-field">
                <label class="inst-label">Culture / Élevage ciblé *</label>
                <input [(ngModel)]="newCrop" placeholder="Ex: blé dur, olivier..." class="inst-input" />
              </div>
              <div class="inst-field-row">
                <div class="inst-field">
                  <label class="inst-label">
                    <ng-icon name="lucideCalendar" size="14" />
                    Date début
                  </label>
                  <input type="date" [(ngModel)]="newStart" class="inst-input" />
                </div>
                <div class="inst-field">
                  <label class="inst-label">
                    <ng-icon name="lucideCalendar" size="14" />
                    Date fin
                  </label>
                  <input type="date" [(ngModel)]="newEnd" class="inst-input" />
                </div>
              </div>
              <div class="inst-field">
                <label class="inst-label">Délégations (séparées par virgule)</label>
                <input [(ngModel)]="newDelegations" placeholder="Tunis, Ariana, Sfax..." class="inst-input" />
              </div>
            </div>
            <div class="inst-modal-footer">
              <button class="inst-btn inst-btn--ghost" (click)="showCreate.set(false)">Annuler</button>
              <button class="inst-btn inst-btn--primary" (click)="createCampaign()">
                <ng-icon name="lucidePlus" size="16" />
                Créer
              </button>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="inst-skeleton-list">
          @for (i of [1, 2, 3]; track i) {
            <div class="sk sk-card"></div>
          }
        </div>
      } @else if (campaigns().length === 0) {
        <div class="inst-empty-state">
          <ng-icon name="lucideMegaphone" size="48" class="inst-empty-icon" />
          <p class="inst-empty-title">Aucune campagne</p>
          <p class="inst-empty-subtitle">Créez votre première campagne régionale.</p>
        </div>
      } @else {
        <div class="inst-card-list">
          @for (c of campaigns(); track c.id) {
            <div class="inst-card inst-card--campaign">
              <div class="inst-card-header">
                <div>
                  <div class="inst-card-meta">
                    <span class="status-pill"
                          [style.--pill-color]="statusColor(c.status)"
                          [style.--pill-bg]="statusBg(c.status)">
                      {{ c.status }}
                    </span>
                    <span class="inst-chip inst-chip--type">
                      {{ typeLabel(c.type) }}
                    </span>
                  </div>
                  <h3 class="inst-card-title">{{ c.title }}</h3>
                  <p class="inst-card-subtitle">
                    <ng-icon name="lucideTarget" size="14" />
                    {{ c.targetCropOrLivestock }}
                  </p>
                </div>
                <div class="inst-card-actions">
                  @if (c.status === 'PLANNED') {
                    <button class="inst-btn inst-btn--success" (click)="activate(c.id)">
                      <ng-icon name="lucidePlay" size="14" />
                      Activer
                    </button>
                  }
                  @if (c.status === 'ACTIVE') {
                    <button class="inst-btn inst-btn--violet" (click)="close(c.id)">
                      <ng-icon name="lucideSquare" size="14" />
                      Clôturer
                    </button>
                  }
                </div>
              </div>

              <div class="inst-kpi-grid">
                <div class="inst-kpi">
                  <ng-icon name="lucideCalendar" size="16" class="inst-kpi-icon" />
                  <p class="inst-kpi-label">Début</p>
                  <p class="inst-kpi-value">{{ c.startDate }}</p>
                </div>
                <div class="inst-kpi">
                  <ng-icon name="lucideCalendar" size="16" class="inst-kpi-icon" />
                  <p class="inst-kpi-label">Fin</p>
                  <p class="inst-kpi-value">{{ c.endDate }}</p>
                </div>
                <div class="inst-kpi">
                  <ng-icon name="lucideUsers" size="16" class="inst-kpi-icon" />
                  <p class="inst-kpi-label">Inscrits</p>
                  <p class="inst-kpi-value">{{ c.enrollments?.length ?? 0 }} / {{ c.targetParticipantsCount }}</p>
                </div>
              </div>

              <div class="inst-chip-list">
                @for (d of c.targetDelegations; track d) {
                  <span class="inst-chip inst-chip--delegation">{{ d }}</span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CrdaCampaignsComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  readonly lucideMegaphone = lucideMegaphone;
  readonly lucidePlus = lucidePlus;
  readonly lucidePlay = lucidePlay;
  readonly lucideSquare = lucideSquare;
  readonly lucideCalendar = lucideCalendar;
  readonly lucideUsers = lucideUsers;
  readonly lucideTarget = lucideTarget;
  readonly lucideX = lucideX;

  campaigns = signal<Campaign[]>([]);
  loading = signal(true);
  showCreate = signal(false);

  newTitle = '';
  newType = '';
  newCrop = '';
  newStart = '';
  newEnd = '';
  newDelegations = '';

  typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

  private get headers() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  private get institutionId(): string {
    return (this.authStore.currentUser() as any)?.institutionMember?.institutionId;
  }

  ngOnInit() { this.load(); }

  load() {
    this.http.get<Campaign[]>(`${environment.apiUrl}/crda/campaigns`, { headers: this.headers })
      .subscribe({ next: d => { this.campaigns.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  createCampaign() {
    if (!this.newTitle || !this.newType || !this.newStart || !this.newEnd) return;
    const body = {
      title: this.newTitle, type: this.newType, targetCropOrLivestock: this.newCrop,
      startDate: this.newStart, endDate: this.newEnd,
      targetDelegations: this.newDelegations.split(',').map(d => d.trim()).filter(Boolean),
    };
    this.http.post<Campaign>(`${environment.apiUrl}/crda/campaigns`, body, { headers: this.headers })
      .subscribe({ next: (c) => { this.campaigns.update(l => [c, ...l]); this.showCreate.set(false); this.resetForm(); } });
  }

  activate(id: string) {
    this.http.patch<Campaign>(`${environment.apiUrl}/crda/campaigns/${id}/activate`, {}, { headers: this.headers })
      .subscribe({ next: (c) => this.campaigns.update(l => l.map(x => x.id === c.id ? c : x)) });
  }

  close(id: string) {
    this.http.patch<Campaign>(`${environment.apiUrl}/crda/campaigns/${id}/close`, {}, { headers: this.headers })
      .subscribe({ next: (c) => this.campaigns.update(l => l.map(x => x.id === c.id ? c : x)) });
  }

  statusColor(s: string) { return STATUS_COLORS[s] || '#94a3b8'; }
  statusBg(s: string) { return STATUS_COLORS[s] ? STATUS_COLORS[s] + '22' : 'rgba(148,163,184,0.1)'; }
  typeLabel(t: string) { return TYPE_LABELS[t] || t; }

  private resetForm() {
    this.newTitle = ''; this.newType = ''; this.newCrop = '';
    this.newStart = ''; this.newEnd = ''; this.newDelegations = '';
  }
}
