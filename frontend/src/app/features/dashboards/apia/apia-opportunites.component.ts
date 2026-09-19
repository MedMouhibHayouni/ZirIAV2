import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMegaphone, lucidePlus, lucidePencil, lucideTrash2,
  lucideX, lucideCheck, lucideSend, lucideCalendar,
  lucidePercent, lucideTag, lucideFilter, lucideGlobe
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface ProjectCall {
  id: string;
  title: string;
  sector: string;
  deadline: string;
  grantRate: string;
  description: string;
  publishedToZirFeed: boolean;
  createdAt?: string;
}

interface CallForm {
  title: string;
  sector: string;
  deadline: string;
  grantRate: string;
  description: string;
  publishedToZirFeed: boolean;
}

const EMPTY_FORM: CallForm = {
  title: '',
  sector: '',
  deadline: '',
  grantRate: '',
  description: '',
  publishedToZirFeed: false,
};

const SECTORS = [
  'Irrigation Économe',
  'Agro-industrie',
  'Oleiculture',
  'Elevage',
  'Maraîchage',
  'Apiculture',
  'Aquaculture',
  'Horticulture',
];

@Component({
  selector: 'app-apia-opportunites',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideMegaphone, lucidePlus, lucidePencil, lucideTrash2,
    lucideX, lucideCheck, lucideSend, lucideCalendar,
    lucidePercent, lucideTag, lucideFilter, lucideGlobe
  })],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon">
            <ng-icon name="lucideMegaphone"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Opportunites Regionales & Appels a Projets</h1>
            <p class="inst-header__sub">Diffusion d'appels a projets cibles vers le flux communautaire ZirFeed</p>
          </div>
        </div>
        <button class="inst-btn inst-btn--primary" (click)="openCreateModal()">
          <ng-icon name="lucidePlus" style="font-size:14px"></ng-icon>
          Lancer un Appel
        </button>
      </header>

      <!-- Sector Filters -->
      <div class="inst-filters">
        <button class="inst-chip" [class.inst-chip--active]="activeSector() === ''"
                (click)="setSectorFilter('')">
          <ng-icon name="lucideFilter" style="font-size:12px"></ng-icon>
          Tous
        </button>
        @for (s of sectors; track s) {
          <button class="inst-chip" [class.inst-chip--active]="activeSector() === s"
                  (click)="setSectorFilter(s)">
            {{ s }}
          </button>
        }
      </div>

      <!-- Skeleton Loading -->
      @if (loading()) {
        <div class="calls-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="inst-card">
              <div class="sk sk--h20 sk--full" style="margin-bottom:12px"></div>
              <div class="sk sk--h14 sk--w60" style="margin-bottom:8px"></div>
              <div class="sk sk--h14 sk--full" style="margin-bottom:6px"></div>
              <div class="sk sk--h14 sk--w80" style="margin-bottom:16px"></div>
              <div class="sk sk--h10 sk--w40"></div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && filteredCalls().length === 0) {
        <div class="inst-empty">
          <ng-icon name="lucideMegaphone"></ng-icon>
          <p class="inst-empty__title">Aucun appel a projets</p>
          <p class="inst-empty__desc">Creez votre premier appel a projets pour le diffuser aux exploitants.</p>
        </div>
      }

      <!-- Calls Grid -->
      @if (!loading() && filteredCalls().length > 0) {
        <div class="calls-grid">
          @for (c of filteredCalls(); track c.id) {
            <div class="call-card inst-card">
              <div class="call-card__top">
                <span class="inst-chip inst-chip--small">
                  <ng-icon name="lucideTag" style="font-size:11px"></ng-icon>
                  {{ c.sector }}
                </span>
                @if (c.publishedToZirFeed) {
                  <span class="status-pill" style="background:rgba(16,185,129,0.12);color:var(--zir-emerald)">
                    <ng-icon name="lucideGlobe" style="font-size:10px"></ng-icon>
                    Publie
                  </span>
                } @else {
                  <span class="status-pill" style="background:rgba(148,163,184,0.12);color:var(--text-muted)">
                    Brouillon
                  </span>
                }
              </div>

              <h3 class="call-card__title">{{ c.title }}</h3>
              <p class="call-card__desc">{{ c.description }}</p>

              <div class="call-card__meta">
                <span class="call-card__meta-item">
                  <ng-icon name="lucideCalendar" style="font-size:12px"></ng-icon>
                  {{ c.deadline }}
                </span>
                <span class="call-card__meta-item">
                  <ng-icon name="lucidePercent" style="font-size:12px"></ng-icon>
                  {{ c.grantRate }}
                </span>
              </div>

              <div class="call-card__actions">
                <button class="inst-btn inst-btn--ghost inst-btn--sm"
                        (click)="togglePublish(c)"
                        [title]="c.publishedToZirFeed ? 'Retirer de ZirFeed' : 'Publier sur ZirFeed'">
                  @if (c.publishedToZirFeed) {
                    <ng-icon name="lucideX" style="font-size:13px"></ng-icon>
                    Retirer
                  } @else {
                    <ng-icon name="lucideSend" style="font-size:13px"></ng-icon>
                    Publier
                  }
                </button>
                <button class="inst-btn inst-btn--ghost inst-btn--sm"
                        (click)="openEditModal(c)">
                  <ng-icon name="lucidePencil" style="font-size:13px"></ng-icon>
                  Modifier
                </button>
                <button class="inst-btn inst-btn--ghost inst-btn--sm inst-btn--danger"
                        (click)="confirmDelete(c)">
                  <ng-icon name="lucideTrash2" style="font-size:13px"></ng-icon>
                  Supprimer
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Create / Edit Modal -->
      @if (showFormModal()) {
        <div class="inst-modal-backdrop" (click)="closeFormModal()">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>{{ editingCall() ? 'Modifier l\'Appel' : 'Nouvel Appel a Projets' }}</h3>
              <button class="inst-modal__close" (click)="closeFormModal()">
                <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <div class="inst-field">
                <label>Titre de l'appel</label>
                <input type="text" [(ngModel)]="form.title"
                       placeholder="Ex: Appel d'Offre Irrigation Kasserine 2026" />
              </div>

              <div class="inst-field">
                <label>Filiere</label>
                <select [(ngModel)]="form.sector">
                  <option value="" disabled>Choisir une filiere</option>
                  @for (s of sectors; track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>

              <div class="inst-field-row">
                <div class="inst-field">
                  <label>
                    <ng-icon name="lucideCalendar" style="font-size:12px"></ng-icon>
                    Date de cloture
                  </label>
                  <input type="date" [(ngModel)]="form.deadline" />
                </div>
                <div class="inst-field">
                  <label>
                    <ng-icon name="lucidePercent" style="font-size:12px"></ng-icon>
                    Taux de subvention
                  </label>
                  <input type="text" [(ngModel)]="form.grantRate"
                         placeholder="Ex: Jusqu'a 50%" />
                </div>
              </div>

              <div class="inst-field">
                <label>Description</label>
                <textarea rows="4" [(ngModel)]="form.description"
                          placeholder="Decrivez les objectifs, conditions d'eligibilite, pieces a fournir..."></textarea>
              </div>

              <div class="inst-field">
                <label class="toggle-label">
                  <span class="toggle-switch" [class.toggle-switch--on]="form.publishedToZirFeed"
                        (click)="form.publishedToZirFeed = !form.publishedToZirFeed">
                    <span class="toggle-switch__thumb"></span>
                  </span>
                  Publier immediatement sur ZirFeed
                </label>
              </div>
            </div>
            <div class="inst-modal__foot">
              <button class="inst-btn inst-btn--ghost" (click)="closeFormModal()">Annuler</button>
              <button class="inst-btn inst-btn--primary"
                      [disabled]="!form.title || !form.sector"
                      (click)="saveCall()">
                <ng-icon name="lucideCheck" style="font-size:14px"></ng-icon>
                {{ editingCall() ? 'Enregistrer' : 'Creer l\'Appel' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingCall()) {
        <div class="inst-modal-backdrop" (click)="deletingCall.set(null)">
          <div class="inst-modal inst-modal--sm" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>Confirmer la suppression</h3>
              <button class="inst-modal__close" (click)="deletingCall.set(null)">
                <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <p class="confirm-text">
                Voulez-vous vraiment supprimer l'appel
                <strong>"{{ deletingCall()!.title }}"</strong> ?
                Cette action est irreversible.
              </p>
            </div>
            <div class="inst-modal__foot">
              <button class="inst-btn inst-btn--ghost" (click)="deletingCall.set(null)">Annuler</button>
              <button class="inst-btn inst-btn--danger" (click)="deleteCall()">
                <ng-icon name="lucideTrash2" style="font-size:14px"></ng-icon>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .calls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }

    .call-card {
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
    }

    .call-card:hover {
      border-color: color-mix(in srgb, var(--zir-emerald) 30%, transparent);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .call-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .call-card__title {
      margin: 0 0 8px;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .call-card__desc {
      margin: 0 0 14px;
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .call-card__meta {
      display: flex;
      gap: 16px;
      margin-bottom: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .call-card__meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .call-card__actions {
      display: flex;
      gap: 6px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .inst-btn--sm {
      padding: 5px 10px;
      font-size: 0.72rem;
    }

    .inst-btn--danger {
      color: #ef4444;
    }

    .inst-btn--danger:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .inst-field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .inst-modal--sm {
      max-width: 420px;
    }

    textarea {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.82rem;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }

    textarea:focus {
      outline: none;
      border-color: var(--zir-emerald);
    }

    select {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.82rem;
      font-family: inherit;
      box-sizing: border-box;
    }

    select:focus {
      outline: none;
      border-color: var(--zir-emerald);
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-primary);
      font-weight: 500;
    }

    .toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
      border-radius: 11px;
      background: var(--border);
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .toggle-switch--on {
      background: var(--zir-emerald);
    }

    .toggle-switch__thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
    }

    .toggle-switch--on .toggle-switch__thumb {
      transform: translateX(18px);
    }

    .confirm-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .confirm-text strong {
      color: var(--text-primary);
    }

    .sk {
      border-radius: 8px;
      background: var(--bg-secondary);
    }

    .sk--full { width: 100%; }
    .sk--w80 { width: 80%; }
    .sk--w60 { width: 60%; }
    .sk--w40 { width: 40%; }
    .sk--h20 { height: 20px; }
    .sk--h14 { height: 14px; }
    .sk--h10 { height: 10px; }

    .inst-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 80px 24px;
      text-align: center;
      color: var(--text-muted);
    }

    .inst-empty ng-icon {
      width: 40px;
      height: 40px;
      opacity: 0.3;
    }

    .inst-empty__title {
      margin: 0;
      font-weight: 700;
      color: var(--text-primary);
    }

    .inst-empty__desc {
      margin: 0;
      font-size: 0.78rem;
      max-width: 320px;
    }

    .inst-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }

    .inst-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .inst-chip:hover {
      border-color: var(--zir-emerald);
      color: var(--text-primary);
    }

    .inst-chip--active {
      background: rgba(16, 185, 129, 0.12);
      border-color: var(--zir-emerald);
      color: var(--zir-emerald);
    }

    .inst-chip--small {
      padding: 3px 10px;
      font-size: 0.7rem;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 600;
    }
  `]
})
export class ApiaOpportunitesComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  calls = signal<ProjectCall[]>([]);
  loading = signal(true);
  activeSector = signal('');

  showFormModal = signal(false);
  editingCall = signal<ProjectCall | null>(null);
  deletingCall = signal<ProjectCall | null>(null);

  form: CallForm = { ...EMPTY_FORM };
  sectors = SECTORS;

  private get authHeaders() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  private get apiUrl() {
    return `${environment.apiUrl}/institutions/project-calls`;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http.get<ProjectCall[]>(this.apiUrl, { headers: this.authHeaders }).subscribe({
      next: (data) => { this.calls.set(data); this.loading.set(false); },
      error: () => { this.calls.set([]); this.loading.set(false); },
    });
  }

  filteredCalls(): ProjectCall[] {
    const sector = this.activeSector();
    if (!sector) return this.calls();
    return this.calls().filter(c => c.sector === sector);
  }

  setSectorFilter(sector: string) {
    this.activeSector.set(sector);
  }

  openCreateModal() {
    this.editingCall.set(null);
    this.form = { ...EMPTY_FORM, publishedToZirFeed: false };
    this.showFormModal.set(true);
  }

  openEditModal(call: ProjectCall) {
    this.editingCall.set(call);
    this.form = {
      title: call.title,
      sector: call.sector,
      deadline: call.deadline,
      grantRate: call.grantRate,
      description: call.description,
      publishedToZirFeed: call.publishedToZirFeed,
    };
    this.showFormModal.set(true);
  }

  closeFormModal() {
    this.showFormModal.set(false);
    this.editingCall.set(null);
  }

  saveCall() {
    const editing = this.editingCall();
    if (editing) {
      this.http.patch<ProjectCall>(
        `${this.apiUrl}/${editing.id}`,
        this.form,
        { headers: this.authHeaders }
      ).subscribe({
        next: () => { this.closeFormModal(); this.load(); },
      });
    } else {
      this.http.post<ProjectCall>(
        this.apiUrl,
        this.form,
        { headers: this.authHeaders }
      ).subscribe({
        next: () => { this.closeFormModal(); this.load(); },
      });
    }
  }

  togglePublish(call: ProjectCall) {
    this.http.patch<ProjectCall>(
      `${this.apiUrl}/${call.id}`,
      { publishedToZirFeed: !call.publishedToZirFeed },
      { headers: this.authHeaders }
    ).subscribe({
      next: () => this.load(),
    });
  }

  confirmDelete(call: ProjectCall) {
    this.deletingCall.set(call);
  }

  deleteCall() {
    const call = this.deletingCall();
    if (!call) return;
    this.http.delete(`${this.apiUrl}/${call.id}`, { headers: this.authHeaders }).subscribe({
      next: () => { this.deletingCall.set(null); this.load(); },
    });
  }
}
