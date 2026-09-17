import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    lucideUsers, lucidePlus, lucideX, lucideClock, lucideCheckCircle, lucideStar,
    lucideMapPin, lucideCalendar, lucideDollarSign, lucideEye, lucideThumbsUp,
    lucideMessageSquare, lucideSend, lucideBriefcase, lucideHome, lucideUtensils,
    lucideBus, lucideStickyNote, lucideChevronRight, lucideUserCheck, lucideRepeat,
    lucidePenLine, lucidePhone, lucideCheck,
  } from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';
import { MissionNegotiationComponent } from '../shared/mission-negotiation.component';

interface JobOffer {
  id: string;
  task_type: string;
  description: string;
  start_date: string;
  duration_days: number;
  daily_pay_tnd: number;
  workers_needed: number;
  governorate: string;
  accommodation_provided: boolean;
  meals_provided: boolean;
  transport_provided: boolean;
  notes: string;
  status: 'OPEN' | 'FILLED' | 'CLOSED';
  applications_count: number;
  contract_id: string | null;
  created_at: string;
}

interface JobApplication {
  id: string;
  offer_id: string;
  worker_id: string;
  worker_profile_id: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string | null;
    governorate: string;
    rating: number;
  };
  competencies?: string[];
  proposed_daily_rate_tnd: number;
  cover_message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

interface WorkerPublicProfile {
  profile: {
    id: string;
    user_id: string;
    name: string | null;
    phone: string | null;
    governorate: string;
    skills: string[];
    rating: number;
    total_jobs_done: number;
    bio: string | null;
    daily_rate_tnd: number;
    is_available: boolean;
  };
  certifications: Array<{
    id: string;
    certification_name: string;
    issuing_organization: string;
    issued_date: string;
    document_url: string | null;
  }>;
  ratings: Array<{
    application_id: string;
    task_type: string;
    employer_name: string;
    rating: number;
    notes: string;
    mission_date: string;
  }>;
}

interface TrustedWorker {
  id: string;
  user_id: string;
  name: string;
  rating: number;
  missions_count: number;
  phone: string;
  governorate: string;
}

@Component({
  selector: 'app-farmer-services-labour',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, MissionNegotiationComponent],
  providers: [provideIcons({
    lucideUsers, lucidePlus, lucideX, lucideClock, lucideCheckCircle, lucideStar,
    lucideMapPin, lucideCalendar, lucideDollarSign, lucideEye, lucideThumbsUp,
    lucideMessageSquare, lucideSend, lucideBriefcase, lucideHome, lucideUtensils,
    lucideBus, lucideStickyNote, lucideChevronRight, lucideUserCheck, lucideRepeat,
    lucidePenLine, lucidePhone, lucideCheck,
  })],
  template: `
    <div class="page">
      <div class="page-top">
        <h2><ng-icon name="lucideUsers"></ng-icon> Services & Main-d'œuvre</h2>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'offers'" (click)="switchTab('offers')">
          Mes Offres
        </button>
        <button class="tab" [class.active]="activeTab() === 'create'" (click)="switchTab('create')">
          Publier une Offre
        </button>
        <button class="tab" [class.active]="activeTab() === 'trusted'" (click)="switchTab('trusted')">
          Mes Travailleurs de Confiance
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon active-icon"><ng-icon name="lucideBriefcase"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().active }}</span>
            <span class="stat-label">Offres actives</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending-icon"><ng-icon name="lucideClock"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().pending }}</span>
            <span class="stat-label">Candidatures en attente</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed-icon"><ng-icon name="lucideCheckCircle"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().filled }}</span>
            <span class="stat-label">Offres pourvues</span>
          </div>
        </div>
      </div>

      <!-- Tab 1: Mes Offres -->
      @if (activeTab() === 'offers') {
        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (offers().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideUsers" class="empty-icon"></ng-icon>
            <h3>Aucune offre d'emploi</h3>
            <p>Publiez votre première offre pour trouver des travailleurs agricoles</p>
            <button class="btn btn-primary" (click)="switchTab('create')">
              <ng-icon name="lucidePlus"></ng-icon> Publier une offre
            </button>
          </div>
        } @else {
          <div class="offer-list">
            @for (o of offers(); track o.id) {
              <div class="offer-card" [class.open]="o.status === 'OPEN'" [class.selected]="selectedOffer()?.id === o.id"
                (click)="selectOffer(o)">
                <div class="offer-header">
                  <div class="offer-title-row">
                    <span class="offer-task-icon">
                      @switch (o.task_type) {
                        @case ('Récolte') { <ng-icon name="lucideCalendar"></ng-icon> }
                        @case ('Plantation') { <ng-icon name="lucideHome"></ng-icon> }
                        @default { <ng-icon name="lucideBriefcase"></ng-icon> }
                      }
                    </span>
                    <span class="offer-title">{{ o.task_type }}</span>
                  </div>
                  <span class="offer-badge" [class.open]="o.status === 'OPEN'"
                    [class.filled]="o.status === 'FILLED'"
                    [class.closed]="o.status === 'CLOSED'">
                    {{ o.status === 'OPEN' ? 'Ouverte' : o.status === 'FILLED' ? 'Pourvue' : 'Clôturée' }}
                  </span>
                </div>
                <div class="offer-meta">
                  <span><ng-icon name="lucideDollarSign"></ng-icon> {{ o.daily_pay_tnd }} TND/jour</span>
                  <span><ng-icon name="lucideCalendar"></ng-icon> {{ o.duration_days }} jours</span>
                  <span><ng-icon name="lucideMapPin"></ng-icon> {{ o.governorate }}</span>
                  <span><ng-icon name="lucideUsers"></ng-icon> {{ o.workers_needed }} postes</span>
                </div>
                <div class="offer-facilities">
                  @if (o.accommodation_provided) {
                    <span class="facility-badge"><ng-icon name="lucideHome"></ng-icon> Hébergement</span>
                  }
                  @if (o.meals_provided) {
                    <span class="facility-badge"><ng-icon name="lucideUtensils"></ng-icon> Repas</span>
                  }
                  @if (o.transport_provided) {
                    <span class="facility-badge"><ng-icon name="lucideBus"></ng-icon> Transport</span>
                  }
                </div>
                @if (o.applications_count > 0) {
                  <div class="offer-applicants">
                    <ng-icon name="lucideEye"></ng-icon>
                    {{ o.applications_count }} candidature(s)
                  </div>
                }
                <div class="offer-actions">
                  @if (o.status === 'OPEN') {
                    <button class="btn-sm danger" (click)="$event.stopPropagation(); closeOffer(o.id)">Clôturer</button>
                  } @else if (o.status === 'CLOSED') {
                    <button class="btn-sm" (click)="$event.stopPropagation(); reopenOffer(o.id)">Réouvrir</button>
                  }
                  <button class="btn-sm danger" (click)="$event.stopPropagation(); deleteOffer(o.id)">Supprimer</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Tab 2: Publier une Offre -->
      @if (activeTab() === 'create') {
        <div class="form-panel">
          <h3><ng-icon name="lucidePlus"></ng-icon> Publier une nouvelle offre</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Type de tâche</label>
              <select [(ngModel)]="createForm.task_type" class="form-el">
                @for (t of TASK_TYPES; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>Gouvernorat</label>
              <input type="text" [(ngModel)]="createForm.governorate" class="form-el" placeholder="Ex: Sousse" />
            </div>
            <div class="form-group full-width">
              <label>Description</label>
              <textarea [(ngModel)]="createForm.description" class="form-el" rows="3"
                placeholder="Décrivez les tâches à effectuer, les conditions de travail..."></textarea>
            </div>
            <div class="form-group">
              <label>Date de début</label>
              <input type="date" [(ngModel)]="createForm.start_date" class="form-el" />
            </div>
            <div class="form-group">
              <label>Durée (jours)</label>
              <input type="number" [(ngModel)]="createForm.duration_days" class="form-el" min="1" placeholder="Ex: 10" />
            </div>
            <div class="form-group">
              <label>Salaire journalier (TND)</label>
              <input type="number" [(ngModel)]="createForm.daily_pay_tnd" class="form-el" min="10" placeholder="Ex: 35" />
            </div>
            <div class="form-group">
              <label>Travailleurs nécessaires</label>
              <input type="number" [(ngModel)]="createForm.workers_needed" class="form-el" min="1" placeholder="Ex: 4" />
            </div>
            <div class="form-group full-width">
              <label>Prestations incluses</label>
              <div class="toggles-row">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="createForm.accommodation_provided" class="toggle-input" />
                  <span class="toggle-switch"></span>
                  <ng-icon name="lucideHome"></ng-icon> Hébergement
                </label>
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="createForm.meals_provided" class="toggle-input" />
                  <span class="toggle-switch"></span>
                  <ng-icon name="lucideUtensils"></ng-icon> Repas
                </label>
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="createForm.transport_provided" class="toggle-input" />
                  <span class="toggle-switch"></span>
                  <ng-icon name="lucideBus"></ng-icon> Transport
                </label>
              </div>
            </div>
            <div class="form-group full-width">
              <label>Notes supplémentaires</label>
              <textarea [(ngModel)]="createForm.notes" class="form-el" rows="2"
                placeholder="Informations complémentaires pour les candidats..."></textarea>
            </div>
          </div>
          <button class="btn btn-primary btn-submit" (click)="submitOffer()"
            [disabled]="submitting() || !createForm.task_type || !createForm.start_date || !createForm.governorate">
            @if (submitting()) {
              <span class="spinner-sm"></span> Publication...
            } @else {
              <ng-icon name="lucideSend"></ng-icon> Publier l'offre
            }
          </button>
        </div>
      }

      <!-- Tab 3: Mes Travailleurs de Confiance -->
      @if (activeTab() === 'trusted') {
        @if (loadingTrusted()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (trustedWorkers().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideUserCheck" class="empty-icon"></ng-icon>
            <h3>Aucun travailleur de confiance</h3>
            <p>Les travailleurs avec qui vous avez collaboré avec succès apparaîtront ici</p>
          </div>
        } @else {
          <div class="trusted-list">
            @for (w of trustedWorkers(); track w.id) {
              <div class="trusted-card">
                <div class="trusted-avatar">{{ w.name.charAt(0) || '?' }}</div>
                <div class="trusted-info">
                  <strong>{{ w.name }}</strong>
                  <div class="trusted-meta">
                    <span class="trusted-rating">
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="star-filled" [class.empty]="s > w.rating">★</span>
                      }
                      <span class="rating-value">{{ w.rating.toFixed(1) || '—' }}</span>
                    </span>
                    <span class="trusted-missions">{{ w.missions_count }} mission(s)</span>
                    <span class="trusted-location"><ng-icon name="lucideMapPin"></ng-icon> {{ w.governorate }}</span>
                  </div>
                </div>
                <button class="btn-sm primary" (click)="reengageWorker(w)">
                  <ng-icon name="lucideRepeat"></ng-icon> Réengager
                </button>
              </div>
            }
          </div>
        }
      }

      <!-- Candidatures Panel (slide-in) -->
      @if (selectedOffer()) {
        <div class="detail-backdrop" (click)="selectedOffer.set(null); applications.set([])"></div>
        <div class="detail-panel">
          <div class="detail-header">
            <div class="detail-header-left">
              <div class="detail-header-icon"><ng-icon name="lucideUsers"></ng-icon></div>
              <div>
                <h3>Candidatures</h3>
                <div class="detail-header-sub">{{ selectedOffer()!.task_type }} · {{ applications().length }} postulant(s)</div>
              </div>
            </div>
            <button class="close-btn" (click)="selectedOffer.set(null); applications.set([])"><ng-icon name="lucideX"></ng-icon></button>
          </div>
          <div class="detail-body">
            @if (loadingApplications()) {
              <div class="sheet-skeleton">
                <div class="sk-head"><div class="sk-avatar sk"></div><div class="sk-lines"><div class="sk sk--w60"></div><div class="sk sk--w80"></div></div></div>
                <div class="sk-head"><div class="sk-avatar sk"></div><div class="sk-lines"><div class="sk sk--w60"></div><div class="sk sk--w80"></div></div></div>
                <div class="sk-head"><div class="sk-avatar sk"></div><div class="sk-lines"><div class="sk sk--w60"></div><div class="sk sk--w80"></div></div></div>
              </div>
            } @else if (applications().length === 0) {
              <div class="empty-state" style="padding: 40px 16px;">
                <ng-icon name="lucideUsers" class="empty-icon"></ng-icon>
                <h3>Aucune candidature</h3>
                <p>Les postulants apparaîtront ici</p>
              </div>
            } @else {
              <div class="cand-list">
                @for (app of applications(); track app.id) {
                  <div class="cand-card" [class.pending]="app.status === 'PENDING'" [class.accepted-card]="app.status === 'ACCEPTED'" [class.rejected-card]="app.status === 'REJECTED'">
                    <div class="cand-avatar">{{ app.user?.name?.charAt(0) || '?' }}</div>
                    <div class="cand-body">
                      <div class="cand-top">
                        <div class="cand-info">
                          <strong>{{ app.user?.name || 'Anonyme' }}</strong>
                          <span class="cand-location">
                            <ng-icon name="lucideMapPin"></ng-icon> {{ app.user?.governorate || '—' }}
                          </span>
                        </div>
                        <span class="cand-rate">{{ app.proposed_daily_rate_tnd }} TND/j</span>
                      </div>
                      <div class="cand-rating">
                        @for (s of [1,2,3,4,5]; track s) {
                          <span class="star-filled" [class.empty]="s > (app.user?.rating || 0)">★</span>
                        }
                        <span class="rating-value">{{ app.user?.rating?.toFixed(1) || '—' }}</span>
                      </div>
                      @if (app.competencies?.length) {
                        <div class="cand-badges">
                          @for (comp of app.competencies; track comp) {
                            <span class="comp-badge">{{ comp }}</span>
                          }
                        </div>
                      }
                      @if (app.cover_message) {
                        <p class="cand-cover">{{ app.cover_message }}</p>
                      }
                      @if (app.status === 'PENDING') {
                        <div class="cand-actions">
                          <div class="cand-actions-row primary-row">
                            <button class="btn-sm primary" (click)="contactWorker(app)">
                              <ng-icon name="lucideMessageSquare"></ng-icon> Contacter
                            </button>
                            <button class="btn-sm primary" (click)="startNegotiation(app)">
                              <ng-icon name="lucidePenLine"></ng-icon> Négocier
                            </button>
                            <button class="btn-sm success" (click)="acceptApplication(app.id)">
                              <ng-icon name="lucideThumbsUp"></ng-icon> Accepter
                            </button>
                          </div>
                          <div class="cand-actions-row secondary-row">
                            <button class="btn-sm outline" (click)="viewWorkerProfile(app)">
                              <ng-icon name="lucideEye"></ng-icon> Profil
                            </button>
                            <button class="btn-sm danger" (click)="rejectApplication(app.id)">
                              <ng-icon name="lucideX"></ng-icon> Rejeter
                            </button>
                          </div>
                        </div>
                      } @else if (app.status === 'ACCEPTED') {
                        <span class="status-badge accepted"><ng-icon name="lucideCheck"></ng-icon> Accepté</span>
                      } @else {
                        <span class="status-badge rejected"><ng-icon name="lucideX"></ng-icon> Rejeté</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- New Negotiation Modal -->
      @if (showNegotiation()) {
        <div class="modal-backdrop" (click)="closeNegotiation()">
          <div class="modal modal-negotiation" (click)="$event.stopPropagation()">
            <app-mission-negotiation
              [negotiationId]="negotiationId()"
              [missionType]="selectedOffer()?.task_type || ''"
              [missionLocation]="selectedOffer()?.governorate || ''"
              [currentRole]="'FARMER'"
              (close)="closeNegotiation()" />
          </div>
        </div>
      }

      <!-- Reengage Modal -->
      @if (showReengage()) {
        <div class="modal-backdrop" (click)="showReengage.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="showReengage.set(false)"><ng-icon name="lucideX"></ng-icon></button>
            <h3><ng-icon name="lucideRepeat"></ng-icon> Réengager {{ reengageWorker_()?.name }}</h3>
            <div class="modal-body">
              <div class="reengage-info">
                <div class="reengage-avatar">{{ reengageWorker_()?.name?.charAt(0) || '?' }}</div>
                <div>
                  <strong>{{ reengageWorker_()?.name }}</strong>
                  <span>{{ reengageWorker_()?.missions_count }} mission(s) terminée(s)</span>
                </div>
              </div>
              <label>Type de tâche</label>
              <select [(ngModel)]="reengageForm.task_type" class="form-el">
                @for (t of TASK_TYPES; track t) { <option [value]="t">{{ t }}</option> }
              </select>
              <label>Date de début</label>
              <input type="date" [(ngModel)]="reengageForm.start_date" class="form-el" />
              <label>Durée (jours)</label>
              <input type="number" [(ngModel)]="reengageForm.duration_days" class="form-el" min="1" />
              <label>Salaire journalier (TND)</label>
              <input type="number" [(ngModel)]="reengageForm.daily_pay_tnd" class="form-el" min="10" />
              <label>Notes</label>
              <textarea [(ngModel)]="reengageForm.notes" class="form-el" rows="2"></textarea>
              <button class="btn btn-primary" (click)="submitReengage()"
                [disabled]="submitting() || !reengageForm.task_type || !reengageForm.start_date">
                Envoyer l'offre
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Worker Contact Sheet : profil + actions Appeler / Négocier / Accepter -->
      @if (showWorkerProfile()) {
        <div class="modal-backdrop" (click)="closeWorkerProfile()">
          <div class="modal modal-wide modal-sheet" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="closeWorkerProfile()"><ng-icon name="lucideX"></ng-icon></button>

            @if (loadingProfile()) {
              <div class="sheet-skeleton" aria-busy="true" aria-label="Chargement du profil">
                <div class="sk-head"><div class="sk sk-avatar"></div><div class="sk-lines"><div class="sk sk--line"></div><div class="sk sk--line sk--w60"></div></div></div>
                <div class="sk sk--line"></div>
                <div class="sk sk--line sk--w80"></div>
                <div class="sk sk--line sk--w60"></div>
              </div>
            } @else if (workerProfile(); as wp) {
              <div class="sheet-head">
                <div class="sheet-avatar">{{ wp.profile.name?.charAt(0) || '?' }}</div>
                <div class="sheet-title">
                  <h3>{{ wp.profile.name || 'Anonyme' }}</h3>
                  <span class="sheet-gov"><ng-icon name="lucideMapPin"></ng-icon> {{ wp.profile.governorate }}</span>
                  <span class="sheet-avail" [class.on]="wp.profile.is_available">{{ wp.profile.is_available ? 'Disponible' : 'Indisponible' }}</span>
                </div>
                <div class="sheet-rating">
                  @for (s of [1,2,3,4,5]; track s) {
                    <span class="star-filled" [class.empty]="s > wp.profile.rating">★</span>
                  }
                  <span class="rating-value">{{ wp.profile.rating.toFixed(1) }}</span>
                </div>
              </div>

              <div class="sheet-stats">
                <div class="sheet-stat">
                  <span class="ps-value">{{ wp.profile.total_jobs_done }}</span>
                  <span class="ps-label">Missions</span>
                </div>
                <div class="sheet-stat">
                  <span class="ps-value">{{ wp.profile.daily_rate_tnd }}</span>
                  <span class="ps-label">TND/jour</span>
                </div>
                <div class="sheet-stat">
                  <span class="ps-value">{{ wp.certifications.length }}</span>
                  <span class="ps-label">Certifications</span>
                </div>
              </div>

              <div class="sheet-body">
                @if (wp.profile.bio) {
                  <div class="profile-section">
                    <h4>Bio</h4>
                    <p>{{ wp.profile.bio }}</p>
                  </div>
                }

                <div class="profile-section">
                  <h4>Compétences</h4>
                  <div class="profile-badges">
                    @for (skill of wp.profile.skills; track skill) {
                      <span class="skill-badge">{{ skill }}</span>
                    }
                  </div>
                </div>

                @if (wp.certifications.length > 0) {
                  <div class="profile-section">
                    <h4>Certifications</h4>
                    <div class="certs-list">
                      @for (cert of wp.certifications; track cert.id) {
                        <div class="cert-item">
                          <div class="cert-icon">&#128220;</div>
                          <div class="cert-info">
                            <strong>{{ cert.certification_name }}</strong>
                            <span>{{ cert.issuing_organization }} · {{ cert.issued_date | date:'yyyy' }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (wp.ratings.length > 0) {
                  <div class="profile-section">
                    <h4>Évaluations récentes</h4>
                    <div class="ratings-list">
                      @for (r of wp.ratings; track r.application_id) {
                        <div class="rating-item">
                          <div class="rating-header">
                            <strong>{{ r.employer_name }}</strong>
                            <span class="rating-stars">
                              @for (s of [1,2,3,4,5]; track s) {
                                <span class="star-filled" [class.empty]="s > r.rating">★</span>
                              }
                              <span class="rating-value">{{ r.rating }}</span>
                            </span>
                          </div>
                          @if (r.notes) {
                            <p class="rating-notes">"{{ r.notes }}"</p>
                          }
                          <span class="rating-meta">{{ r.task_type }} · {{ r.mission_date | date:'MMM yyyy' }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Barre d'actions fixe : contacter le candidat sans quitter la fiche -->
              <div class="sheet-actions">
                @if (wp.profile.phone) {
                  <a class="btn btn-call" [href]="'tel:' + wp.profile.phone">
                    <ng-icon name="lucidePhone"></ng-icon> Appeler
                  </a>
                }
                <button class="btn btn-primary" (click)="negotiateFromProfile()">
                  <ng-icon name="lucidePenLine"></ng-icon> Négocier
                </button>
                @if (profilingApp()?.status === 'PENDING') {
                  <button class="btn btn-accept" (click)="acceptFromProfile()">
                    <ng-icon name="lucideCheck"></ng-icon> Accepter
                  </button>
                }
              </div>
            } @else {
              <div class="empty-state">
                <p>Impossible de charger le profil.</p>
                <button class="btn btn-primary" (click)="closeWorkerProfile()">Fermer</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .page { padding: 20px; max-width: 960px; margin: 0 auto; }
    .page-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 12px; }
    .page-top h2 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .page-top h2 ng-icon { width: 22px; height: 22px; color: var(--zir-emerald); }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
    .btn-primary { background: var(--zir-emerald); color: white; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { display: inline-flex; align-items: center; gap: 4px; padding: 7px 14px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .btn-sm.success { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .btn-sm.success:hover { background: var(--zir-emerald); color: white; }
    .btn-sm.primary { background: var(--zir-emerald); color: white; }
    .btn-sm.primary:hover { filter: brightness(1.08); box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
    .btn-sm.danger { background: rgba(239,68,68,0.1); color: #ef4444; }
    .btn-sm.danger:hover { background: #ef4444; color: white; }
    .btn-sm.outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
    .btn-sm.outline:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .btn-sm ng-icon { width: 14px; height: 14px; }

    .tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: 10px; padding: 3px; margin-bottom: 16px; }
    .tab { flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: center; }
    .tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon ng-icon { width: 20px; height: 20px; }
    .active-icon { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .pending-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .completed-icon { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .empty-state p { margin: 0 0 16px; font-size: 0.85rem; }

    .offer-list { display: flex; flex-direction: column; gap: 10px; }
    .offer-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.15s; }
    .offer-card:hover { border-color: var(--zir-emerald); }
    .offer-card.open { border-left: 4px solid var(--zir-emerald); }
    .offer-card.selected { border-color: var(--zir-emerald); background: var(--zir-emerald-alpha-10); }
    .offer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .offer-title-row { display: flex; align-items: center; gap: 8px; }
    .offer-task-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--zir-emerald-alpha-10); display: flex; align-items: center; justify-content: center; }
    .offer-task-icon ng-icon { width: 14px; height: 14px; color: var(--zir-emerald); }
    .offer-title { font-weight: 800; font-size: 1rem; color: var(--text-primary); }
    .offer-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .offer-badge.open { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .offer-badge.filled { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .offer-badge.closed { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .offer-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
    .offer-meta ng-icon { width: 14px; height: 14px; vertical-align: middle; }
    .offer-facilities { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .facility-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: rgba(139,92,246,0.08); color: #8b5cf6; }
    .facility-badge ng-icon { width: 12px; height: 12px; }
    .offer-applicants { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--zir-emerald); font-weight: 600; cursor: pointer; margin-bottom: 8px; }
    .offer-applicants ng-icon { width: 14px; height: 14px; }
    .offer-actions { display: flex; gap: 6px; }

    .form-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
    .form-panel h3 { font-size: 1.05rem; font-weight: 800; margin: 0 0 18px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .form-panel h3 ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .form-el { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; }
    .form-el:focus { border-color: var(--zir-emerald); }
    textarea.form-el { resize: vertical; }
    select.form-el { cursor: pointer; }

    .toggles-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .toggle-label ng-icon { width: 16px; height: 16px; color: var(--text-muted); }
    .toggle-input { display: none; }
    .toggle-switch { width: 36px; height: 20px; border-radius: 10px; background: var(--border); position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-switch::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle-input:checked + .toggle-switch { background: var(--zir-emerald); }
    .toggle-input:checked + .toggle-switch::after { transform: translateX(16px); }

    .btn-submit { margin-top: 18px; width: 100%; justify-content: center; padding: 12px; }

    .trusted-list { display: flex; flex-direction: column; gap: 10px; }
    .trusted-card { display: flex; align-items: center; gap: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; transition: all 0.15s; }
    .trusted-card:hover { border-color: var(--zir-emerald); }
    .trusted-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--zir-emerald); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
    .trusted-info { flex: 1; min-width: 0; }
    .trusted-info strong { display: block; font-size: 0.92rem; color: var(--text-primary); margin-bottom: 4px; }
    .trusted-meta { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; color: var(--text-muted); flex-wrap: wrap; }
    .trusted-meta ng-icon { width: 12px; height: 12px; }
    .trusted-rating { display: inline-flex; align-items: center; gap: 1px; }
    .trusted-rating .star-filled { color: #f59e0b; font-size: 0.8rem; }
    .trusted-rating .star-filled.empty { color: var(--border); }
    .trusted-missions { font-weight: 600; }
    .trusted-location { display: inline-flex; align-items: center; gap: 2px; }

    /* ─── Candidatures panel – premium glassmorphism slide-in ─── */
    @keyframes panelSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes panelBackdropIn { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      @keyframes panelSlideIn { from { transform: none; opacity: 1; } to { transform: none; opacity: 1; } }
      @keyframes panelBackdropIn { from { opacity: 1; } to { opacity: 1; } }
    }
    .detail-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index: 49; animation: panelBackdropIn 0.2s ease-out; }
    .detail-panel { position: fixed; top: 0; right: 0; width: 460px; max-width: 92vw; height: 100vh; z-index: 50; display: flex; flex-direction: column;
      background: var(--bg-card); border-left: 1px solid var(--border);
      box-shadow: -8px 0 40px rgba(0,0,0,0.18), -2px 0 8px rgba(0,0,0,0.06);
      animation: panelSlideIn 0.28s cubic-bezier(0.16,1,0.3,1); }
    .detail-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 20px 22px 16px;
      background: var(--bg-topbar); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
    .detail-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .detail-header-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep)); color: white; flex-shrink: 0; }
    .detail-header-icon ng-icon { width: 18px; height: 18px; }
    .detail-header h3 { margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .detail-header-sub { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
    .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--bg-secondary); color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
    .close-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
    .close-btn ng-icon { width: 16px; height: 16px; }
    .detail-body { flex: 1; overflow-y: auto; padding: 14px 18px 20px; }

    /* ─── Candidature cards – premium ─── */
    .cand-list { display: flex; flex-direction: column; gap: 10px; }
    .cand-card { display: flex; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 14px;
      background: var(--bg-card); transition: all 0.18s ease; position: relative; overflow: hidden; }
    .cand-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; border-radius: 0 3px 3px 0;
      background: var(--border); transition: background 0.18s; }
    .cand-card.pending::before { background: linear-gradient(180deg, #f59e0b, #f97316); }
    .cand-card.accepted-card::before { background: linear-gradient(180deg, var(--zir-emerald), #059669); }
    .cand-card.rejected-card::before { background: linear-gradient(180deg, #ef4444, #dc2626); }
    .cand-card:hover { border-color: var(--zir-emerald); box-shadow: 0 4px 16px rgba(16,185,129,0.08); transform: translateY(-1px); }
    .cand-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1rem; flex-shrink: 0; color: white;
      background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep));
      box-shadow: 0 2px 8px rgba(16,185,129,0.25); }
    .cand-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .cand-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .cand-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .cand-info strong { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cand-location { display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; color: var(--text-muted); }
    .cand-location ng-icon { width: 11px; height: 11px; }
    .cand-rate { display: inline-flex; align-items: center; gap: 3px; font-size: 0.82rem; font-weight: 800; color: var(--zir-emerald);
      white-space: nowrap; padding: 3px 10px; border-radius: 8px; background: var(--zir-emerald-alpha-10); flex-shrink: 0; }
    .cand-rating { display: flex; align-items: center; gap: 1px; }
    .cand-rating .star-filled { color: #f59e0b; font-size: 0.78rem; }
    .cand-rating .star-filled.empty { color: var(--border); }
    .rating-value { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-left: 4px; }
    .cand-badges { display: flex; flex-wrap: wrap; gap: 4px; }
    .comp-badge { font-size: 0.67rem; font-weight: 600; padding: 2px 8px; border-radius: 6px;
      background: rgba(16,185,129,0.08); color: var(--zir-emerald); border: 1px solid rgba(16,185,129,0.12); }
    .cand-cover { margin: 0; font-size: 0.78rem; color: var(--text-secondary); line-height: 1.45; font-style: italic;
      padding: 8px 10px; background: var(--bg-secondary); border-radius: 8px; border-left: 2px solid var(--zir-emerald); }
    .cand-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
    .cand-actions-row { display: flex; gap: 6px; }
    .cand-actions-row.primary-row .btn-sm.primary,
    .cand-actions-row.primary-row .btn-sm.success { flex: 1; justify-content: center; }
    .cand-actions-row.secondary-row { justify-content: flex-end; }
    .cand-actions-row.secondary-row .btn-sm.outline,
    .cand-actions-row.secondary-row .btn-sm.danger { flex: 0 0 auto; }
    .status-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .status-badge.accepted { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .status-badge.rejected { background: rgba(239,68,68,0.1); color: #ef4444; }
    .status-text { font-size: 0.75rem; font-weight: 700; }
    .status-text.accepted { color: var(--zir-emerald); }
    .status-text.rejected { color: #ef4444; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 440px; max-width: 90vw; position: relative; max-height: 90vh; overflow-y: auto; }
    .modal-negotiation { width: 520px; }
    /* Fiche contact premium : en-tête fixe glass, corps scroll plat, actions fixes */
    .modal-sheet { width: 520px; padding: 0; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh; }
    .modal-sheet .modal-close { z-index: 3; }
    .sheet-head { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 14px; padding: 20px 22px 16px; background: var(--bg-topbar); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .sheet-avatar { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; color: var(--text-inverse); background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep)); box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10), 0 8px 20px rgba(0,0,0,0.2); flex-shrink: 0; }
    .sheet-title { flex: 1; min-width: 0; }
    .sheet-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
    .sheet-gov { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; color: var(--text-muted); }
    .sheet-gov ng-icon { width: 12px; height: 12px; }
    .sheet-avail { display: inline-block; margin-inline-start: 8px; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(100,116,139,0.12); color: var(--text-muted); }
    .sheet-avail.on { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .sheet-rating { display: flex; align-items: center; gap: 1px; flex-shrink: 0; }
    .sheet-rating .star-filled { color: var(--warning); font-size: 0.85rem; }
    .sheet-rating .star-filled.empty { color: var(--border); }
    .sheet-rating .rating-value { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-inline-start: 4px; }
    .sheet-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px 22px 0; }
    .sheet-stat { text-align: center; padding: 12px 8px; border-radius: 12px; background: var(--bg-secondary); border: 1px solid var(--border); }
    .sheet-stat .ps-value { display: block; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); line-height: 1.1; }
    .sheet-stat .ps-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .sheet-body { flex: 1; overflow-y: auto; padding: 6px 22px 16px; display: flex; flex-direction: column; gap: 4px; }
    .sheet-actions { position: sticky; bottom: 0; display: flex; gap: 8px; padding: 14px 22px; background: var(--bg-topbar); backdrop-filter: blur(12px); border-top: 1px solid var(--border); }
    .sheet-actions .btn { flex: 1; justify-content: center; text-decoration: none; }
    .btn-call { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border: 1px solid var(--border-accent); }
    .btn-call:hover { filter: brightness(1.05); }
    .btn-accept { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; background: var(--zir-emerald); color: var(--text-inverse); }
    .btn-accept:hover { filter: brightness(1.05); }
    .sheet-skeleton { display: flex; flex-direction: column; gap: 12px; padding: 24px 22px; }
    .sk-head { display: flex; gap: 14px; align-items: center; }
    .sk-avatar { width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0; }
    .sk-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .sk { height: 14px; border-radius: 7px; background: var(--bg-skeleton); position: relative; overflow: hidden; }
    .sk--w60 { width: 60%; } .sk--w80 { width: 80%; }
    .sk::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--bg-skeleton-shine), transparent); animation: sk-shimmer 1.4s infinite; }
    @keyframes sk-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { .sk::after { animation: none; } }
    .modal-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text-muted); cursor: pointer; }
    .modal-close ng-icon { width: 20px; height: 20px; }
    .modal h3 { margin: 0 0 16px; font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .modal h3 ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .modal-body { display: flex; flex-direction: column; gap: 10px; }
    .modal-body label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }

    .reengage-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; }
    .reengage-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--zir-emerald); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }
    .reengage-info strong { display: block; font-size: 0.9rem; color: var(--text-primary); }
    .reengage-info span { font-size: 0.75rem; color: var(--text-muted); }

    .modal-wide { width: 560px; max-width: 95vw; max-height: 85vh; overflow-y: auto; }

    .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .profile-avatar-lg { width: 56px; height: 56px; border-radius: 50%; background: var(--zir-emerald); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; flex-shrink: 0; }
    .profile-title { flex: 1; }
    .profile-title h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary); }
    .profile-governorate { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--text-muted); }
    .profile-governorate ng-icon { width: 14px; height: 14px; }
    .profile-rating-big { display: flex; align-items: center; gap: 2px; }
    .profile-rating-big .star-filled { color: #f59e0b; font-size: 1rem; }
    .profile-rating-big .star-filled.empty { color: var(--border); }
    .profile-rating-big .rating-value { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-left: 4px; }

    .profile-stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .profile-stat { flex: 1; text-align: center; padding: 12px; background: var(--bg-secondary); border-radius: 10px; }
    .ps-value { display: block; font-size: 1.3rem; font-weight: 800; color: var(--text-primary); }
    .ps-label { display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

    .profile-section { margin-bottom: 18px; }
    .profile-section h4 { margin: 0 0 8px; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .profile-section p { margin: 0; font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; }

    .profile-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-badge { font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }

    .certs-list { display: flex; flex-direction: column; gap: 8px; }
    .cert-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--bg-secondary); border-radius: 8px; }
    .cert-icon { font-size: 1.2rem; }
    .cert-info { flex: 1; }
    .cert-info strong { display: block; font-size: 0.82rem; color: var(--text-primary); }
    .cert-info span { font-size: 0.72rem; color: var(--text-muted); }

    .ratings-list { display: flex; flex-direction: column; gap: 10px; }
    .rating-item { padding: 10px 12px; background: var(--bg-secondary); border-radius: 8px; }
    .rating-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .rating-header strong { font-size: 0.85rem; color: var(--text-primary); }
    .rating-stars { display: inline-flex; align-items: center; gap: 1px; }
    .rating-stars .star-filled { color: #f59e0b; font-size: 0.75rem; }
    .rating-stars .star-filled.empty { color: var(--border); }
    .rating-stars .rating-value { font-size: 0.72rem; font-weight: 700; margin-left: 3px; color: var(--text-primary); }
    .rating-notes { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary); font-style: italic; }
    .rating-meta { display: block; font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; }

    .text-muted { color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px; }
  `]
})
export class FarmerServicesLabourComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly activeTab = signal<'offers' | 'create' | 'trusted'>('offers');
  readonly loading = signal(true);
  readonly offers = signal<JobOffer[]>([]);
  readonly submitting = signal(false);
  readonly selectedOffer = signal<JobOffer | null>(null);
  readonly applications = signal<JobApplication[]>([]);
  readonly loadingApplications = signal(false);
  readonly trustedWorkers = signal<TrustedWorker[]>([]);
  readonly loadingTrusted = signal(false);
  readonly showNegotiation = signal(false);
  readonly negotiatingApplication = signal<JobApplication | null>(null);
  readonly negotiationId = signal<string>('');
  readonly currentUserId = signal<string>('');
  readonly showReengage = signal(false);
  readonly reengageWorker_ = signal<TrustedWorker | null>(null);
  readonly showWorkerProfile = signal(false);
  readonly workerProfile = signal<WorkerPublicProfile | null>(null);
  readonly loadingProfile = signal(false);
  // Candidature contextuelle de la fiche ouverte (actions Appeler/Négocier/Accepter)
  readonly profilingApp = signal<JobApplication | null>(null);

  readonly stats = signal({ active: 0, pending: 0, filled: 0 });

  createForm = {
    task_type: 'Récolte',
    description: '',
    start_date: '',
    duration_days: 7,
    daily_pay_tnd: 35,
    workers_needed: 3,
    governorate: '',
    accommodation_provided: false,
    meals_provided: false,
    transport_provided: false,
    notes: '',
  };

  reengageForm = {
    task_type: 'Récolte',
    start_date: '',
    duration_days: 7,
    daily_pay_tnd: 35,
    notes: '',
  };

  readonly TASK_TYPES = [
    'Récolte', 'Plantation', 'Désherbage', 'Irrigation', 'Taille',
    'Cueillette', 'Élagage', 'Traitement phytosanitaire', 'Autre'
  ];

  ngOnInit() {
    this.loadOffers();
    this.loadTrustedWorkers();
  }

  switchTab(tab: 'offers' | 'create' | 'trusted') {
    this.activeTab.set(tab);
    if (tab === 'offers' && this.offers().length === 0) {
      this.loadOffers();
    }
    if (tab === 'trusted' && this.trustedWorkers().length === 0) {
      this.loadTrustedWorkers();
    }
  }

  loadOffers() {
    this.loading.set(true);
    this.http.get<JobOffer[]>(`${environment.apiUrl}/workers/job-offers/mine`).subscribe({
      next: (data) => {
        this.offers.set(Array.isArray(data) ? data : []);
        this.computeStats();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  computeStats() {
    const all = this.offers();
    this.stats.set({
      active: all.filter(o => o.status === 'OPEN').length,
      pending: all.reduce((sum, o) => sum + (o.applications_count || 0), 0),
      filled: all.filter(o => o.status === 'FILLED').length,
    });
  }

  submitOffer() {
    if (!this.createForm.task_type || !this.createForm.start_date || !this.createForm.governorate) return;
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/workers/job-offers`, this.createForm).subscribe({
      next: () => {
        this.toast.success('Offre publiée', 'Les travailleurs à proximité ont été notifiés');
        this.submitting.set(false);
        this.createForm = {
          task_type: 'Récolte', description: '', start_date: '', duration_days: 7,
          daily_pay_tnd: 35, workers_needed: 3, governorate: '',
          accommodation_provided: false, meals_provided: false, transport_provided: false, notes: '',
        };
        this.activeTab.set('offers');
        this.loadOffers();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible de publier l\'offre');
        this.submitting.set(false);
      }
    });
  }

  selectOffer(offer: JobOffer) {
    if (this.selectedOffer()?.id === offer.id) {
      this.selectedOffer.set(null);
      this.applications.set([]);
      return;
    }
    this.selectedOffer.set(offer);
    this.loadApplications(offer.id);
  }

  loadApplications(offerId: string) {
    this.loadingApplications.set(true);
    this.http.get<JobApplication[]>(`${environment.apiUrl}/workers/job-offers/${offerId}/applications`).subscribe({
      next: (data) => {
        this.applications.set(Array.isArray(data) ? data : []);
        this.loadingApplications.set(false);
      },
      error: () => {
        this.applications.set([]);
        this.loadingApplications.set(false);
      }
    });
  }

  closeOffer(offerId: string) {
    this.http.patch(`${environment.apiUrl}/workers/job-offers/${offerId}/status`, { status: 'CLOSED' }).subscribe({
      next: () => { this.toast.success('Offre clôturée'); this.loadOffers(); },
      error: () => this.toast.error('Erreur', 'Erreur lors de la clôture')
    });
  }

  reopenOffer(offerId: string) {
    this.http.patch(`${environment.apiUrl}/workers/job-offers/${offerId}/status`, { status: 'OPEN' }).subscribe({
      next: () => { this.toast.success('Offre réactivée'); this.loadOffers(); },
      error: () => this.toast.error('Erreur', 'Erreur lors de la réactivation')
    });
  }

  deleteOffer(offerId: string) {
    this.http.delete(`${environment.apiUrl}/workers/job-offers/${offerId}`).subscribe({
      next: () => {
        this.offers.update(list => list.filter(o => o.id !== offerId));
        if (this.selectedOffer()?.id === offerId) this.selectedOffer.set(null);
        this.computeStats();
        this.toast.success('Offre supprimée');
      },
      error: () => this.toast.error('Erreur', 'Erreur lors de la suppression')
    });
  }

  acceptApplication(appId: string) {
    this.http.patch(`${environment.apiUrl}/workers/applications/${appId}/accept`, {}).subscribe({
      next: () => {
        this.toast.success('Candidature acceptée', 'Le travailleur a été notifié');
        if (this.selectedOffer()) this.loadApplications(this.selectedOffer()!.id);
        this.loadOffers();
      },
      error: () => this.toast.error('Erreur', 'Erreur lors de l\'acceptation')
    });
  }

  rejectApplication(appId: string) {
    this.http.patch(`${environment.apiUrl}/workers/applications/${appId}/reject`, {}).subscribe({
      next: () => {
        this.toast.success('Candidature déclinée');
        if (this.selectedOffer()) this.loadApplications(this.selectedOffer()!.id);
        this.loadOffers();
      },
      error: () => this.toast.error('Erreur', 'Erreur lors du rejet')
    });
  }

  // "Contacter" ouvre désormais la fiche contact (appel + négociation + décision),
  // plus un toast mort.
  contactWorker(app: JobApplication) {
    this.viewWorkerProfile(app);
  }

  viewWorkerProfile(app: JobApplication) {
    if (!app.worker_profile_id) {
      this.toast.error('Erreur', 'Profil travailleur non disponible');
      return;
    }
    this.profilingApp.set(app);
    this.showWorkerProfile.set(true);
    this.loadingProfile.set(true);
    this.workerProfile.set(null);
    this.http.get<WorkerPublicProfile>(`${environment.apiUrl}/workers/profiles/${app.worker_profile_id}/public`).subscribe({
      next: (data) => {
        if (data?.profile) {
          data.profile.rating = Number(data.profile.rating) || 0;
          data.profile.daily_rate_tnd = Number(data.profile.daily_rate_tnd) || 0;
        }
        this.workerProfile.set(data);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      }
    });
  }

  closeWorkerProfile() {
    this.showWorkerProfile.set(false);
    this.workerProfile.set(null);
    this.profilingApp.set(null);
  }

  // Depuis la fiche : fermer la fiche puis ouvrir la négociation pour cette candidature
  negotiateFromProfile() {
    const app = this.profilingApp();
    if (!app) return;
    this.closeWorkerProfile();
    this.startNegotiation(app);
  }

  // Depuis la fiche : accepter la candidature puis fermer
  acceptFromProfile() {
    const app = this.profilingApp();
    if (!app) return;
    this.acceptApplication(app.id);
    this.closeWorkerProfile();
  }

  startNegotiation(app: JobApplication) {
    this.http.post<{ id: string }>(`${environment.apiUrl}/contracts/negotiations`, {
      worker_id: app.worker_id,
      mission_offer_id: app.offer_id,
    }).subscribe({
      next: (neg) => {
        this.negotiationId.set(neg.id);
        this.negotiatingApplication.set(app);
        this.showNegotiation.set(true);
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible de démarrer la négociation');
      }
    });
  }

  closeNegotiation() {
    this.showNegotiation.set(false);
    this.negotiatingApplication.set(null);
    this.negotiationId.set('');
    this.loadOffers();
  }

  loadTrustedWorkers() {
    this.loadingTrusted.set(true);
    this.http.get<TrustedWorker[]>(`${environment.apiUrl}/workers/trusted`).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          data.forEach(w => w.rating = Number(w.rating) || 0);
        }
        this.trustedWorkers.set(Array.isArray(data) ? data : []);
        this.loadingTrusted.set(false);
      },
      error: () => this.loadingTrusted.set(false)
    });
  }

  reengageWorker(worker: TrustedWorker) {
    this.reengageWorker_.set(worker);
    this.reengageForm = {
      task_type: 'Récolte',
      start_date: '',
      duration_days: 7,
      daily_pay_tnd: 35,
      notes: '',
    };
    this.showReengage.set(true);
  }

  submitReengage() {
    const worker = this.reengageWorker_();
    if (!worker || !this.reengageForm.task_type || !this.reengageForm.start_date) return;

    this.submitting.set(true);
    const body = {
      ...this.reengageForm,
      worker_id: worker.user_id,
    };
    this.http.post(`${environment.apiUrl}/workers/job-offers`, body).subscribe({
      next: () => {
        this.toast.success('Offre envoyée', `${worker.name} a été notifié(e)`);
        this.submitting.set(false);
        this.showReengage.set(false);
        this.reengageWorker_.set(null);
        this.activeTab.set('offers');
        this.loadOffers();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible d\'envoyer l\'offre');
        this.submitting.set(false);
      }
    });
  }
}
