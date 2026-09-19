import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import {
  lucideTarget,
  lucideMapPin,
  lucidePlus,
  lucidePencil,
  lucideTrash2,
  lucideX,
  lucideCheck,
  lucideCalendar,
  lucideFileText,
  lucideNavigation,
  lucideClock,
  lucideAlertTriangle,
  lucideCheckCircle2,
  lucideTimer,
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  actualDate?: string;
  status: 'ON_TRACK' | 'DELAYED' | 'AT_RISK' | 'DONE';
}

export interface FieldVisit {
  id: string;
  visitDate: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  reportText: string;
  outcome: string;
  photoUrls?: string[];
  agent?: { name: string };
}

const MILESTONE_STATUS: Record<
  Milestone['status'],
  { label: string; color: string; bg: string; icon: string }
> = {
  ON_TRACK: { label: 'En cours', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'lucideClock' },
  DONE:     { label: 'Termine', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: 'lucideCheckCircle2' },
  DELAYED:  { label: 'En retard', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: 'lucideTimer' },
  AT_RISK:  { label: 'A risque', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: 'lucideAlertTriangle' },
};

const OUTCOMES = ['CONFORME', 'NON_CONFORME', 'PARTIEL', 'EN_ATTENTE'];

@Component({
  selector: 'app-apia-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideTarget,
      lucideMapPin,
      lucidePlus,
      lucidePencil,
      lucideTrash2,
      lucideX,
      lucideCheck,
      lucideCalendar,
      lucideFileText,
      lucideNavigation,
      lucideClock,
      lucideAlertTriangle,
      lucideCheckCircle2,
      lucideTimer,
    }),
  ],
  template: `
    <div class="inst-page">
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--blue">
            <ng-icon name="lucideTarget" size="20"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Suivi des Projets Finances</h1>
            <p class="inst-header__sub">Jalons d'execution et rapports de visites terrain</p>
          </div>
        </div>
      </header>

      <div class="inst-grid">
        <!-- Milestones -->
        <div class="inst-card">
          <div class="inst-card__head">
            <h2 class="inst-card__title">
              <ng-icon name="lucideTarget"></ng-icon>
              Jalons de Realisation
            </h2>
            <button class="inst-btn inst-btn--primary" (click)="openAddMilestone()">
              <ng-icon name="lucidePlus" size="14"></ng-icon>
              Ajouter
            </button>
          </div>
          <div class="inst-card__body">
            @if (loadingMilestones()) {
              <div class="sk sk--h36 sk--full"></div>
              <div class="sk sk--h36 sk--full"></div>
              <div class="sk sk--h36 sk--full"></div>
            } @else if (milestones().length === 0) {
              <div class="inst-empty">
                <ng-icon name="lucideTarget"></ng-icon>
                <p class="inst-empty__title">Aucun jalon defini</p>
                <p class="inst-empty__desc">Ajoutez des jalons pour suivre l'avancement du projet</p>
              </div>
            } @else {
              <div class="milestone-list">
                @for (m of milestones(); track m.id) {
                  <div class="milestone-row">
                    <div class="milestone-row__info">
                      <p class="milestone-row__title">{{ m.title }}</p>
                      <div class="milestone-row__meta">
                        <span class="milestone-row__date">
                          <ng-icon name="lucideCalendar" size="12"></ng-icon>
                          {{ m.targetDate | date:'dd/MM/yyyy' }}
                        </span>
                        @if (m.actualDate) {
                          <span class="milestone-row__date milestone-row__date--done">
                            <ng-icon name="lucideCheck" size="12"></ng-icon>
                            {{ m.actualDate | date:'dd/MM/yyyy' }}
                          </span>
                        }
                      </div>
                      @if (m.description) {
                        <p class="milestone-row__desc">{{ m.description }}</p>
                      }
                    </div>
                    <div class="milestone-row__actions">
                      <button class="status-pill status-pill--clickable"
                              [style.background]="statusCfg(m.status).bg"
                              [style.color]="statusCfg(m.status).color"
                              (click)="openStatusModal(m)"
                              title="Mettre a jour le statut">
                        <span class="status-pill__dot"></span>
                        {{ statusCfg(m.status).label }}
                      </button>
                      <button class="icon-btn icon-btn--ghost" (click)="openEditMilestone(m)"
                              title="Modifier">
                        <ng-icon name="lucidePencil" size="14"></ng-icon>
                      </button>
                      <button class="icon-btn icon-btn--danger" (click)="openDeleteMilestone(m)"
                              title="Supprimer">
                        <ng-icon name="lucideTrash2" size="14"></ng-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Field Visits -->
        <div class="inst-card">
          <div class="inst-card__head">
            <h2 class="inst-card__title">
              <ng-icon name="lucideNavigation"></ng-icon>
              Visites Terrain
            </h2>
            <button class="inst-btn inst-btn--primary" (click)="openAddVisit()">
              <ng-icon name="lucidePlus" size="14"></ng-icon>
              Nouvelle Visite
            </button>
          </div>
          <div class="inst-card__body">
            @if (loadingVisits()) {
              <div class="sk sk--h36 sk--full"></div>
              <div class="sk sk--h36 sk--full"></div>
              <div class="sk sk--h36 sk--full"></div>
            } @else if (visits().length === 0) {
              <div class="inst-empty">
                <ng-icon name="lucideNavigation"></ng-icon>
                <p class="inst-empty__title">Aucune visite terrain</p>
                <p class="inst-empty__desc">Enregistrez les rapports de controle sur le terrain</p>
              </div>
            } @else {
              <div class="visit-list">
                @for (v of visits(); track v.id) {
                  <div class="visit-row">
                    <div class="visit-row__header">
                      <span class="visit-row__agent">{{ v.agent?.name || 'Agent Terrain' }}</span>
                      <span class="visit-row__date">{{ v.visitDate | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <p class="visit-row__report">{{ v.reportText }}</p>
                    <div class="visit-row__footer">
                      <span class="status-pill status-pill--emerald">{{ v.outcome }}</span>
                      @if (v.gpsLatitude) {
                        <span class="visit-row__gps">
                          <ng-icon name="lucideMapPin" size="12"></ng-icon>
                          {{ v.gpsLatitude }}, {{ v.gpsLongitude }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Add/Edit Milestone Modal -->
    @if (showMilestoneModal()) {
      <div class="inst-modal-backdrop" (click)="closeMilestoneModal()">
        <div class="inst-modal" (click)="$event.stopPropagation()">
          <div class="inst-modal__head">
            <h3>{{ editingMilestone() ? 'Modifier le Jalon' : 'Nouveau Jalon' }}</h3>
            <button class="inst-modal__close" (click)="closeMilestoneModal()">
              <ng-icon name="lucideX" size="16"></ng-icon>
            </button>
          </div>
          <div class="inst-modal__body">
            <div class="inst-field">
              <label>Titre</label>
              <input type="text" placeholder="Ex: Reception materiel d'irrigation"
                     [(ngModel)]="milestoneForm.title" />
            </div>
            <div class="inst-field">
              <label>Description (optionnel)</label>
              <textarea rows="3" placeholder="Details du jalon..."
                        [(ngModel)]="milestoneForm.description"></textarea>
            </div>
            <div class="inst-field">
              <label>Date cible</label>
              <input type="date" [(ngModel)]="milestoneForm.targetDate" />
            </div>
          </div>
          <div class="inst-modal__foot">
            <button class="inst-btn inst-btn--ghost" (click)="closeMilestoneModal()">Annuler</button>
            <button class="inst-btn inst-btn--primary" (click)="saveMilestone()"
                    [disabled]="saving() || !milestoneForm.title || !milestoneForm.targetDate">
              <ng-icon name="lucideCheck" size="14"></ng-icon>
              {{ editingMilestone() ? 'Enregistrer' : 'Creer' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Milestone Confirmation -->
    @if (showDeleteModal()) {
      <div class="inst-modal-backdrop" (click)="closeDeleteModal()">
        <div class="inst-modal" (click)="$event.stopPropagation()">
          <div class="inst-modal__head">
            <h3>Supprimer le jalon</h3>
            <button class="inst-modal__close" (click)="closeDeleteModal()">
              <ng-icon name="lucideX" size="16"></ng-icon>
            </button>
          </div>
          <div class="inst-modal__body">
            <p class="modal-text">
              Etes-vous sur de vouloir supprimer le jalon
              <strong>{{ deletingMilestone()?.title }}</strong> ?
              Cette action est irreversible.
            </p>
          </div>
          <div class="inst-modal__foot">
            <button class="inst-btn inst-btn--ghost" (click)="closeDeleteModal()">Annuler</button>
            <button class="inst-btn inst-btn--danger" (click)="confirmDeleteMilestone()"
                    [disabled]="saving()">
              <ng-icon name="lucideTrash2" size="14"></ng-icon>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Add Visit Modal -->
    @if (showVisitModal()) {
      <div class="inst-modal-backdrop" (click)="closeVisitModal()">
        <div class="inst-modal" (click)="$event.stopPropagation()">
          <div class="inst-modal__head">
            <h3>Nouvelle Visite Terrain</h3>
            <button class="inst-modal__close" (click)="closeVisitModal()">
              <ng-icon name="lucideX" size="16"></ng-icon>
            </button>
          </div>
          <div class="inst-modal__body">
            <div class="inst-field">
              <label>Rapport de visite</label>
              <textarea rows="5" placeholder="Decrivez les observations du terrain..."
                        [(ngModel)]="visitForm.reportText"></textarea>
            </div>
            <div class="inst-field">
              <label>Resultat</label>
              <select [(ngModel)]="visitForm.outcome">
                <option value="" disabled>Selectionner un resultat</option>
                @for (o of outcomes; track o) {
                  <option [value]="o">{{ o }}</option>
                }
              </select>
            </div>
            <div class="coords-row">
              <div class="inst-field coords-row__field">
                <label>Latitude</label>
                <input type="number" step="any" placeholder="36.8065"
                       [(ngModel)]="visitForm.gpsLatitude" />
              </div>
              <div class="inst-field coords-row__field">
                <label>Longitude</label>
                <input type="number" step="any" placeholder="10.1815"
                       [(ngModel)]="visitForm.gpsLongitude" />
              </div>
            </div>
          </div>
          <div class="inst-modal__foot">
            <button class="inst-btn inst-btn--ghost" (click)="closeVisitModal()">Annuler</button>
            <button class="inst-btn inst-btn--primary" (click)="saveVisit()"
                    [disabled]="saving() || !visitForm.reportText || !visitForm.outcome">
              <ng-icon name="lucideCheck" size="14"></ng-icon>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Status Update Modal -->
    @if (showStatusModal()) {
      <div class="inst-modal-backdrop" (click)="closeStatusModal()">
        <div class="inst-modal" (click)="$event.stopPropagation()">
          <div class="inst-modal__head">
            <h3>Mettre a jour le statut</h3>
            <button class="inst-modal__close" (click)="closeStatusModal()">
              <ng-icon name="lucideX" size="16"></ng-icon>
            </button>
          </div>
          <div class="inst-modal__body">
            <p class="modal-text">
              Jalon : <strong>{{ statusTarget()?.title }}</strong>
            </p>
            <div class="status-grid">
              @for (s of statusKeys; track s) {
                <button class="status-option"
                        [class.status-option--active]="statusTarget()?.status === s"
                        [style.--opt-color]="statusCfg(s).color"
                        [style.--opt-bg]="statusCfg(s).bg"
                        (click)="updateStatus(s)">
                  <ng-icon [name]="statusCfg(s).icon" size="18"></ng-icon>
                  <span>{{ statusCfg(s).label }}</span>
                </button>
              }
            </div>
          </div>
          <div class="inst-modal__foot">
            <button class="inst-btn inst-btn--ghost" (click)="closeStatusModal()">Fermer</button>
          </div>
        </div>
      </div>
    }

  </div>
  `,
  styles: [`
    .milestone-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .milestone-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg-secondary);
      transition: border-color 0.2s;
    }

    .milestone-row:hover {
      border-color: color-mix(in srgb, var(--zir-blue, #3b82f6) 30%, transparent);
    }

    .milestone-row__info {
      flex: 1;
      min-width: 0;
    }

    .milestone-row__title {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .milestone-row__meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }

    .milestone-row__date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .milestone-row__date--done {
      color: var(--zir-emerald, #10b981);
    }

    .milestone-row__desc {
      margin: 6px 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .milestone-row__actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .status-pill--clickable {
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .status-pill--clickable:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .icon-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .icon-btn--ghost:hover {
      border-color: var(--zir-blue, #3b82f6);
      color: var(--zir-blue, #3b82f6);
      background: rgba(59, 130, 246, 0.08);
    }

    .icon-btn--danger:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
    }

    .visit-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .visit-row {
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--bg-secondary);
    }

    .visit-row__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .visit-row__agent {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .visit-row__date {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: monospace;
    }

    .visit-row__report {
      margin: 8px 0 0;
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .visit-row__footer {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }

    .visit-row__gps {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: monospace;
    }

    .coords-row {
      display: flex;
      gap: 12px;
    }

    .coords-row__field {
      flex: 1;
    }

    .modal-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .status-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .status-option:hover {
      border-color: var(--opt-color);
      background: var(--opt-bg);
      color: var(--opt-color);
    }

    .status-option--active {
      border-color: var(--opt-color);
      background: var(--opt-bg);
      color: var(--opt-color);
      box-shadow: 0 0 0 1px var(--opt-color);
    }

    @media (max-width: 768px) {
      .milestone-row {
        flex-direction: column;
      }
      .milestone-row__actions {
        width: 100%;
        justify-content: flex-end;
      }
      .coords-row {
        flex-direction: column;
        gap: 10px;
      }
      .status-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ApiaProjectsComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  readonly outcomes = OUTCOMES;
  readonly statusKeys: Milestone['status'][] = ['ON_TRACK', 'DONE', 'DELAYED', 'AT_RISK'];

  milestones = signal<Milestone[]>([]);
  visits = signal<FieldVisit[]>([]);
  loadingMilestones = signal(true);
  loadingVisits = signal(true);
  saving = signal(false);

  showMilestoneModal = signal(false);
  editingMilestone = signal<Milestone | null>(null);
  milestoneForm = { title: '', description: '', targetDate: '' };

  showDeleteModal = signal(false);
  deletingMilestone = signal<Milestone | null>(null);

  showVisitModal = signal(false);
  visitForm = { reportText: '', outcome: '', gpsLatitude: null as number | null, gpsLongitude: null as number | null };

  showStatusModal = signal(false);
  statusTarget = signal<Milestone | null>(null);

  private get dossierId(): string | null {
    return (this.authStore.currentUser() as any)?.institutionMember?.dossierId ?? null;
  }

  private get authHeaders() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  statusCfg(status: Milestone['status']) {
    return MILESTONE_STATUS[status] || MILESTONE_STATUS.ON_TRACK;
  }

  ngOnInit() {
    this.loadMilestones();
    this.loadVisits();
  }

  loadMilestones() {
    const id = this.dossierId;
    if (!id) { this.loadingMilestones.set(false); return; }
    this.loadingMilestones.set(true);
    this.http.get<Milestone[]>(
      `${environment.apiUrl}/dossiers/projects/${id}/milestones`,
      { headers: this.authHeaders }
    ).subscribe({
      next: (data) => { this.milestones.set(data); this.loadingMilestones.set(false); },
      error: () => this.loadingMilestones.set(false),
    });
  }

  loadVisits() {
    const id = this.dossierId;
    if (!id) { this.loadingVisits.set(false); return; }
    this.loadingVisits.set(true);
    this.http.get<FieldVisit[]>(
      `${environment.apiUrl}/dossiers/projects/${id}/visits`,
      { headers: this.authHeaders }
    ).subscribe({
      next: (data) => { this.visits.set(data); this.loadingVisits.set(false); },
      error: () => this.loadingVisits.set(false),
    });
  }

  openAddMilestone() {
    this.editingMilestone.set(null);
    this.milestoneForm = { title: '', description: '', targetDate: '' };
    this.showMilestoneModal.set(true);
  }

  openEditMilestone(m: Milestone) {
    this.editingMilestone.set(m);
    this.milestoneForm = {
      title: m.title,
      description: m.description || '',
      targetDate: m.targetDate?.split('T')[0] || '',
    };
    this.showMilestoneModal.set(true);
  }

  closeMilestoneModal() {
    this.showMilestoneModal.set(false);
    this.editingMilestone.set(null);
  }

  saveMilestone() {
    const id = this.dossierId;
    if (!id) return;
    this.saving.set(true);
    const editing = this.editingMilestone();
    const body = {
      title: this.milestoneForm.title,
      description: this.milestoneForm.description || undefined,
      targetDate: this.milestoneForm.targetDate,
    };

    if (editing) {
      this.http.patch<Milestone>(
        `${environment.apiUrl}/dossiers/milestones/${editing.id}`,
        body,
        { headers: this.authHeaders }
      ).subscribe({
        next: () => { this.loadMilestones(); this.closeMilestoneModal(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    } else {
      this.http.post<Milestone>(
        `${environment.apiUrl}/dossiers/projects/${id}/milestones`,
        body,
        { headers: this.authHeaders }
      ).subscribe({
        next: () => { this.loadMilestones(); this.closeMilestoneModal(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    }
  }

  openDeleteMilestone(m: Milestone) {
    this.deletingMilestone.set(m);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deletingMilestone.set(null);
  }

  confirmDeleteMilestone() {
    const m = this.deletingMilestone();
    if (!m) return;
    this.saving.set(true);
    this.http.delete(
      `${environment.apiUrl}/dossiers/milestones/${m.id}`,
      { headers: this.authHeaders }
    ).subscribe({
      next: () => { this.loadMilestones(); this.closeDeleteModal(); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }

  openStatusModal(m: Milestone) {
    this.statusTarget.set(m);
    this.showStatusModal.set(true);
  }

  closeStatusModal() {
    this.showStatusModal.set(false);
    this.statusTarget.set(null);
  }

  updateStatus(status: Milestone['status']) {
    const m = this.statusTarget();
    if (!m) return;
    this.http.patch<Milestone>(
      `${environment.apiUrl}/dossiers/milestones/${m.id}`,
      {
        status,
        actualDate: status === 'DONE' ? new Date().toISOString() : undefined,
      },
      { headers: this.authHeaders }
    ).subscribe({
      next: () => { this.loadMilestones(); this.closeStatusModal(); },
    });
  }

  openAddVisit() {
    this.visitForm = { reportText: '', outcome: '', gpsLatitude: null, gpsLongitude: null };
    this.showVisitModal.set(true);
  }

  closeVisitModal() {
    this.showVisitModal.set(false);
  }

  saveVisit() {
    const id = this.dossierId;
    if (!id) return;
    this.saving.set(true);
    const body: any = {
      reportText: this.visitForm.reportText,
      outcome: this.visitForm.outcome,
    };
    if (this.visitForm.gpsLatitude != null) body.gpsLatitude = this.visitForm.gpsLatitude;
    if (this.visitForm.gpsLongitude != null) body.gpsLongitude = this.visitForm.gpsLongitude;

    this.http.post<FieldVisit>(
      `${environment.apiUrl}/dossiers/projects/${id}/visits`,
      body,
      { headers: this.authHeaders }
    ).subscribe({
      next: () => { this.loadVisits(); this.closeVisitModal(); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }
}

