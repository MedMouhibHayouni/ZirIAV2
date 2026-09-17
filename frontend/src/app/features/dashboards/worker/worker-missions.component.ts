import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AgriJobApiService, WorkerApplication, WorkerProfile } from '../../../core/services/agrijob-api.service';
import { ContractsApiService, MissionContract } from '../../../core/services/contracts-api.service';
import { SocketService } from '../../../core/services/socket.service';
import { MissionNegotiationComponent } from '../shared/mission-negotiation.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCompass, lucideFileText, lucideBriefcase, lucideMapPin, lucideCalendar,
  lucideDollarSign, lucideClock, lucideCheckCircle, lucideXCircle, lucideAlertCircle,
  lucideChevronRight, lucideStar, lucideSend, lucideX, lucideLoader, lucideInfo,
  lucidePenLine, lucideEye, lucideMessageSquare, lucideArrowRight
} from '@ng-icons/lucide';

export interface JobOffer {
  id: string;
  task_type: string;
  description?: string;
  employer?: { name: string; phone?: string; id?: string };
  daily_pay_tnd: number;
  duration_days: number;
  start_date: string;
  governorate: string;
  lat?: number;
  lng?: number;
  status: string;
  required_competencies?: string[];
}

const GOVERNORATES = [
  'Tunis','Sfax','Sousse','Kairouan','Gafsa','Gabès','Béja','Jendouba','Nabeul','Bizerte',
  'Kasserine','Sidi Bouzid','Médenine','Monastir','Mahdia','Kef','Siliana','Tozeur','Kébili',
  'Tataouine','Ariana','Manouba','Ben Arous','Zaghouan'
];

const STEPPER_STEPS = [
  { key: 'PENDING', label: 'En attente', color: '#94a3b8', icon: 'lucideClock' },
  { key: 'VIEWED', label: 'Vue par le fermier', color: '#3b82f6', icon: 'lucideEye' },
  { key: 'SHORTLISTED', label: 'En négociation', color: '#f59e0b', icon: 'lucideMessageSquare' },
  { key: 'ACCEPTED', label: 'Acceptée', color: '#10b981', icon: 'lucideCheckCircle' },
  { key: 'REJECTED', label: 'Refusée', color: '#ef4444', icon: 'lucideXCircle' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-worker-missions',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterModule, MissionNegotiationComponent],
  providers: [provideIcons({
    lucideCompass, lucideFileText, lucideBriefcase, lucideMapPin, lucideCalendar,
    lucideDollarSign, lucideClock, lucideCheckCircle, lucideXCircle, lucideAlertCircle,
    lucideChevronRight, lucideStar, lucideSend, lucideX, lucideLoader, lucideInfo,
    lucidePenLine, lucideEye, lucideMessageSquare, lucideArrowRight
  })],
  template: `
    <div class="missions-shell">
      <!-- Header -->
      <header class="missions-header">
        <h1>Missions</h1>
        <p class="subtitle">Découvrez des opportunités, suivez vos candidatures</p>
      </header>

      <!-- Tabs -->
      <nav class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'discover'" (click)="setTab('discover')">
          <ng-icon name="lucide-compass" />
          <span>Découvrir</span>
          @if (availableCount() > 0) {
            <span class="tab-badge">{{ availableCount() }}</span>
          }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'applications'" (click)="setTab('applications')">
          <ng-icon name="lucide-file-text" />
          <span>Mes Candidatures</span>
          @if (applicationCount() > 0) {
            <span class="tab-badge">{{ applicationCount() }}</span>
          }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'active_missions'" (click)="setTab('active_missions')">
          <ng-icon name="lucide-briefcase" />
          <span>Missions Actives</span>
          @if (activeMissionCount() > 0) {
            <span class="tab-badge">{{ activeMissionCount() }}</span>
          }
        </button>
      </nav>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- TAB 1 : Découvrir                                                 -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'discover') {
        <section class="tab-content">
          <!-- Filters -->
          <div class="filters-row">
            <div class="filter-group">
              <label>Gouvernorat</label>
              <select [(ngModel)]="govFilter" (ngModelChange)="loadJobOffers()">
                <option value="">Tous les gouvernorats</option>
                @for (g of governorates; track g) {
                  <option [value]="g">{{ g }}</option>
                }
              </select>
            </div>
            <button class="btn-ghost" (click)="govFilter = ''; loadJobOffers()">
              <ng-icon name="lucide-x" /> Réinitialiser
            </button>
          </div>

          @if (isLoadingOffers()) {
            <div class="loading-state">
              <ng-icon name="lucide-loader" class="spinner" />
              <span>Chargement des offres…</span>
            </div>
          } @else if (jobOffers().length === 0) {
            <div class="empty-state">
              <ng-icon name="lucide-alert-circle" />
              <h3>Aucune offre disponible</h3>
              <p>Il n'y a pas d'offres d'emploi pour le moment dans votre zone.</p>
            </div>
          } @else {
            <div class="offers-grid">
              @for (offer of jobOffers(); track offer.id) {
                <div class="offer-card">
                  <div class="offer-card__header">
                    <span class="offer-type-badge">{{ offer.task_type }}</span>
                    @if (hasMatchingSkills(offer)) {
                      <span class="match-badge">
                        <ng-icon name="lucide-star" /> Compatibilité
                      </span>
                    }
                  </div>

                  <p class="offer-description">{{ offer.description || 'Aucune description fournie.' }}</p>

                  <div class="offer-meta">
                    <div class="meta-item">
                      <ng-icon name="lucide-calendar" />
                      <span>{{ offer.start_date | date:'dd MMM yyyy' }}</span>
                    </div>
                    <div class="meta-item">
                      <ng-icon name="lucide-clock" />
                      <span>{{ offer.duration_days }} jours</span>
                    </div>
                    <div class="meta-item">
                      <ng-icon name="lucide-map-pin" />
                      <span>{{ offer.governorate }}</span>
                    </div>
                    <div class="meta-item highlight">
                      <ng-icon name="lucide-dollar-sign" />
                      <span>{{ offer.daily_pay_tnd }} TND/jour</span>
                    </div>
                  </div>

                  @if (offer.required_competencies && offer.required_competencies.length > 0) {
                    <div class="competencies-row">
                      <span class="competencies-label">Compétences requises :</span>
                      <div class="competencies-list">
                        @for (comp of offer.required_competencies; track comp) {
                          <span class="comp-chip" [class.matched]="workerSkills().includes(comp)">
                            {{ comp }}
                          </span>
                        }
                      </div>
                    </div>
                  }

                  <div class="offer-card__footer">
                    @if (offer.employer) {
                      <span class="employer-name">{{ offer.employer.name }}</span>
                    }
                    <button
                      class="btn-primary"
                      [disabled]="isAlreadyApplied(offer.id)"
                      (click)="openApplyForm(offer)"
                    >
                      @if (isAlreadyApplied(offer.id)) {
                        Déjà postulé
                      } @else {
                        <ng-icon name="lucide-send" /> Postuler
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- TAB 2 : Mes Candidatures                                          -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'applications') {
        <section class="tab-content">
          @if (isLoadingApplications()) {
            <div class="loading-state">
              <ng-icon name="lucide-loader" class="spinner" />
              <span>Chargement de vos candidatures…</span>
            </div>
          } @else if (myApplications().length === 0) {
            <div class="empty-state">
              <ng-icon name="lucide-file-text" />
              <h3>Aucune candidature</h3>
              <p>Vous n'avez pas encore postulé à une offre. Explorez les offres disponibles !</p>
              <button class="btn-primary" (click)="setTab('discover')">
                <ng-icon name="lucide-compass" /> Découvrir les offres
              </button>
            </div>
          } @else {
            <div class="applications-list">
              @for (app of myApplications(); track app.id) {
                <div class="application-card">
                  <!-- Job offer summary -->
                  <div class="app-card__top">
                    <div class="app-info">
                      <span class="offer-type-badge">{{ app.jobOffer.task_type || 'Mission' }}</span>
                      <span class="app-date">
                        <ng-icon name="lucide-calendar" />
                        {{ app.applied_at | date:'dd MMM yyyy' }}
                      </span>
                    </div>
                    <div class="app-salary">
                      <ng-icon name="lucide-dollar-sign" />
                      {{ app.jobOffer.daily_pay_tnd || app.mission_context_snapshot?.daily_pay_tnd || '—' }} TND/jour
                    </div>
                  </div>

                  <!-- Horizontal Stepper -->
                  <div class="stepper">
                    @for (step of stepperSteps; track step.key) {
                      @let isActive = isStepActive(app.status, step.key);
                      @let isCurrent = app.status === step.key;
                      @let isRejectedTerminal = app.status === 'REJECTED' && step.key === 'REJECTED';
                      @let isPast = isStepPast(app.status, step.key);

                      <div
                        class="stepper__step"
                        [class.active]="isActive"
                        [class.current]="isCurrent"
                        [class.past]="isPast"
                        [class.rejected]="isRejectedTerminal"
                      >
                        <div class="stepper__dot" [style.background]="(isActive || isCurrent || isRejectedTerminal) ? step.color : undefined">
                          <ng-icon [name]="step.icon" />
                        </div>
                        <span class="stepper__label">{{ step.label }}</span>
                      </div>

                      @if (!$last) {
                        <div class="stepper__line" [class.filled]="isPast || (isActive && !isCurrent)"></div>
                      }
                    }
                  </div>

                  <!-- Cover message preview -->
                  @if (app.mission_context_snapshot) {
                    <div class="app-details">
                      <div class="detail-row">
                        <ng-icon name="lucide-map-pin" />
                        <span>{{ app.mission_context_snapshot.employer_name }}</span>
                      </div>
                      <div class="detail-row">
                        <ng-icon name="lucide-clock" />
                        <span>{{ app.mission_context_snapshot.duration_days }} jours — début {{ app.mission_context_snapshot.start_date | date:'dd MMM yyyy' }}</span>
                      </div>
                    </div>
                  }

                  @if (activeNegotiationIdFor(app); as negId) {
                    <div class="app-actions">
                      <button class="btn-primary" (click)="openNegotiation(app, negId)">
                        <ng-icon name="lucidePenLine" /> Négocier
                      </button>
                    </div>
                  }

                  @if (app.status === 'ACCEPTED') {
                    <div class="app-actions">
                      <button class="btn-primary" (click)="viewContract(app)">
                        <ng-icon name="lucide-arrow-right" /> Voir le Contrat
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- FIX A — Negotiation modal (même composant partagé que le Farmer, currentRole='WORKER') -->
      @if (showNegotiation()) {
        <div class="modal-overlay" (click)="closeNegotiation()">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <app-mission-negotiation
              [negotiationId]="negotiationId()"
              [missionType]="negotiatingApp()?.jobOffer?.task_type || ''"
              [missionLocation]="negotiatingApp()?.jobOffer?.governorate || ''"
              [currentRole]="'WORKER'"
              (close)="closeNegotiation()" />
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- TAB 3 : Missions Actives                                          -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (activeTab() === 'active_missions') {
        <section class="tab-content">
          @if (isLoadingMissions()) {
            <div class="loading-state">
              <ng-icon name="lucide-loader" class="spinner" />
              <span>Chargement des missions…</span>
            </div>
          } @else if (activeMissions().length === 0) {
            <div class="empty-state">
              <ng-icon name="lucide-briefcase" />
              <h3>Aucune mission active</h3>
              <p>Vous n'avez aucune mission en cours pour le moment.</p>
            </div>
          } @else {
            <div class="missions-list">
              @for (mission of activeMissions(); track mission.id) {
                <div class="mission-card">
                  <div class="mission-card__header">
                    <span class="mission-status" [class]="'status-' + mission.status.toLowerCase()">
                      {{ getStatusLabel(mission.status) }}
                    </span>
                    <span class="mission-ref">#{{ mission.id | slice:0:8 }}</span>
                  </div>

                  <div class="mission-card__body">
                    <p class="mission-description">{{ mission.description || mission.terms_snapshot['task_type'] || 'Mission de travail' }}</p>

                    <div class="mission-meta">
                      @if (mission.start_date) {
                        <div class="meta-item">
                          <ng-icon name="lucide-calendar" />
                          <span>{{ mission.start_date | date:'dd MMM yyyy' }}</span>
                        </div>
                      }
                      @if (mission.duration_days) {
                        <div class="meta-item">
                          <ng-icon name="lucide-clock" />
                          <span>{{ mission.duration_days }} jours</span>
                        </div>
                      }
                      <div class="meta-item highlight">
                        <ng-icon name="lucide-dollar-sign" />
                        <span>{{ mission.final_amount_tnd || mission.proposed_amount_tnd }} TND</span>
                      </div>
                    </div>

                    <!-- Other party info -->
                    <div class="mission-other-party">
                      <ng-icon name="lucide-info" />
                      <span>
                        @if (mission.farmer_id) {
                          Fermier : {{ mission.terms_snapshot['farmer_name'] || mission.farmer_id | slice:0:8 }}
                        }
                      </span>
                    </div>
                  </div>

                  <div class="mission-card__footer">
                    @if (mission.status === 'ACCEPTED') {
                      <button
                        class="btn-primary"
                        [disabled]="startingId() === mission.id"
                        (click)="startMission(mission)"
                      >
                        @if (startingId() === mission.id) {
                          <ng-icon name="lucide-loader" class="spinner" /> Démarrage…
                        } @else {
                          <ng-icon name="lucide-check-circle" /> Commencer
                        }
                      </button>
                    }

                    @if (mission.status === 'IN_PROGRESS') {
                      <button
                        class="btn-primary btn-complete"
                        [disabled]="completingId() === mission.id"
                        (click)="completeMission(mission)"
                      >
                        @if (completingId() === mission.id) {
                          <ng-icon name="lucide-loader" class="spinner" /> Finalisation…
                        } @else {
                          <ng-icon name="lucide-check-circle" /> Terminer
                        }
                      </button>
                    }

                    <button class="btn-ghost" (click)="viewContractById(mission.id)">
                      <ng-icon name="lucide-eye" /> Voir les Détails
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- Apply Modal                                                       -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (showApplyForm() && selectedOffer()) {
        <div class="modal-overlay" (click)="closeApplyForm()">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Postuler à l'offre</h2>
              <button class="btn-icon" (click)="closeApplyForm()">
                <ng-icon name="lucide-x" />
              </button>
            </div>

            <div class="modal-body">
              <div class="apply-offer-summary">
                <span class="offer-type-badge">{{ selectedOffer()!.task_type }}</span>
                <span class="apply-rate">{{ selectedOffer()!.daily_pay_tnd }} TND/jour</span>
              </div>

              <div class="form-group">
                <label for="coverMessage">Message de motivation <span class="optional">(optionnel — 300 caractères max)</span></label>
                <textarea
                  id="coverMessage"
                  class="form-textarea"
                  rows="4"
                  maxlength="300"
                  placeholder="Présentez votre expérience et votre motivation…"
                  [ngModel]="coverMessage()"
                  (ngModelChange)="coverMessage.set($event)"
                ></textarea>
                <span class="char-count">{{ coverMessage().length }}/300</span>
              </div>

              <div class="form-group">
                <label for="proposedRate">Tarif journalier proposé (TND)</label>
                <div class="rate-input-wrapper">
                  <input
                    id="proposedRate"
                    type="number"
                    class="form-input"
                    [ngModel]="proposedRate()"
                    (ngModelChange)="proposedRate.set($event)"
                    [min]="0"
                    [step]="5"
                  />
                  <span class="rate-suffix">TND/jour</span>
                </div>
                <span class="rate-hint">Offre initiale : {{ selectedOffer()!.daily_pay_tnd }} TND/jour</span>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-ghost" (click)="closeApplyForm()">Annuler</button>
              <button
                class="btn-primary"
                [disabled]="isApplying() || isAlreadyApplied(selectedOffer()!.id)"
                (click)="submitApplication()"
              >
                @if (isApplying()) {
                  <ng-icon name="lucide-loader" class="spinner" /> Envoi…
                } @else if (isAlreadyApplied(selectedOffer()!.id)) {
                  Déjà postulé
                } @else {
                  <ng-icon name="lucide-send" /> Envoyer la candidature
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toast()) {
        <div class="toast" [class.toast--error]="toast()!.type === 'error'">
          <ng-icon [name]="toast()!.type === 'success' ? 'lucide-check-circle' : 'lucide-alert-circle'" />
          <div>
            <strong>{{ toast()!.title }}</strong>
            <span>{{ toast()!.message }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--bg-primary, #0a0f1a);
      color: var(--text-primary, #e2e8f0);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .missions-shell {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .missions-header {
      margin-bottom: 24px;
    }
    .missions-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 4px;
      color: var(--text-primary, #e2e8f0);
    }
    .subtitle {
      font-size: 14px;
      color: var(--text-muted, #64748b);
      margin: 0;
    }

    /* ── Tabs ───────────────────────────────────────────────────────────── */
    .tabs-bar {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border, #1e293b);
      margin-bottom: 24px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-primary, #e2e8f0);
      background: var(--bg-secondary, #111827);
    }
    .tab-btn.active {
      color: var(--zir-emerald, #10b981);
      border-bottom-color: var(--zir-emerald, #10b981);
    }
    .tab-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
      background: var(--zir-emerald-alpha-10, rgba(16, 185, 129, 0.1));
      color: var(--zir-emerald, #10b981);
    }
    .tab-btn.active .tab-badge {
      background: var(--zir-emerald, #10b981);
      color: #fff;
    }

    /* ── Content area ───────────────────────────────────────────────────── */
    .tab-content { min-height: 300px; }

    /* ── Loading / Empty ────────────────────────────────────────────────── */
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted, #64748b);
    }
    .loading-state ng-icon, .empty-state ng-icon {
      font-size: 32px;
    }
    .empty-state h3 {
      font-size: 18px;
      color: var(--text-primary, #e2e8f0);
      margin: 0;
    }
    .empty-state p {
      font-size: 14px;
      margin: 0;
      max-width: 360px;
    }
    .spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Filters ────────────────────────────────────────────────────────── */
    .filters-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-group label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
    }
    .filter-group select,
    .form-input,
    .form-textarea {
      padding: 8px 12px;
      font-size: 14px;
      color: var(--text-primary, #e2e8f0);
      background: var(--bg-secondary, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s;
    }
    .filter-group select:focus,
    .form-input:focus,
    .form-textarea:focus {
      border-color: var(--zir-emerald, #10b981);
    }
    .filter-group select { min-width: 220px; }

    /* ── Buttons ────────────────────────────────────────────────────────── */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      background: var(--zir-emerald, #10b981);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
    }
    .btn-primary:hover { opacity: 0.85; }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary.btn-complete {
      background: #3b82f6;
    }
    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #94a3b8);
      background: transparent;
      border: 1px solid var(--border, #1e293b);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-ghost:hover {
      color: var(--text-primary, #e2e8f0);
      border-color: var(--text-muted, #64748b);
    }
    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      color: var(--text-muted, #64748b);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      color: var(--text-primary, #e2e8f0);
      background: var(--bg-secondary, #111827);
    }

    /* ── Offer Cards ────────────────────────────────────────────────────── */
    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .offer-card {
      background: var(--bg-card, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: border-color 0.2s;
    }
    .offer-card:hover {
      border-color: var(--zir-emerald, #10b981);
    }
    .offer-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .offer-type-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--zir-emerald, #10b981);
      background: var(--zir-emerald-alpha-10, rgba(16, 185, 129, 0.1));
      border-radius: 6px;
    }
    .match-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 6px;
    }
    .offer-description {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary, #94a3b8);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .offer-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
    }
    .meta-item.highlight {
      color: var(--zir-emerald, #10b981);
      font-weight: 600;
    }
    .competencies-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .competencies-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .competencies-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .comp-chip {
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      background: var(--bg-secondary, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 6px;
    }
    .comp-chip.matched {
      color: var(--zir-emerald, #10b981);
      border-color: var(--zir-emerald, #10b981);
      background: var(--zir-emerald-alpha-10, rgba(16, 185, 129, 0.1));
    }
    .offer-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid var(--border, #1e293b);
    }
    .employer-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #94a3b8);
    }

    /* ── Applications ───────────────────────────────────────────────────── */
    .applications-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .application-card {
      background: var(--bg-card, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .app-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .app-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .app-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted, #64748b);
    }
    .app-salary {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 600;
      color: var(--zir-emerald, #10b981);
    }

    /* ── Horizontal Stepper ─────────────────────────────────────────────── */
    .stepper {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px 0;
      overflow-x: auto;
    }
    .stepper__step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 80px;
      position: relative;
    }
    .stepper__dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary, #111827);
      border: 2px solid var(--border, #1e293b);
      color: var(--text-muted, #64748b);
      font-size: 12px;
      transition: all 0.3s;
    }
    .stepper__step.active .stepper__dot,
    .stepper__step.current .stepper__dot,
    .stepper__step.past .stepper__dot,
    .stepper__step.rejected .stepper__dot {
      border-color: transparent;
      color: #fff;
    }
    .stepper__label {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      text-align: center;
      white-space: nowrap;
    }
    .stepper__step.active .stepper__label,
    .stepper__step.current .stepper__label,
    .stepper__step.rejected .stepper__label {
      color: var(--text-primary, #e2e8f0);
      font-weight: 600;
    }
    .stepper__line {
      flex: 1;
      height: 2px;
      min-width: 20px;
      background: var(--border, #1e293b);
      margin-bottom: 18px;
      transition: background 0.3s;
    }
    .stepper__line.filled {
      background: var(--zir-emerald, #10b981);
    }

    /* ── App details ────────────────────────────────────────────────────── */
    .app-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      background: var(--bg-secondary, #111827);
      border-radius: 8px;
    }
    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
    }
    .app-actions {
      display: flex;
      gap: 8px;
    }

    /* ── Missions ───────────────────────────────────────────────────────── */
    .missions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .mission-card {
      background: var(--bg-card, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .mission-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mission-status {
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
    }
    .status-accepted {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    .status-in_progress {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    .status-completed {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.1);
    }
    .mission-ref {
      font-size: 12px;
      color: var(--text-muted, #64748b);
      font-family: monospace;
    }
    .mission-card__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mission-description {
      font-size: 14px;
      color: var(--text-primary, #e2e8f0);
      margin: 0;
    }
    .mission-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .mission-other-party {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
      padding: 8px 12px;
      background: var(--bg-secondary, #111827);
      border-radius: 8px;
    }
    .mission-card__footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid var(--border, #1e293b);
      flex-wrap: wrap;
    }

    /* ── Modal ──────────────────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      padding: 20px;
    }
    .modal-panel {
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      background: var(--bg-card, #111827);
      border: 1px solid var(--border, #1e293b);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }
    .modal-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary, #e2e8f0);
    }
    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid var(--border, #1e293b);
    }
    .apply-offer-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: var(--bg-secondary, #111827);
      border-radius: 8px;
    }
    .apply-rate {
      font-size: 14px;
      font-weight: 600;
      color: var(--zir-emerald, #10b981);
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #94a3b8);
    }
    .optional {
      font-weight: 400;
      color: var(--text-muted, #64748b);
    }
    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }
    .char-count {
      font-size: 11px;
      color: var(--text-muted, #64748b);
      text-align: right;
    }
    .rate-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rate-input-wrapper input {
      flex: 1;
    }
    .rate-suffix {
      font-size: 13px;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
    }
    .rate-hint {
      font-size: 12px;
      color: var(--text-muted, #64748b);
    }

    /* ── Toast ──────────────────────────────────────────────────────────── */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2000;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 18px;
      background: var(--bg-card, #111827);
      border: 1px solid var(--zir-emerald, #10b981);
      border-radius: 10px;
      color: var(--text-primary, #e2e8f0);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: slideIn 0.3s ease;
    }
    .toast--error {
      border-color: #ef4444;
    }
    .toast strong {
      display: block;
      font-size: 13px;
      font-weight: 600;
    }
    .toast span {
      display: block;
      font-size: 12px;
      color: var(--text-secondary, #94a3b8);
    }
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 640px) {
      .offers-grid {
        grid-template-columns: 1fr;
      }
      .tabs-bar {
        gap: 0;
      }
      .tab-btn {
        padding: 10px 12px;
        font-size: 12px;
        flex-direction: column;
        gap: 4px;
      }
      .stepper__step {
        min-width: 60px;
      }
      .stepper__label {
        font-size: 9px;
      }
    }
  `]
})
export class WorkerMissionsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private agriJobApi = inject(AgriJobApiService);
  private contractsApi = inject(ContractsApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private socket = inject(SocketService);
  private wsCleanups: Array<() => void> = [];

  readonly governorates = GOVERNORATES;
  readonly stepperSteps = STEPPER_STEPS;

  activeTab = signal<'discover' | 'applications' | 'active_missions'>('discover');

  jobOffers = signal<JobOffer[]>([]);
  myApplications = signal<WorkerApplication[]>([]);
  activeMissions = signal<MissionContract[]>([]);
  workerSkills = signal<string[]>([]);

  isLoadingOffers = signal(false);
  isLoadingApplications = signal(false);
  isLoadingMissions = signal(false);

  govFilter = '';

  showApplyForm = signal(false);
  selectedOffer = signal<JobOffer | null>(null);
  coverMessage = signal('');
  proposedRate = signal<number | null>(null);
  isApplying = signal(false);

  startingId = signal<string | null>(null);
  completingId = signal<string | null>(null);

  toast = signal<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  // ── FIX A — Négociations actives par offre (symétrie Farmer) ─────────────
  // Le Worker ne crée jamais de négociation (Farmer initiateur) : il rejoint
  // une négociation ACTIVE existante via le même composant partagé.
  negotiationsByOffer = signal<Record<string, string>>({});
  showNegotiation = signal(false);
  negotiationId = signal('');
  negotiatingApp = signal<WorkerApplication | null>(null);

  availableCount = computed(() => this.jobOffers().length);
  applicationCount = computed(() => this.myApplications().length);
  activeMissionCount = computed(() => this.activeMissions().length);

  ngOnInit() {
    this.loadJobOffers();
    this.loadApplications();
    this.loadActiveMissions();
    this.loadWorkerProfile();
    this.loadNegotiations();
    // Le bouton "Négocier" apparaît en temps réel quand le Farmer démarre une négo
    this.wsCleanups.push(
      this.socket.onEvent('negotiation_started', () => this.loadNegotiations())
    );
  }

  ngOnDestroy() {
    this.wsCleanups.forEach((off) => { try { off(); } catch { /* noop */ } });
    this.wsCleanups = [];
  }

  // ── FIX A — résolution négociation ACTIVE par candidature ────────────────
  loadNegotiations() {
    this.http.get<any[]>(`${environment.apiUrl}/contracts/negotiations`).subscribe({
      next: (list) => {
        const map: Record<string, string> = {};
        for (const n of list || []) {
          if (n && n.status === 'ACTIVE' && n.mission_offer_id) map[n.mission_offer_id] = n.id;
        }
        this.negotiationsByOffer.set(map);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  activeNegotiationIdFor(app: WorkerApplication): string | null {
    return this.negotiationsByOffer()[app.job_offer_id] || null;
  }

  openNegotiation(app: WorkerApplication, negotiationId: string) {
    this.negotiatingApp.set(app);
    this.negotiationId.set(negotiationId);
    this.showNegotiation.set(true);
  }

  closeNegotiation() {
    this.showNegotiation.set(false);
    this.negotiatingApp.set(null);
    this.negotiationId.set('');
    this.loadNegotiations();
    this.loadApplications();
  }

  setTab(tab: 'discover' | 'applications' | 'active_missions') {
    this.activeTab.set(tab);
  }

  // ── Loaders ────────────────────────────────────────────────────────────

  loadJobOffers() {
    this.isLoadingOffers.set(true);
    let url = `${environment.apiUrl}/workers/job-offers?limit=50`;
    if (this.govFilter) url += `&governorate=${this.govFilter}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        const items = data.items || data || [];
        this.jobOffers.set(items);
        this.isLoadingOffers.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.jobOffers.set([]);
        this.isLoadingOffers.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadApplications() {
    this.isLoadingApplications.set(true);
    this.agriJobApi.fetchMyApplications().subscribe({
      next: () => {
        this.myApplications.set(this.agriJobApi.myApplications());
        this.isLoadingApplications.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingApplications.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadActiveMissions() {
    this.isLoadingMissions.set(true);
    this.contractsApi.getContractsByType('JOB_MISSION').subscribe({
      next: (data) => {
        const missions = (data || []).filter(
          c => c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS'
        );
        this.activeMissions.set(missions);
        this.isLoadingMissions.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingMissions.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadWorkerProfile() {
    this.agriJobApi.fetchMyProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.workerSkills.set(profile.skills || []);
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ── Skill Matching ─────────────────────────────────────────────────────

  hasMatchingSkills(offer: JobOffer): boolean {
    const skills = this.workerSkills();
    if (!skills.length || !offer.required_competencies?.length) return false;
    return offer.required_competencies.some(c => skills.includes(c));
  }

  // ── Application Tracking ───────────────────────────────────────────────

  isAlreadyApplied(offerId: string): boolean {
    return this.myApplications().some(a => a.job_offer_id === offerId);
  }

  isStepActive(currentStatus: string, stepKey: string): boolean {
    const order = ['PENDING', 'VIEWED', 'SHORTLISTED', 'ACCEPTED'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepKey);
    if (currentStatus === 'REJECTED') return stepKey === 'REJECTED';
    return currentIdx >= 0 && stepIdx >= 0 && stepIdx <= currentIdx;
  }

  isStepPast(currentStatus: string, stepKey: string): boolean {
    const order = ['PENDING', 'VIEWED', 'SHORTLISTED', 'ACCEPTED'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx = order.indexOf(stepKey);
    if (currentStatus === 'REJECTED') return false;
    return currentIdx >= 0 && stepIdx >= 0 && stepIdx < currentIdx;
  }

  // ── Apply Modal ────────────────────────────────────────────────────────

  openApplyForm(offer: JobOffer) {
    if (this.isAlreadyApplied(offer.id)) return;
    this.selectedOffer.set(offer);
    this.coverMessage.set('');
    this.proposedRate.set(offer.daily_pay_tnd);
    this.showApplyForm.set(true);
  }

  closeApplyForm() {
    this.showApplyForm.set(false);
    this.selectedOffer.set(null);
    this.coverMessage.set('');
    this.proposedRate.set(null);
  }

  submitApplication() {
    const offer = this.selectedOffer();
    if (!offer) return;
    if (this.isAlreadyApplied(offer.id)) return;

    this.isApplying.set(true);
    const body: any = {};
    if (this.coverMessage().trim()) body.cover_message = this.coverMessage().trim();
    if (this.proposedRate() != null) body.proposed_daily_rate_tnd = this.proposedRate();

    this.http.post(`${environment.apiUrl}/workers/job-offers/${offer.id}/apply`, body).subscribe({
      next: () => {
        this.isApplying.set(false);
        this.closeApplyForm();
        this.showToast('Candidature envoyée', 'Votre candidature a été envoyée avec succès.', 'success');
        this.loadApplications();
      },
      error: (err) => {
        this.isApplying.set(false);
        if (err.status === 409) {
          this.showToast('Déjà postulé', 'Vous avez déjà postulé à cette offre.', 'error');
        } else {
          this.showToast('Erreur', err?.error?.message || 'Impossible d\'envoyer la candidature.', 'error');
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ── Mission Actions ────────────────────────────────────────────────────

  startMission(mission: MissionContract) {
    this.startingId.set(mission.id);
    this.contractsApi.startMission(mission.id).subscribe({
      next: () => {
        this.showToast('Mission démarrée', 'La mission est maintenant en cours.', 'success');
        this.startingId.set(null);
        this.loadActiveMissions();
      },
      error: (err) => {
        this.startingId.set(null);
        this.showToast('Erreur', err?.error?.message || 'Impossible de démarrer la mission.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  completeMission(mission: MissionContract) {
    this.completingId.set(mission.id);
    this.contractsApi.completeMission(mission.id).subscribe({
      next: () => {
        this.showToast('Mission terminée', 'La mission a été marquée comme terminée.', 'success');
        this.completingId.set(null);
        this.loadActiveMissions();
      },
      error: (err) => {
        this.completingId.set(null);
        this.showToast('Erreur', err?.error?.message || 'Impossible de terminer la mission.', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  viewContract(app: WorkerApplication) {
    const contract = this.contractsApi.getMyContracts();
    this.contractsApi.getMyContracts().subscribe({
      next: (contracts) => {
        const match = contracts.find(c => c.reference_id === app.id);
        if (match) {
          this.router.navigate(['/dashboard/contracts', match.id]);
        } else {
          this.showToast('Info', 'Aucun contrat associé pour le moment.', 'success');
        }
      }
    });
  }

  viewContractById(contractId: string) {
    this.router.navigate(['/dashboard/contracts', contractId]);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACCEPTED': return 'Acceptée';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminée';
      case 'NEGOTIATING': return 'En négociation';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  }

  showToast(title: string, message: string, type: 'success' | 'error' = 'success') {
    this.toast.set({ title, message, type });
    setTimeout(() => {
      this.toast.set(null);
      this.cdr.markForCheck();
    }, 4000);
  }
}
