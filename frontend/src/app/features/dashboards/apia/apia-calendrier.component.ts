import { Component, ChangeDetectionStrategy, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar, lucideClock, lucideUser, lucidePhone,
  lucidePlus, lucideX, lucideCheck, lucideBan,
  lucideTrash2, lucideFilter
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface Appointment {
  id: string;
  farmerName: string;
  farmerPhone: string;
  date: string;
  timeSlot: string;
  topic: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  cancelReason?: string;
}

const STATUS_CONFIG: Record<Appointment['status'], { label: string; pillClass: string }> = {
  CONFIRMED: { label: 'Confirme', pillClass: 'status-pill--emerald' },
  PENDING:   { label: 'En attente', pillClass: 'status-pill--amber' },
  CANCELLED: { label: 'Annule', pillClass: 'status-pill--red' },
};

@Component({
  selector: 'app-apia-calendrier',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideCalendar, lucideClock, lucideUser, lucidePhone,
    lucidePlus, lucideX, lucideCheck, lucideBan,
    lucideTrash2, lucideFilter
  })],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon">
            <ng-icon name="lucideCalendar"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Calendrier & Rendez-vous</h1>
            <p class="inst-header__sub">Gestion des permanences et rendez-vous agriculteurs</p>
          </div>
        </div>
        <div class="inst-header__actions">
          <button class="inst-btn inst-btn--primary" (click)="openCreateModal()">
            <ng-icon name="lucidePlus"></ng-icon>
            Nouveau RDV
          </button>
        </div>
      </header>

      <!-- Office Hours + Filters -->
      <div class="cal-layout">
        <div class="cal-sidebar">
          <!-- Office Hours Card -->
          <div class="inst-card">
            <div class="inst-card__head">
              <h3 class="inst-card__title">
                <ng-icon name="lucideClock"></ng-icon>
                Horaires d'Accueil
              </h3>
            </div>
            <div class="inst-card__body">
              <p class="cal-hours__day">Du Lundi au Vendredi</p>
              <div class="cal-hours__slot cal-hours__slot--morning">
                <span class="cal-hours__label">Matin</span>
                <span class="cal-hours__time">08:30 - 12:30</span>
                <span class="cal-hours__note">Permanence ouverte</span>
              </div>
              <div class="cal-hours__slot cal-hours__slot--afternoon">
                <span class="cal-hours__label">Apres-midi</span>
                <span class="cal-hours__time">14:00 - 16:30</span>
                <span class="cal-hours__note">Sur rendez-vous uniquement</span>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="inst-card">
            <div class="inst-card__head">
              <h3 class="inst-card__title">Resume</h3>
            </div>
            <div class="inst-card__body">
              <div class="cal-stat">
                <span class="cal-stat__label">Total</span>
                <span class="cal-stat__value">{{ appointments().length }}</span>
              </div>
              <div class="cal-stat">
                <span class="cal-stat__label">Confirme(s)</span>
                <span class="cal-stat__value cal-stat__value--emerald">{{ confirmedCount() }}</span>
              </div>
              <div class="cal-stat">
                <span class="cal-stat__label">En attente</span>
                <span class="cal-stat__value cal-stat__value--amber">{{ pendingCount() }}</span>
              </div>
              <div class="cal-stat">
                <span class="cal-stat__label">Annule(s)</span>
                <span class="cal-stat__value cal-stat__value--red">{{ cancelledCount() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="cal-main">

          <!-- Filter Chips -->
          <div class="inst-filters">
            <button class="inst-chip" [class.inst-chip--active]="activeFilter() === 'ALL'"
                    (click)="activeFilter.set('ALL')">
              Tous
            </button>
            <button class="inst-chip" [class.inst-chip--active]="activeFilter() === 'CONFIRMED'"
                    (click)="activeFilter.set('CONFIRMED')">
              Confirme(s)
            </button>
            <button class="inst-chip" [class.inst-chip--active]="activeFilter() === 'PENDING'"
                    (click)="activeFilter.set('PENDING')">
              En attente
            </button>
            <button class="inst-chip" [class.inst-chip--active]="activeFilter() === 'CANCELLED'"
                    (click)="activeFilter.set('CANCELLED')">
              Annule(s)
            </button>
          </div>

          <!-- Loading -->
          @if (loading()) {
            <div class="sk-list">
              @for (i of [1,2,3]; track i) {
                <div class="inst-card">
                  <div class="inst-card__body">
                    <div class="sk-row">
                      <div class="sk sk--h12 sk--w40"></div>
                      <div class="sk sk--h20 sk--w60"></div>
                      <div class="sk sk--h12 sk--full"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty State -->
          @if (!loading() && filteredByDateGroups().length === 0) {
            <div class="inst-empty">
              <ng-icon name="lucideCalendar"></ng-icon>
              <p class="inst-empty__title">Aucun rendez-vous</p>
              <p class="inst-empty__desc">Aucun rendez-vous ne correspond aux filtres selectionnes</p>
            </div>
          }

          <!-- Date-grouped Appointments -->
          @if (!loading()) {
            @for (group of filteredByDateGroups(); track group.date) {
              <div class="cal-date-group">
                <div class="cal-date-group__header">
                  <ng-icon name="lucideCalendar"></ng-icon>
                  <span class="cal-date-group__date">{{ group.date }}</span>
                  <span class="cal-date-group__count">{{ group.items.length }} RDV</span>
                </div>
                <div class="cal-date-group__list">
                  @for (appt of group.items; track appt.id) {
                    <div class="cal-card" [class.cal-card--cancelled]="appt.status === 'CANCELLED'">
                      <div class="cal-card__main">
                        <div class="cal-card__info">
                          <div class="cal-card__meta">
                            <span class="cal-card__time">
                              <ng-icon name="lucideClock"></ng-icon>
                              {{ appt.timeSlot }}
                            </span>
                            <span class="status-pill" [class]="STATUS_CONFIG[appt.status].pillClass">
                              <span class="status-pill__dot"></span>
                              {{ STATUS_CONFIG[appt.status].label }}
                            </span>
                          </div>
                          <p class="cal-card__name">{{ appt.farmerName }}</p>
                          <div class="cal-card__details">
                            <span class="cal-card__detail">
                              <ng-icon name="lucidePhone"></ng-icon>
                              {{ appt.farmerPhone }}
                            </span>
                            <span class="cal-card__detail">
                              {{ appt.topic }}
                            </span>
                          </div>
                          @if (appt.cancelReason) {
                            <p class="cal-card__reason">
                              Motif : {{ appt.cancelReason }}
                            </p>
                          }
                        </div>
                        <div class="cal-card__actions">
                          @if (appt.status !== 'CONFIRMED') {
                            <button class="inst-btn inst-btn--ghost cal-action-btn cal-action-btn--confirm"
                                    title="Confirmer"
                                    (click)="confirmAppointment(appt.id)">
                              <ng-icon name="lucideCheck"></ng-icon>
                            </button>
                          }
                          @if (appt.status !== 'CANCELLED') {
                            <button class="inst-btn inst-btn--ghost cal-action-btn cal-action-btn--cancel"
                                    title="Annuler"
                                    (click)="openCancelModal(appt)">
                              <ng-icon name="lucideBan"></ng-icon>
                            </button>
                          }
                          <button class="inst-btn inst-btn--ghost cal-action-btn cal-action-btn--delete"
                                  title="Supprimer"
                                  (click)="deleteAppointment(appt.id)">
                            <ng-icon name="lucideTrash2"></ng-icon>
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Create Appointment Modal -->
      @if (showCreateModal()) {
        <div class="inst-modal-backdrop" (click)="showCreateModal.set(false)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>Nouveau Rendez-vous</h3>
              <button class="inst-modal__close" (click)="showCreateModal.set(false)">
                <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <div class="inst-field">
                <label>Nom de l'agriculteur</label>
                <input type="text" placeholder="Ex: Mabrouk Khelifi" [(ngModel)]="newAppt.farmerName"/>
              </div>
              <div class="inst-field">
                <label>Telephone</label>
                <input type="tel" placeholder="+216 98 123 456" [(ngModel)]="newAppt.farmerPhone"/>
              </div>
              <div class="inst-field">
                <label>Date</label>
                <input type="date" [(ngModel)]="newAppt.date"/>
              </div>
              <div class="inst-field">
                <label>Creneau horaire</label>
                <select [(ngModel)]="newAppt.timeSlot">
                  <option value="" disabled>Selectionner un creneau</option>
                  <option value="08:30 - 09:00">08:30 - 09:00</option>
                  <option value="09:00 - 09:30">09:00 - 09:30</option>
                  <option value="09:30 - 10:00">09:30 - 10:00</option>
                  <option value="10:00 - 10:30">10:00 - 10:30</option>
                  <option value="10:30 - 11:00">10:30 - 11:00</option>
                  <option value="11:00 - 11:30">11:00 - 11:30</option>
                  <option value="11:30 - 12:00">11:30 - 12:00</option>
                  <option value="12:00 - 12:30">12:00 - 12:30</option>
                  <option value="14:00 - 14:30">14:00 - 14:30</option>
                  <option value="14:30 - 15:00">14:30 - 15:00</option>
                  <option value="15:00 - 15:30">15:00 - 15:30</option>
                  <option value="15:30 - 16:00">15:30 - 16:00</option>
                  <option value="16:00 - 16:30">16:00 - 16:30</option>
                </select>
              </div>
              <div class="inst-field">
                <label>Objet du rendez-vous</label>
                <textarea placeholder="Ex: Depose dossier complementaire prime d'investissement" [(ngModel)]="newAppt.topic"></textarea>
              </div>
            </div>
            <div class="inst-modal__foot">
              <button class="inst-btn inst-btn--ghost" (click)="showCreateModal.set(false)">Annuler</button>
              <button class="inst-btn inst-btn--primary" (click)="createAppointment()"
                      [disabled]="!isFormValid()">
                <ng-icon name="lucideCheck"></ng-icon>
                Creer le RDV
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Cancel Appointment Modal -->
      @if (showCancelModal()) {
        <div class="inst-modal-backdrop" (click)="showCancelModal.set(false)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>Annuler le rendez-vous</h3>
              <button class="inst-modal__close" (click)="showCancelModal.set(false)">
                <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <p class="cal-cancel-info">
                Rendez-vous de <strong>{{ cancelTarget()?.farmerName }}</strong>
                le <strong>{{ cancelTarget()?.date }}</strong> a <strong>{{ cancelTarget()?.timeSlot }}</strong>
              </p>
              <div class="inst-field">
                <label>Motif d'annulation (optionnel)</label>
                <textarea placeholder="Indiquer le motif de l'annulation..." [(ngModel)]="cancelReason"></textarea>
              </div>
            </div>
            <div class="inst-modal__foot">
              <button class="inst-btn inst-btn--ghost" (click)="showCancelModal.set(false)">Retour</button>
              <button class="inst-btn" style="background: #ef4444; color: #fff;" (click)="cancelAppointment()">
                <ng-icon name="lucideBan"></ng-icon>
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .cal-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
    }

    @media (max-width: 900px) {
      .cal-layout { grid-template-columns: 1fr; }
    }

    .cal-sidebar {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .cal-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .cal-hours__day {
      margin: 0;
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .cal-hours__slot {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    .cal-hours__slot--morning {
      background: rgba(16, 185, 129, 0.06);
      border-color: rgba(16, 185, 129, 0.18);
    }

    .cal-hours__slot--afternoon {
      background: rgba(59, 130, 246, 0.06);
      border-color: rgba(59, 130, 246, 0.18);
    }

    .cal-hours__label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .cal-hours__time {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .cal-hours__note {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .cal-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .cal-stat + .cal-stat {
      border-top: 1px solid var(--border);
    }

    .cal-stat__label {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .cal-stat__value {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .cal-stat__value--emerald { color: #22c55e; }
    .cal-stat__value--amber { color: #f59e0b; }
    .cal-stat__value--red { color: #ef4444; }

    .sk-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cal-date-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .cal-date-group__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0 4px;
    }

    .cal-date-group__header ng-icon {
      width: 15px;
      height: 15px;
      color: var(--zir-emerald);
    }

    .cal-date-group__date {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .cal-date-group__count {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .cal-date-group__list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cal-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
      transition: all 0.2s;
    }

    .cal-card:hover {
      border-color: color-mix(in srgb, var(--zir-emerald) 25%, transparent);
    }

    .cal-card--cancelled {
      opacity: 0.6;
    }

    .cal-card--cancelled:hover {
      border-color: var(--border);
    }

    .cal-card__main {
      display: flex;
      justify-content: space-between;
      gap: 14px;
    }

    .cal-card__info { flex: 1; min-width: 0; }

    .cal-card__meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .cal-card__time {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: monospace;
      color: var(--zir-emerald);
    }

    .cal-card__time ng-icon {
      width: 13px;
      height: 13px;
    }

    .cal-card__name {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .cal-card__details {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 4px;
    }

    .cal-card__detail {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .cal-card__detail ng-icon {
      width: 12px;
      height: 12px;
    }

    .cal-card__reason {
      margin: 6px 0 0;
      font-size: 0.72rem;
      color: #ef4444;
      font-style: italic;
    }

    .cal-card__actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
      align-items: flex-start;
    }

    .cal-action-btn {
      width: 34px;
      height: 34px;
      padding: 0 !important;
      justify-content: center;
      border-radius: 8px !important;
    }

    .cal-action-btn--confirm:hover {
      background: rgba(16, 185, 129, 0.12) !important;
      color: #10b981 !important;
      border-color: rgba(16, 185, 129, 0.3) !important;
    }

    .cal-action-btn--cancel:hover {
      background: rgba(245, 158, 11, 0.12) !important;
      color: #f59e0b !important;
      border-color: rgba(245, 158, 11, 0.3) !important;
    }

    .cal-action-btn--delete:hover {
      background: rgba(239, 68, 68, 0.12) !important;
      color: #ef4444 !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
    }

    .cal-cancel-info {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .cal-cancel-info strong {
      color: var(--text-primary);
    }

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
export class ApiaCalendrierComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  readonly STATUS_CONFIG = STATUS_CONFIG;

  appointments = signal<Appointment[]>([]);
  loading = signal(true);
  activeFilter = signal<'ALL' | Appointment['status']>('ALL');
  showCreateModal = signal(false);
  showCancelModal = signal(false);
  cancelTarget = signal<Appointment | null>(null);
  cancelReason = '';

  newAppt = {
    farmerName: '',
    farmerPhone: '',
    date: '',
    timeSlot: '',
    topic: '',
  };

  filteredAppointments = computed(() => {
    const filter = this.activeFilter();
    const all = this.appointments();
    if (filter === 'ALL') return all;
    return all.filter(a => a.status === filter);
  });

  filteredByDateGroups = computed(() => {
    const items = this.filteredAppointments();
    const groups = new Map<string, Appointment[]>();
    for (const a of items) {
      const existing = groups.get(a.date);
      if (existing) {
        existing.push(a);
      } else {
        groups.set(a.date, [a]);
      }
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => ({
        date,
        items: list.sort((x, y) => x.timeSlot.localeCompare(y.timeSlot)),
      }));
  });

  confirmedCount = computed(() => this.appointments().filter(a => a.status === 'CONFIRMED').length);
  pendingCount = computed(() => this.appointments().filter(a => a.status === 'PENDING').length);
  cancelledCount = computed(() => this.appointments().filter(a => a.status === 'CANCELLED').length);

  private get authHeaders() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http.get<Appointment[]>(`${environment.apiUrl}/institutions/appointments`, {
      headers: this.authHeaders,
    }).subscribe({
      next: (data) => { this.appointments.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreateModal() {
    this.newAppt = { farmerName: '', farmerPhone: '', date: '', timeSlot: '', topic: '' };
    this.showCreateModal.set(true);
  }

  isFormValid(): boolean {
    return !!(this.newAppt.farmerName && this.newAppt.farmerPhone && this.newAppt.date && this.newAppt.timeSlot && this.newAppt.topic);
  }

  createAppointment() {
    if (!this.isFormValid()) return;
    this.http.post<Appointment>(`${environment.apiUrl}/institutions/appointments`, this.newAppt, {
      headers: this.authHeaders,
    }).subscribe({
      next: () => { this.showCreateModal.set(false); this.load(); },
    });
  }

  confirmAppointment(id: string) {
    this.http.patch(`${environment.apiUrl}/institutions/appointments/${id}`, {
      status: 'CONFIRMED',
    }, { headers: this.authHeaders }).subscribe(() => this.load());
  }

  openCancelModal(appt: Appointment) {
    this.cancelTarget.set(appt);
    this.cancelReason = '';
    this.showCancelModal.set(true);
  }

  cancelAppointment() {
    const target = this.cancelTarget();
    if (!target) return;
    this.http.patch(`${environment.apiUrl}/institutions/appointments/${target.id}`, {
      status: 'CANCELLED',
      cancelReason: this.cancelReason || undefined,
    }, { headers: this.authHeaders }).subscribe({
      next: () => { this.showCancelModal.set(false); this.cancelTarget.set(null); this.load(); },
    });
  }

  deleteAppointment(id: string) {
    this.http.delete(`${environment.apiUrl}/institutions/appointments/${id}`, {
      headers: this.authHeaders,
    }).subscribe(() => this.load());
  }
}
