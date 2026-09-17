import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTractor, lucideUsers, lucideBarChart3, lucideCalendar, lucideCheckCircle,
  lucideX, lucideClock, lucidePackage, lucideMapPin, lucideDollarSign,
  lucideWrench, lucideStar, lucidePlus, lucidePower, lucideTrendingUp,
  lucideArrowUpRight, lucideLoader, lucideRefreshCw, lucideHand, lucideRotateCcw
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

interface OwnerReservation {
  id: string;
  equipment?: {
    id: string;
    name: string;
    type: string;
    brand: string;
    model: string;
    daily_rate_tnd: number;
    photo_url: string | null;
  };
  equipment_name?: string;
  equipment_type?: string;
  farmer?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
  farmer_name?: string;
  start_date: string;
  end_date: string;
  total_price_tnd: number;
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  usage_description?: string;
  delivery_needed?: boolean;
  special_requirements?: string;
  created_at: string;
  _processing?: boolean;
}

interface OwnerEquipment {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  daily_rate_tnd: number;
  hourly_rate_tnd?: number;
  deposit_required: boolean;
  deposit_amount_tnd: number;
  min_rental_days: number;
  max_rental_days: number;
  available: boolean;
  governorate: string;
  description: string;
  photo_url: string | null;
}

interface RevenueSummary {
  total_revenue_tnd: number;
  revenue_this_month: number;
  utilization_rate: number;
  most_requested_machine: string;
  average_rental_days: number;
  total_rentals: number;
  active_rentals: number;
  pending_requests: number;
  machine_performance?: Array<{
    name: string;
    revenue: number;
    rentals: number;
    utilization: number;
  }>;
}

interface CalendarDay {
  date: string;
  dayNum: number;
  month: string;
  status: 'free' | 'pending' | 'booked' | 'maintenance';
}

@Component({
  selector: 'app-equipment-owner-rentals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideTractor, lucideUsers, lucideBarChart3, lucideCalendar, lucideCheckCircle,
    lucideX, lucideClock, lucidePackage, lucideMapPin, lucideDollarSign,
    lucideWrench, lucideStar, lucidePlus, lucidePower, lucideTrendingUp,
    lucideArrowUpRight, lucideLoader, lucideRefreshCw, lucideHand, lucideRotateCcw
  })],
  template: `
    <div class="page">
      <div class="page-top">
        <h2><ng-icon name="lucideTractor"></ng-icon> Gestion des Locations</h2>
        <p class="subtitle">Gérez vos demandes, votre flotte et vos revenus</p>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'requests'" (click)="switchTab('requests')">
          <ng-icon name="lucideUsers"></ng-icon> Demandes de Location
          @if (pendingCount() > 0) {
            <span class="tab-badge">{{ pendingCount() }}</span>
          }
        </button>
        <button class="tab" [class.active]="activeTab() === 'fleet'" (click)="switchTab('fleet')">
          <ng-icon name="lucideTractor"></ng-icon> Mon Flotte
        </button>
        <button class="tab" [class.active]="activeTab() === 'analytics'" (click)="switchTab('analytics')">
          <ng-icon name="lucideBarChart3"></ng-icon> Analyses
        </button>
      </div>

      <!-- Tab 1: Demandes de Location -->
      @if (activeTab() === 'requests') {
        @if (loadingRequests()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (requests().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideUsers" class="empty-icon"></ng-icon>
            <h3>Aucune demande de location</h3>
            <p>Les demandes de location de vos équipements apparaîtront ici</p>
          </div>
        } @else {
          <!-- Status filter chips -->
          <div class="filter-chips">
            <button class="chip" [class.active]="requestFilter() === 'all'" (click)="requestFilter.set('all')">
              Toutes ({{ requests().length }})
            </button>
            <button class="chip" [class.active]="requestFilter() === 'PENDING'" (click)="requestFilter.set('PENDING')">
              En attente ({{ getCountByStatus('PENDING') }})
            </button>
            <button class="chip" [class.active]="requestFilter() === 'APPROVED'" (click)="requestFilter.set('APPROVED')">
              Confirmées ({{ getCountByStatus('APPROVED') }})
            </button>
            <button class="chip" [class.active]="requestFilter() === 'IN_PROGRESS'" (click)="requestFilter.set('IN_PROGRESS')">
              En cours ({{ getCountByStatus('IN_PROGRESS') }})
            </button>
            <button class="chip" [class.active]="requestFilter() === 'COMPLETED'" (click)="requestFilter.set('COMPLETED')">
              Terminées ({{ getCountByStatus('COMPLETED') }})
            </button>
          </div>

          <div class="request-list">
            @for (req of filteredRequests(); track req.id) {
              <div class="request-card">
                <div class="request-header">
                  <div class="request-equip">
                    <div class="equip-avatar">
                      <ng-icon name="lucideTractor"></ng-icon>
                    </div>
                    <div class="equip-info">
                      <strong>{{ req.equipment?.name || req.equipment_name || 'Matériel' }}</strong>
                      <span class="equip-type">{{ req.equipment?.type || req.equipment_type || '—' }}</span>
                    </div>
                  </div>
                  <span class="status-badge" [attr.data-status]="req.status">{{ getStatusLabel(req.status) }}</span>
                </div>

                <div class="request-body">
                  <div class="request-meta">
                    <div class="meta-row">
                      <ng-icon name="lucideUsers"></ng-icon>
                      <span class="meta-label">Locataire:</span>
                      <strong>{{ req.farmer?.name || req.farmer_name || '—' }}</strong>
                    </div>
                    <div class="meta-row">
                      <ng-icon name="lucideCalendar"></ng-icon>
                      <span class="meta-label">Période:</span>
                      <span>{{ formatDate(req.start_date) }} → {{ formatDate(req.end_date) }}</span>
                      <span class="duration-badge">{{ getDurationDays(req.start_date, req.end_date) }} jours</span>
                    </div>
                    <div class="meta-row price-row">
                      <ng-icon name="lucideDollarSign"></ng-icon>
                      <span class="meta-label">Prix total:</span>
                      <strong class="price">{{ req.total_price_tnd }} TND</strong>
                    </div>
                  </div>

                  @if (req.farmer?.rating) {
                    <div class="farmer-rating">
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="star" [class.filled]="s <= req.farmer!.rating">★</span>
                      }
                      <span class="rating-text">{{ req.farmer!.rating.toFixed(1) }}</span>
                    </div>
                  }

                  @if (req.usage_description) {
                    <div class="usage-note">
                      <small>{{ req.usage_description }}</small>
                    </div>
                  }
                </div>

                <div class="request-actions">
                  @if (req.status === 'PENDING') {
                    <button class="btn btn-accept" [disabled]="req._processing" (click)="acceptRequest(req)">
                      @if (req._processing) {
                        <span class="spinner-sm"></span>
                      } @else {
                        <ng-icon name="lucideCheckCircle"></ng-icon>
                      }
                      Accepter
                    </button>
                    <button class="btn btn-reject" [disabled]="req._processing" (click)="rejectRequest(req)">
                      @if (req._processing) {
                        <span class="spinner-sm"></span>
                      } @else {
                        <ng-icon name="lucideX"></ng-icon>
                      }
                      Refuser
                    </button>
                  } @else if (req.status === 'APPROVED') {
                    <button class="btn btn-handover" [disabled]="req._processing" (click)="handoverMaterial(req)">
                      @if (req._processing) {
                        <span class="spinner-sm"></span>
                      } @else {
                        <ng-icon name="lucideHand"></ng-icon>
                      }
                      Remettre le Matériel
                    </button>
                  } @else if (req.status === 'IN_PROGRESS') {
                    <button class="btn btn-return" [disabled]="req._processing" (click)="acceptReturn(req)">
                      @if (req._processing) {
                        <span class="spinner-sm"></span>
                      } @else {
                        <ng-icon name="lucideRotateCcw"></ng-icon>
                      }
                      Accepter le Retour
                    </button>
                  } @else if (req.status === 'COMPLETED') {
                    <div class="completed-badge">
                      <ng-icon name="lucideCheckCircle"></ng-icon>
                      Location terminée
                    </div>
                  } @else if (req.status === 'REJECTED') {
                    <div class="rejected-badge">
                      <ng-icon name="lucideX"></ng-icon>
                      Demande refusée
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Tab 2: Mon Flotte -->
      @if (activeTab() === 'fleet') {
        <div class="fleet-header">
          <h3>{{ myEquipment().length }} équipement(s) dans votre flotte</h3>
          <button class="btn btn-primary" (click)="showAddForm.set(true)">
            <ng-icon name="lucidePlus"></ng-icon> Ajouter du Matériel
          </button>
        </div>

        @if (loadingFleet()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (myEquipment().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideTractor" class="empty-icon"></ng-icon>
            <h3>Flotte vide</h3>
            <p>Ajoutez votre premier équipement pour commencer à louer</p>
            <button class="btn btn-primary" (click)="showAddForm.set(true)">
              <ng-icon name="lucidePlus"></ng-icon> Ajouter du Matériel
            </button>
          </div>
        } @else {
          <div class="fleet-grid">
            @for (eq of myEquipment(); track eq.id) {
              <div class="fleet-card">
                <div class="fleet-card-header">
                  <div class="fleet-type-badge">{{ eq.type }}</div>
                  <div class="availability-toggle">
                    <label class="toggle-label">
                      <input type="checkbox" [checked]="eq.available"
                        (change)="toggleAvailability(eq)" class="toggle-input" />
                      <span class="toggle-switch"></span>
                      <span class="toggle-text">{{ eq.available ? 'Disponible' : 'Indisponible' }}</span>
                    </label>
                  </div>
                </div>

                <div class="fleet-card-body">
                  <h4>{{ eq.brand }} {{ eq.model }}</h4>

                  <div class="fleet-details">
                    <div class="detail-item">
                      <span class="detail-label">Année</span>
                      <span class="detail-value">{{ eq.year || '—' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Tarif/jour</span>
                      <span class="detail-value price">{{ eq.daily_rate_tnd }} TND</span>
                    </div>
                    @if (eq.hourly_rate_tnd) {
                      <div class="detail-item">
                        <span class="detail-label">Tarif/heure</span>
                        <span class="detail-value">{{ eq.hourly_rate_tnd }} TND</span>
                      </div>
                    }
                    <div class="detail-item">
                      <span class="detail-label">Caution</span>
                      <span class="detail-value">{{ eq.deposit_required ? eq.deposit_amount_tnd + ' TND' : 'Non' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Durée min/max</span>
                      <span class="detail-value">{{ eq.min_rental_days }}-{{ eq.max_rental_days }} j</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Gouvernorat</span>
                      <span class="detail-value location"><ng-icon name="lucideMapPin"></ng-icon> {{ eq.governorate }}</span>
                    </div>
                  </div>

                  <div class="condition-section">
                    <span class="detail-label">État</span>
                    <div class="condition-stars">
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="star" [class.filled]="s <= getConditionRating(eq.condition)">★</span>
                      }
                      <span class="condition-text">{{ eq.condition }}</span>
                    </div>
                  </div>

                  @if (eq.description) {
                    <p class="equip-description">{{ eq.description }}</p>
                  }
                </div>

                <!-- Mini calendar for this equipment -->
                <div class="fleet-calendar">
                  <h5><ng-icon name="lucideCalendar"></ng-icon> Disponibilité</h5>
                  <div class="cal-month-nav">
                    <button class="cal-nav-btn" (click)="prevMonth(eq.id)">
                      <ng-icon name="lucideX"></ng-icon>
                    </button>
                    <span class="cal-month-label">{{ getCalMonthLabel(eq.id) }}</span>
                    <button class="cal-nav-btn" (click)="nextMonth(eq.id)">
                      <ng-icon name="lucideCheckCircle"></ng-icon>
                    </button>
                  </div>
                  <div class="cal-weekdays">
                    @for (d of WEEKDAYS_FR; track d) {
                      <span class="cal-wd">{{ d }}</span>
                    }
                  </div>
                  <div class="cal-days">
                    @for (day of getCalendarDays(eq.id); track day.date) {
                      <div class="cal-day"
                        [class.free]="day.status === 'free'"
                        [class.pending]="day.status === 'pending'"
                        [class.booked]="day.status === 'booked'"
                        [class.maintenance]="day.status === 'maintenance'"
                        [class.other-month]="day.month !== 'current'">
                        {{ day.dayNum }}
                      </div>
                    }
                  </div>
                  <div class="cal-legend">
                    <span class="legend-item"><span class="legend-dot free"></span> Libre</span>
                    <span class="legend-item"><span class="legend-dot pending"></span> En attente</span>
                    <span class="legend-item"><span class="legend-dot booked"></span> Réservé</span>
                    <span class="legend-item"><span class="legend-dot maintenance"></span> Maintenance</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Add Equipment Modal -->
        @if (showAddForm()) {
          <div class="modal-backdrop" (click)="showAddForm.set(false)">
            <div class="modal" (click)="$event.stopPropagation()">
              <button class="modal-close" (click)="showAddForm.set(false)">
                <ng-icon name="lucideX"></ng-icon>
              </button>
              <h3>
                <ng-icon name="lucidePlus"></ng-icon>
                Ajouter du Matériel
              </h3>
              <div class="modal-body">
                <div class="form-row">
                  <div class="modal-field">
                    <label>Type de matériel</label>
                    <select [(ngModel)]="newEquipment.type" class="form-el">
                      <option value="">Sélectionner...</option>
                      @for (t of EQUIPMENT_TYPES; track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
                  </div>
                  <div class="modal-field">
                    <label>Marque</label>
                    <input type="text" [(ngModel)]="newEquipment.brand" class="form-el" placeholder="Ex: John Deere" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="modal-field">
                    <label>Modèle</label>
                    <input type="text" [(ngModel)]="newEquipment.model" class="form-el" placeholder="Ex: 6120M" />
                  </div>
                  <div class="modal-field">
                    <label>Année</label>
                    <input type="number" [(ngModel)]="newEquipment.year" class="form-el" placeholder="2024" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="modal-field">
                    <label>Tarif journalier (TND)</label>
                    <input type="number" [(ngModel)]="newEquipment.daily_rate_tnd" class="form-el" placeholder="150" />
                  </div>
                  <div class="modal-field">
                    <label>Tarif horaire (TND)</label>
                    <input type="number" [(ngModel)]="newEquipment.hourly_rate_tnd" class="form-el" placeholder="25" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="modal-field">
                    <label class="toggle-label">
                      <input type="checkbox" [(ngModel)]="newEquipment.deposit_required" class="toggle-input" />
                      <span class="toggle-switch"></span>
                      Caution requise
                    </label>
                  </div>
                  @if (newEquipment.deposit_required) {
                    <div class="modal-field">
                      <label>Montant caution (TND)</label>
                      <input type="number" [(ngModel)]="newEquipment.deposit_amount_tnd" class="form-el" placeholder="500" />
                    </div>
                  }
                </div>

                <div class="form-row">
                  <div class="modal-field">
                    <label>Durée min (jours)</label>
                    <input type="number" [(ngModel)]="newEquipment.min_rental_days" class="form-el" placeholder="1" />
                  </div>
                  <div class="modal-field">
                    <label>Durée max (jours)</label>
                    <input type="number" [(ngModel)]="newEquipment.max_rental_days" class="form-el" placeholder="30" />
                  </div>
                </div>

                <div class="modal-field">
                  <label>Gouvernorat</label>
                  <input type="text" [(ngModel)]="newEquipment.governorate" class="form-el" placeholder="Ex: Sousse" />
                </div>

                <div class="modal-field">
                  <label>Description</label>
                  <textarea [(ngModel)]="newEquipment.description" class="form-el" rows="3"
                    placeholder="Décrivez votre équipement..."></textarea>
                </div>

                <button class="btn btn-primary btn-submit" (click)="addEquipment()"
                  [disabled]="addingEquipment()">
                  @if (addingEquipment()) {
                    <span class="spinner-sm"></span> Ajout en cours...
                  } @else {
                    <ng-icon name="lucidePlus"></ng-icon> Ajouter
                  }
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- Tab 3: Analyses -->
      @if (activeTab() === 'analytics') {
        @if (loadingRevenue()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else {
          <!-- Stats cards -->
          <div class="stats-grid">
            <div class="stat-card revenue-card">
              <div class="stat-icon revenue-icon"><ng-icon name="lucideDollarSign"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ revenueSummary()?.revenue_this_month || 0 | number:'1.0-0' }} TND</span>
                <span class="stat-label">Revenus ce mois</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon utilization-icon"><ng-icon name="lucideTrendingUp"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ revenueSummary()?.utilization_rate || 0 }}%</span>
                <span class="stat-label">Taux d'utilisation</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon rentals-icon"><ng-icon name="lucidePackage"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ revenueSummary()?.total_rentals || 0 }}</span>
                <span class="stat-label">Total locations</span>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon active-icon"><ng-icon name="lucideClock"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ revenueSummary()?.active_rentals || 0 }}</span>
                <span class="stat-label">Locations actives</span>
              </div>
            </div>
          </div>

          <!-- Additional insights -->
          <div class="insights-grid">
            <div class="insight-card">
              <h4><ng-icon name="lucideStar"></ng-icon> Matériel le plus demandé</h4>
              <div class="insight-value">{{ revenueSummary()?.most_requested_machine || '—' }}</div>
            </div>

            <div class="insight-card">
              <h4><ng-icon name="lucideCalendar"></ng-icon> Durée moyenne</h4>
              <div class="insight-value">{{ revenueSummary()?.average_rental_days || 0 }} jours</div>
            </div>

            <div class="insight-card">
              <h4><ng-icon name="lucideWrench"></ng-icon> Revenus totaux</h4>
              <div class="insight-value">{{ revenueSummary()?.total_revenue_tnd || 0 | number:'1.0-0' }} TND</div>
            </div>

            <div class="insight-card">
              <h4><ng-icon name="lucideUsers"></ng-icon> Demandes en attente</h4>
              <div class="insight-value">{{ revenueSummary()?.pending_requests || 0 }}</div>
            </div>
          </div>

          <!-- Machine performance -->
          @if (revenueSummary()?.machine_performance && revenueSummary()!.machine_performance!.length > 0) {
            <div class="performance-section">
              <h4><ng-icon name="lucideBarChart3"></ng-icon> Performance par Machine</h4>
              <div class="performance-list">
                @for (m of revenueSummary()!.machine_performance!; track m.name) {
                  <div class="performance-row">
                    <div class="perf-info">
                      <span class="perf-name">{{ m.name }}</span>
                      <span class="perf-details">{{ m.rentals }} locations · {{ m.utilization }}% utilisation</span>
                    </div>
                    <div class="perf-bar-container">
                      <div class="perf-bar" [style.width.%]="m.utilization"></div>
                    </div>
                    <span class="perf-revenue">{{ m.revenue | number:'1.0-0' }} TND</span>
                  </div>
                }
              </div>
            </div>
          }

          <div class="stats-row-bottom">
            <div class="stat-card">
              <div class="stat-icon pending-icon"><ng-icon name="lucideClock"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ pendingCount() }}</span>
                <span class="stat-label">En attente</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon completed-icon"><ng-icon name="lucideCheckCircle"></ng-icon></div>
              <div class="stat-content">
                <span class="stat-value">{{ getCountByStatus('COMPLETED') }}</span>
                <span class="stat-label">Terminées</span>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .page { padding: 20px; max-width: 1100px; margin: 0 auto; }
    .page-top { margin-bottom: 14px; }
    .page-top h2 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .page-top h2 ng-icon { width: 22px; height: 22px; color: var(--zir-emerald); }
    .subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 4px 0 0; }

    .tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: 12px; padding: 3px; margin-bottom: 18px; }
    .tab { flex: 1; padding: 10px 14px; border: none; border-radius: 10px; background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .tab ng-icon { width: 16px; height: 16px; }
    .tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .tab-badge { background: #ef4444; color: white; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--zir-emerald); color: white; }
    .btn-accept { background: var(--zir-emerald); color: white; }
    .btn-reject { background: #ef4444; color: white; }
    .btn-handover { background: #3b82f6; color: white; }
    .btn-return { background: #8b5cf6; color: white; }
    .btn-submit { width: 100%; justify-content: center; padding: 12px; margin-top: 4px; }

    .form-el { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; }
    .form-el:focus { border-color: var(--zir-emerald); }
    select.form-el { appearance: none; cursor: pointer; }

    /* Filter chips */
    .filter-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .chip { padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 20px; background: var(--bg-primary); color: var(--text-secondary); font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .chip:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .chip.active { background: var(--zir-emerald); color: white; border-color: var(--zir-emerald); }

    /* Request list */
    .request-list { display: flex; flex-direction: column; gap: 12px; }
    .request-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: all 0.15s; }
    .request-card:hover { border-color: var(--zir-emerald); }
    .request-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 0; }
    .request-equip { display: flex; align-items: center; gap: 10px; }
    .equip-avatar { width: 40px; height: 40px; border-radius: 10px; background: var(--zir-emerald-alpha-10); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .equip-avatar ng-icon { width: 20px; height: 20px; color: var(--zir-emerald); }
    .equip-info { display: flex; flex-direction: column; }
    .equip-info strong { font-size: 0.95rem; color: var(--text-primary); }
    .equip-type { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
    .status-badge[data-status="PENDING"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .status-badge[data-status="APPROVED"] { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .status-badge[data-status="IN_PROGRESS"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .status-badge[data-status="COMPLETED"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .status-badge[data-status="REJECTED"] { background: rgba(239,68,68,0.1); color: #ef4444; }

    .request-body { padding: 14px 18px; }
    .request-meta { display: flex; flex-direction: column; gap: 8px; }
    .meta-row { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); }
    .meta-row ng-icon { width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0; }
    .meta-label { color: var(--text-muted); font-weight: 600; }
    .meta-row strong { color: var(--text-primary); }
    .duration-badge { font-size: 0.7rem; background: var(--bg-secondary); padding: 2px 7px; border-radius: 5px; font-weight: 600; margin-left: auto; }
    .price-row { margin-top: 4px; }
    .price { color: var(--zir-emerald); font-size: 1rem; font-weight: 800; }

    .farmer-rating { display: flex; align-items: center; gap: 1px; margin-top: 8px; }
    .farmer-rating .star { font-size: 0.8rem; color: var(--border); }
    .farmer-rating .star.filled { color: #f59e0b; }
    .rating-text { font-size: 0.72rem; color: var(--text-muted); margin-left: 4px; font-weight: 600; }

    .usage-note { font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; font-style: italic; padding: 8px 10px; background: var(--bg-secondary); border-radius: 8px; }

    .request-actions { padding: 12px 18px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }
    .completed-badge, .rejected-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; font-weight: 600; padding: 6px 12px; border-radius: 8px; }
    .completed-badge { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .completed-badge ng-icon, .rejected-badge ng-icon { width: 14px; height: 14px; }
    .rejected-badge { background: rgba(239,68,68,0.08); color: #ef4444; }

    /* Fleet */
    .fleet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .fleet-header h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .fleet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
    .fleet-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: all 0.15s; }
    .fleet-card:hover { border-color: var(--zir-emerald); }
    .fleet-card-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border); }
    .fleet-type-badge { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }

    .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
    .toggle-input { display: none; }
    .toggle-switch { width: 36px; height: 20px; border-radius: 10px; background: var(--border); position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-switch::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle-input:checked + .toggle-switch { background: var(--zir-emerald); }
    .toggle-input:checked + .toggle-switch::after { transform: translateX(16px); }
    .toggle-text { color: var(--text-secondary); }

    .fleet-card-body { padding: 14px 16px; }
    .fleet-card-body h4 { margin: 0 0 12px; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .fleet-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .detail-item { display: flex; flex-direction: column; gap: 2px; }
    .detail-label { font-size: 0.68rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .detail-value { font-size: 0.85rem; color: var(--text-primary); font-weight: 600; }
    .detail-value.price { color: var(--zir-emerald); font-weight: 800; }
    .detail-value.location { display: flex; align-items: center; gap: 3px; }
    .detail-value.location ng-icon { width: 12px; height: 12px; }

    .condition-section { margin-bottom: 10px; }
    .condition-stars { display: flex; align-items: center; gap: 1px; margin-top: 4px; }
    .condition-stars .star { font-size: 0.82rem; color: var(--border); }
    .condition-stars .star.filled { color: #f59e0b; }
    .condition-text { font-size: 0.72rem; color: var(--text-muted); margin-left: 6px; font-weight: 600; }

    .equip-description { font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; margin: 0; }

    /* Fleet calendar */
    .fleet-calendar { padding: 14px 16px; border-top: 1px solid var(--border); }
    .fleet-calendar h5 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
    .fleet-calendar h5 ng-icon { width: 14px; height: 14px; color: var(--zir-emerald); }

    .cal-month-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .cal-nav-btn { background: none; border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; }
    .cal-nav-btn ng-icon { width: 12px; height: 12px; }
    .cal-nav-btn:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .cal-month-label { font-size: 0.78rem; font-weight: 700; color: var(--text-primary); }

    .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
    .cal-wd { text-align: center; font-size: 0.62rem; font-weight: 700; color: var(--text-muted); padding: 2px; }
    .cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .cal-day { text-align: center; padding: 4px 2px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-secondary); }
    .cal-day.free { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .cal-day.pending { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .cal-day.booked { background: rgba(239,68,68,0.1); color: #ef4444; }
    .cal-day.maintenance { background: rgba(100,116,139,0.15); color: var(--text-muted); }
    .cal-day.other-month { opacity: 0.3; }

    .cal-legend { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.66rem; color: var(--text-muted); font-weight: 600; }
    .legend-dot { width: 8px; height: 8px; border-radius: 3px; }
    .legend-dot.free { background: var(--zir-emerald); }
    .legend-dot.pending { background: #f59e0b; }
    .legend-dot.booked { background: #ef4444; }
    .legend-dot.maintenance { background: var(--text-muted); }

    /* Analytics */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    .stat-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .stat-card.revenue-card { border-color: var(--zir-emerald); }
    .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon ng-icon { width: 22px; height: 22px; }
    .revenue-icon { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .utilization-icon { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .rentals-icon { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    .active-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .pending-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .completed-icon { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .stat-content { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 3px; }

    .insights-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 768px) { .insights-grid { grid-template-columns: repeat(2, 1fr); } }
    .insight-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .insight-card h4 { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin: 0 0 8px; }
    .insight-card h4 ng-icon { width: 14px; height: 14px; color: var(--zir-emerald); }
    .insight-value { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }

    .performance-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .performance-section h4 { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin: 0 0 14px; }
    .performance-section h4 ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .performance-list { display: flex; flex-direction: column; gap: 12px; }
    .performance-row { display: flex; align-items: center; gap: 14px; }
    .perf-info { min-width: 160px; }
    .perf-name { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
    .perf-details { font-size: 0.72rem; color: var(--text-muted); }
    .perf-bar-container { flex: 1; height: 10px; background: var(--bg-secondary); border-radius: 5px; overflow: hidden; }
    .perf-bar { height: 100%; background: var(--zir-emerald); border-radius: 5px; transition: width 0.8s ease; }
    .perf-revenue { font-size: 0.85rem; font-weight: 800; color: var(--zir-emerald); min-width: 80px; text-align: right; }

    .stats-row-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .form-row { display: flex; gap: 12px; }
    .form-row .modal-field { flex: 1; }

    .modal-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .modal-field label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
    .modal-field label ng-icon { width: 14px; height: 14px; }

    /* Loading / Empty */
    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .empty-state p { margin: 0 0 16px; font-size: 0.85rem; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 520px; max-width: 92vw; position: relative; max-height: 90vh; overflow-y: auto; }
    .modal-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text-muted); cursor: pointer; z-index: 1; }
    .modal-close ng-icon { width: 20px; height: 20px; }
    .modal h3 { margin: 0 0 18px; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .modal h3 ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .modal-body { display: flex; flex-direction: column; gap: 4px; }
  `]
})
export class EquipmentOwnerRentalsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly activeTab = signal<'requests' | 'fleet' | 'analytics'>('requests');
  readonly requests = signal<OwnerReservation[]>([]);
  readonly myEquipment = signal<OwnerEquipment[]>([]);
  readonly revenueSummary = signal<RevenueSummary | null>(null);
  readonly loadingRequests = signal(false);
  readonly loadingFleet = signal(false);
  readonly loadingRevenue = signal(false);
  readonly addingEquipment = signal(false);
  readonly showAddForm = signal(false);
  readonly requestFilter = signal<'all' | 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'>('all');

  readonly EQUIPMENT_TYPES = [
    'Tracteur', 'Moissonneuse', 'Semoir', 'Pulvérisateur', 'Tondeuse',
    'Chargeur', 'Remorque', 'Système d\'irrigation', 'Autre'
  ];
  readonly WEEKDAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  newEquipment = {
    type: '', brand: '', model: '', year: 2024,
    daily_rate_tnd: 0, hourly_rate_tnd: 0,
    deposit_required: false, deposit_amount_tnd: 0,
    min_rental_days: 1, max_rental_days: 30,
    governorate: '', description: ''
  };

  private calMonthOffsets = new Map<string, number>();

  ngOnInit() {
    this.loadRequests();
    this.loadFleet();
    this.loadRevenue();
  }

  switchTab(tab: 'requests' | 'fleet' | 'analytics') {
    this.activeTab.set(tab);
  }

  // ─── Requests ───

  loadRequests() {
    this.loadingRequests.set(true);
    this.http.get<OwnerReservation[]>(`${environment.apiUrl}/equipment/reservations`).subscribe({
      next: (d) => { this.requests.set(Array.isArray(d) ? d : []); this.loadingRequests.set(false); },
      error: () => this.loadingRequests.set(false)
    });
  }

  filteredRequests(): OwnerReservation[] {
    const f = this.requestFilter();
    if (f === 'all') return this.requests();
    return this.requests().filter(r => r.status === f);
  }

  getCountByStatus(status: string): number {
    return this.requests().filter(r => r.status === status).length;
  }

  pendingCount(): number {
    return this.getCountByStatus('PENDING');
  }

  acceptRequest(req: OwnerReservation) {
    req._processing = true;
    this.http.patch<OwnerReservation>(`${environment.apiUrl}/equipment/reservations/${req.id}/accept`, {}).subscribe({
      next: (updated) => {
        this.requests.update(list => list.map(r => r.id === req.id ? { ...r, status: 'APPROVED', _processing: false } : r));
        this.toast.success('Demande acceptée', 'Le locataire a été notifié');
      },
      error: () => { req._processing = false; this.toast.error('Erreur', 'Impossible d\'accepter la demande'); }
    });
  }

  rejectRequest(req: OwnerReservation) {
    req._processing = true;
    this.http.patch<OwnerReservation>(`${environment.apiUrl}/equipment/reservations/${req.id}/reject`, {}).subscribe({
      next: () => {
        this.requests.update(list => list.map(r => r.id === req.id ? { ...r, status: 'REJECTED', _processing: false } : r));
        this.toast.success('Demande refusée', 'Le locataire a été notifié');
      },
      error: () => { req._processing = false; this.toast.error('Erreur', 'Impossible de refuser la demande'); }
    });
  }

  handoverMaterial(req: OwnerReservation) {
    req._processing = true;
    this.http.patch<OwnerReservation>(`${environment.apiUrl}/equipment/reservations/${req.id}/start`, {}).subscribe({
      next: () => {
        this.requests.update(list => list.map(r => r.id === req.id ? { ...r, status: 'IN_PROGRESS', _processing: false } : r));
        this.toast.success('Matériel remis', 'La location est maintenant en cours');
      },
      error: () => { req._processing = false; this.toast.error('Erreur', 'Impossible de remettre le matériel'); }
    });
  }

  acceptReturn(req: OwnerReservation) {
    req._processing = true;
    this.http.patch<OwnerReservation>(`${environment.apiUrl}/equipment/reservations/${req.id}/complete`, {}).subscribe({
      next: () => {
        this.requests.update(list => list.map(r => r.id === req.id ? { ...r, status: 'COMPLETED', _processing: false } : r));
        this.toast.success('Retour accepté', 'La location est terminée');
      },
      error: () => { req._processing = false; this.toast.error('Erreur', 'Impossible d\'accepter le retour'); }
    });
  }

  // ─── Fleet ───

  loadFleet() {
    this.loadingFleet.set(true);
    this.http.get<OwnerEquipment[]>(`${environment.apiUrl}/equipment/my`).subscribe({
      next: (d) => { this.myEquipment.set(Array.isArray(d) ? d : []); this.loadingFleet.set(false); },
      error: () => this.loadingFleet.set(false)
    });
  }

  toggleAvailability(eq: OwnerEquipment) {
    const newStatus = !eq.available;
    this.http.patch(`${environment.apiUrl}/equipment/${eq.id}/toggle-availability`, {}).subscribe({
      next: () => {
        this.myEquipment.update(list => list.map(e => e.id === eq.id ? { ...e, available: newStatus } : e));
        this.toast.success(newStatus ? 'Activé' : 'Désactivé', `${eq.brand} ${eq.model} est maintenant ${newStatus ? 'disponible' : 'indisponible'}`);
      }
    });
  }

  addEquipment() {
    if (!this.newEquipment.type || !this.newEquipment.brand) {
      this.toast.error('Champs requis', 'Veuillez remplir le type et la marque');
      return;
    }
    this.addingEquipment.set(true);
    this.http.post<OwnerEquipment>(`${environment.apiUrl}/equipment`, this.newEquipment).subscribe({
      next: (eq) => {
        this.myEquipment.update(list => [...list, eq]);
        this.showAddForm.set(false);
        this.addingEquipment.set(false);
        this.resetNewEquipment();
        this.toast.success('Équipement ajouté', `${eq.brand} ${eq.model} a été ajouté à votre flotte`);
      },
      error: () => {
        this.addingEquipment.set(false);
        this.toast.error('Erreur', 'Impossible d\'ajouter l\'équipement');
      }
    });
  }

  private resetNewEquipment() {
    this.newEquipment = {
      type: '', brand: '', model: '', year: 2024,
      daily_rate_tnd: 0, hourly_rate_tnd: 0,
      deposit_required: false, deposit_amount_tnd: 0,
      min_rental_days: 1, max_rental_days: 30,
      governorate: '', description: ''
    };
  }

  // ─── Calendar ───

  getCalMonthLabel(eqId: string): string {
    const offset = this.calMonthOffsets.get(eqId) || 0;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' });
  }

  prevMonth(eqId: string) {
    const current = this.calMonthOffsets.get(eqId) || 0;
    this.calMonthOffsets.set(eqId, current - 1);
  }

  nextMonth(eqId: string) {
    const current = this.calMonthOffsets.get(eqId) || 0;
    this.calMonthOffsets.set(eqId, current + 1);
  }

  getCalendarDays(eqId: string): CalendarDay[] {
    const offset = this.calMonthOffsets.get(eqId) || 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + offset;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;

    const days: CalendarDay[] = [];
    const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, -startOffset + i + 1);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        month: 'prev',
        status: 'free'
      });
    }

    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();

      let status: 'free' | 'pending' | 'booked' | 'maintenance' = 'free';
      if (isToday) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          status = 'free';
        }
      }

      const matchedRequest = this.requests().find(r => {
        const eq = r.equipment;
        if (eq && eq.id !== eqId) return false;
        if (!eq && r.equipment_name !== this.getEquipmentName(eqId)) return false;
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        return d >= start && d <= end;
      });

      if (matchedRequest) {
        if (matchedRequest.status === 'PENDING') status = 'pending';
        else if (matchedRequest.status === 'APPROVED' || matchedRequest.status === 'IN_PROGRESS') status = 'booked';
      }

      days.push({ date: dateStr, dayNum, month: 'current', status });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayNum: i,
        month: 'next',
        status: 'free'
      });
    }

    return days;
  }

  private getEquipmentName(eqId: string): string {
    const eq = this.myEquipment().find(e => e.id === eqId);
    return eq ? `${eq.brand} ${eq.model}` : '';
  }

  // ─── Revenue ───

  loadRevenue() {
    this.loadingRevenue.set(true);
    this.http.get<any>(`${environment.apiUrl}/equipment/revenue/summary`).subscribe({
      next: (d) => {
        if (d) {
          this.revenueSummary.set({
            total_revenue_tnd: d.total_revenue || d.total_revenue_tnd || 0,
            revenue_this_month: d.revenue_this_month || d.total_revenue || 0,
            utilization_rate: d.utilization_rate || 75,
            most_requested_machine: d.most_requested_machine || '—',
            average_rental_days: d.average_rental_days || 0,
            total_rentals: d.total_rentals || 0,
            active_rentals: d.active_rentals || 0,
            pending_requests: this.pendingCount(),
            machine_performance: d.machine_performance || []
          });
        }
        this.loadingRevenue.set(false);
      },
      error: () => this.loadingRevenue.set(false)
    });
  }

  // ─── Helpers ───

  getConditionRating(condition: string): number {
    const map: Record<string, number> = {
      'excellent': 5, 'très bon': 5, 'comme neuf': 5,
      'bon': 4, 'très bien': 4,
      'correct': 3, 'moyen': 3,
      'usé': 2, 'passable': 2,
      'mauvais': 1, 'mauvaise': 1,
    };
    return map[(condition || '').toLowerCase()] || 3;
  }

  getDurationDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente',
      'APPROVED': 'Confirmée',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminée',
      'REJECTED': 'Refusée',
    };
    return labels[status] || status;
  }

  private dfDate = new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });

  formatDate(d: string): string {
    return d ? this.dfDate.format(new Date(d)) : '—';
  }
}
