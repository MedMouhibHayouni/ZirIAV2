import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTractor, lucideSearch, lucideMapPin, lucideCalendar, lucideDollarSign,
  lucideX, lucideCheckCircle, lucideClock, lucideEye, lucideStar, lucideSend,
  lucidePackage, lucideFilter, lucideChevronRight, lucideWrench, lucideUser,
  lucideTruck
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  daily_rate_tnd: number;
  deposit_tnd: number;
  governorate: string;
  description: string;
  photo_url: string | null;
  owner?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    governorate: string;
  };
  available_from?: string;
  available_to?: string;
}

interface EquipmentReservation {
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
  start_date: string;
  end_date: string;
  total_price_tnd: number;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  usage_description?: string;
  delivery_needed?: boolean;
  special_requirements?: string;
  created_at: string;
}

@Component({
  selector: 'app-farmer-services-equipment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideTractor, lucideSearch, lucideMapPin, lucideCalendar, lucideDollarSign,
    lucideX, lucideCheckCircle, lucideClock, lucideEye, lucideStar, lucideSend,
    lucidePackage, lucideFilter, lucideChevronRight, lucideWrench, lucideUser,
    lucideTruck
  })],
  template: `
    <div class="page">
      <div class="page-top">
        <h2><ng-icon name="lucideTractor"></ng-icon> Matériel Agricole</h2>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'browse'" (click)="switchTab('browse')">
          Parcourir
        </button>
        <button class="tab" [class.active]="activeTab() === 'rentals'" (click)="switchTab('rentals')">
          Mes Locations
        </button>
      </div>

      <!-- Tab 1: Parcourir / Browse -->
      @if (activeTab() === 'browse') {
        <div class="filter-bar">
          <div class="filter-group">
            <label>Type de matériel</label>
            <div class="filter-chips">
              @for (t of EQUIPMENT_TYPES; track t) {
                <button class="chip" [class.active]="selectedTypes().includes(t)" (click)="toggleType(t)">
                  {{ t }}
                </button>
              }
            </div>
          </div>
          <div class="filter-row">
            <div class="filter-field">
              <label><ng-icon name="lucideMapPin"></ng-icon> Gouvernorat</label>
              <input type="text" [(ngModel)]="search.governorate" placeholder="Ex: Sousse" class="form-el" />
            </div>
            <div class="filter-field">
              <label><ng-icon name="lucideCalendar"></ng-icon> Disponible depuis</label>
              <input type="date" [(ngModel)]="search.startDate" class="form-el" />
            </div>
            <div class="filter-field">
              <label><ng-icon name="lucideCalendar"></ng-icon> Disponible jusqu'à</label>
              <input type="date" [(ngModel)]="search.endDate" class="form-el" />
            </div>
            <button class="btn btn-primary btn-search" (click)="searchEquip()" [disabled]="searching()">
              @if (searching()) {
                <span class="spinner-sm"></span>
              } @else {
                <ng-icon name="lucideSearch"></ng-icon>
              }
              Chercher
            </button>
          </div>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon browse-icon"><ng-icon name="lucideTractor"></ng-icon></div>
            <div class="stat-info">
              <span class="stat-value">{{ available().length }}</span>
              <span class="stat-label">Disponibles</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon rental-icon"><ng-icon name="lucidePackage"></ng-icon></div>
            <div class="stat-info">
              <span class="stat-value">{{ myRentals().length }}</span>
              <span class="stat-label">Mes locations</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon pending-icon"><ng-icon name="lucideClock"></ng-icon></div>
            <div class="stat-info">
              <span class="stat-value">{{ pendingCount() }}</span>
              <span class="stat-label">En attente</span>
            </div>
          </div>
        </div>

        @if (searching()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (available().length > 0) {
          <h3>{{ available().length }} résultat(s)</h3>
          <div class="equip-grid">
            @for (eq of available(); track eq.id) {
              <div class="equip-card" (click)="openDetails(eq)">
                <div class="equip-photo">
                  @if (eq.photo_url) {
                    <img [src]="eq.photo_url" [alt]="eq.name" />
                  } @else {
                    <div class="equip-photo-placeholder">
                      <ng-icon name="lucideTractor"></ng-icon>
                    </div>
                  }
                </div>
                <div class="equip-body">
                  <div class="equip-type-badge">{{ eq.type }}</div>
                  <div class="equip-name">{{ eq.brand || '' }} {{ eq.model || eq.name }}</div>
                  <div class="equip-meta">
                    @if (eq.year) {
                      <span class="meta-pill"><ng-icon name="lucideCalendar"></ng-icon> {{ eq.year }}</span>
                    }
                    <span class="meta-pill location"><ng-icon name="lucideMapPin"></ng-icon> {{ eq.governorate }}</span>
                  </div>
                  <div class="equip-condition">
                    @for (s of [1,2,3,4,5]; track s) {
                      <span class="star" [class.filled]="s <= getConditionRating(eq.condition)">★</span>
                    }
                    <span class="condition-text">{{ eq.condition }}</span>
                  </div>
                  <div class="equip-bottom">
                    <div class="equip-price">
                      <strong>{{ eq.daily_rate_tnd }}</strong> <span>TND/j</span>
                      @if (eq.deposit_tnd) {
                        <small class="deposit">Caution: {{ eq.deposit_tnd }} TND</small>
                      }
                    </div>
                    <button class="btn-sm primary" (click)="$event.stopPropagation(); openRentForm(eq)">
                      <ng-icon name="lucideChevronRight"></ng-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (!searching() && searchedOnce()) {
          <div class="empty-state">
            <ng-icon name="lucideTractor" class="empty-icon"></ng-icon>
            <h3>Aucun matériel trouvé</h3>
            <p>Essayez d'élargir vos critères de recherche</p>
          </div>
        } @else {
          <div class="empty-state">
            <ng-icon name="lucideFilter" class="empty-icon"></ng-icon>
            <h3>Recherchez du matériel</h3>
            <p>Utilisez les filtres ci-dessus pour trouver du matériel disponible dans votre région</p>
          </div>
        }
      }

      <!-- Tab 2: Mes Locations -->
      @if (activeTab() === 'rentals') {
        @if (loadingRentals()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (myRentals().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucidePackage" class="empty-icon"></ng-icon>
            <h3>Aucune location</h3>
            <p>Parcourez le matériel disponible pour faire votre première réservation</p>
            <button class="btn btn-primary" (click)="switchTab('browse')">
              <ng-icon name="lucideSearch"></ng-icon> Parcourir le matériel
            </button>
          </div>
        } @else {
          <div class="rental-list">
            @for (r of myRentals(); track r.id) {
              <div class="rental-card">
                <div class="rental-photo">
                  @if (r.equipment?.photo_url) {
                    <img [src]="r.equipment!.photo_url" [alt]="r.equipment?.name" />
                  } @else {
                    <div class="rental-photo-placeholder">
                      <ng-icon name="lucideTractor"></ng-icon>
                    </div>
                  }
                </div>
                <div class="rental-body">
                  <div class="rental-header">
                    <div class="rental-title">
                      <strong>{{ r.equipment?.name || r.equipment_name || 'Matériel' }}</strong>
                      <span class="rental-type">{{ r.equipment?.type || r.equipment_type || '—' }}</span>
                    </div>
                    <span class="status-badge" [attr.data-status]="r.status">{{ getStatusLabel(r.status) }}</span>
                  </div>
                  <div class="rental-dates">
                    <ng-icon name="lucideCalendar"></ng-icon>
                    {{ formatDate(r.start_date) }} → {{ formatDate(r.end_date) }}
                  </div>
                  <div class="rental-price">
                    <ng-icon name="lucideDollarSign"></ng-icon>
                    <strong>{{ r.total_price_tnd }}</strong> TND total
                    @if (r.equipment?.daily_rate_tnd) {
                      <small>({{ r.equipment!.daily_rate_tnd }} TND/j × {{ getDurationDays(r.start_date, r.end_date) }} jours)</small>
                    }
                  </div>
                  @if (r.delivery_needed) {
                    <div class="rental-delivery">
                      <ng-icon name="lucideTruck"></ng-icon> Livraison demandée
                    </div>
                  }
                  @if (r.special_requirements) {
                    <div class="rental-notes">
                      <small>{{ r.special_requirements }}</small>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- Detail Panel (slide-in) -->
    @if (selectedEquipment()) {
      <div class="detail-panel">
        <div class="detail-header">
          <h3>Détails du matériel</h3>
          <button class="close-btn" (click)="selectedEquipment.set(null)"><ng-icon name="lucideX"></ng-icon></button>
        </div>
        <div class="detail-body">
          <div class="detail-photo">
            @if (selectedEquipment()!.photo_url) {
              <img [src]="selectedEquipment()!.photo_url" [alt]="selectedEquipment()!.name" />
            } @else {
              <div class="detail-photo-placeholder">
                <ng-icon name="lucideTractor"></ng-icon>
              </div>
            }
          </div>

          <div class="detail-title">
            <h4>{{ selectedEquipment()!.brand || '' }} {{ selectedEquipment()!.model || selectedEquipment()!.name }}</h4>
            <span class="detail-type">{{ selectedEquipment()!.type }}</span>
          </div>

          <div class="detail-grid">
            <div class="detail-field">
              <small>Année</small>
              <span>{{ selectedEquipment()!.year || '—' }}</span>
            </div>
            <div class="detail-field">
              <small>État</small>
              <div class="condition-stars">
                @for (s of [1,2,3,4,5]; track s) {
                  <span class="star" [class.filled]="s <= getConditionRating(selectedEquipment()!.condition)">★</span>
                }
                <span class="condition-label">{{ selectedEquipment()!.condition }}</span>
              </div>
            </div>
            <div class="detail-field">
              <small>Gouvernorat</small>
              <span><ng-icon name="lucideMapPin"></ng-icon> {{ selectedEquipment()!.governorate }}</span>
            </div>
            <div class="detail-field">
              <small>Tarif journalier</small>
              <span class="price-highlight">{{ selectedEquipment()!.daily_rate_tnd }} TND/j</span>
            </div>
            @if (selectedEquipment()!.deposit_tnd) {
              <div class="detail-field">
                <small>Caution</small>
                <span>{{ selectedEquipment()!.deposit_tnd }} TND</span>
              </div>
            }
            @if (selectedEquipment()!.available_from && selectedEquipment()!.available_to) {
              <div class="detail-field full">
                <small>Disponibilité</small>
                <span>{{ formatDate(selectedEquipment()!.available_from!) }} → {{ formatDate(selectedEquipment()!.available_to!) }}</span>
              </div>
            }
          </div>

          @if (selectedEquipment()!.description) {
            <div class="detail-description">
              <small>Description</small>
              <p>{{ selectedEquipment()!.description }}</p>
            </div>
          }



          <!-- Simple availability calendar -->
          <div class="calendar-section">
            <h5><ng-icon name="lucideCalendar"></ng-icon> Disponibilité</h5>
            <div class="calendar-grid">
              @for (day of calendarDays(); track day.date) {
                <div class="cal-day" [class.available]="day.available" [class.today]="day.isToday">
                  <span class="cal-num">{{ day.dayNum }}</span>
                  <span class="cal-label">{{ day.label }}</span>
                </div>
              }
            </div>
          </div>

          <button class="btn btn-primary btn-full" (click)="openRentForm(selectedEquipment()!)">
            <ng-icon name="lucideSend"></ng-icon> Demander une Location
          </button>
        </div>
      </div>
    }

    <!-- Rental Form Modal -->
    @if (showRentForm()) {
      <div class="modal-backdrop" (click)="showRentForm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showRentForm.set(false)"><ng-icon name="lucideX"></ng-icon></button>
          <h3>
            <ng-icon name="lucidePackage"></ng-icon>
            Louer {{ rentFormTarget()?.brand || '' }} {{ rentFormTarget()?.model || rentFormTarget()?.name }}
          </h3>

          <div class="modal-body">
            <div class="modal-field">
              <label>Date de début</label>
              <input type="date" [(ngModel)]="rentForm.start_date" class="form-el" />
            </div>
            <div class="modal-field">
              <label>Date de fin</label>
              <input type="date" [(ngModel)]="rentForm.end_date" class="form-el" />
            </div>

            @if (rentForm.start_date && rentForm.end_date && rentFormTarget()?.daily_rate_tnd) {
              <div class="rent-summary">
                <div class="rent-summary-row">
                  <span>{{ rentFormTarget()!.daily_rate_tnd }} TND/j × {{ getDurationDays(rentForm.start_date, rentForm.end_date) }} jours</span>
                  <strong>{{ rentFormTarget()!.daily_rate_tnd * getDurationDays(rentForm.start_date, rentForm.end_date) }} TND</strong>
                </div>
                @if (rentFormTarget()!.deposit_tnd) {
                  <div class="rent-summary-row deposit">
                    <span>+ Caution remboursable</span>
                    <strong>{{ rentFormTarget()!.deposit_tnd }} TND</strong>
                  </div>
                }
              </div>
            }

            <div class="modal-field">
              <label>Description de l'utilisation</label>
              <textarea [(ngModel)]="rentForm.usage_description" class="form-el" rows="2"
                placeholder="Décrivez l'usage prévu du matériel..."></textarea>
            </div>

            <div class="modal-field">
              <label class="toggle-label">
                <input type="checkbox" [(ngModel)]="rentForm.delivery_needed" class="toggle-input" />
                <span class="toggle-switch"></span>
                <ng-icon name="lucideTruck"></ng-icon> Livraison nécessaire
              </label>
            </div>

            <div class="modal-field">
              <label>Conditions particulières</label>
              <textarea [(ngModel)]="rentForm.special_requirements" class="form-el" rows="2"
                placeholder="Instructions spéciales, besoins particuliers..."></textarea>
            </div>

            <button class="btn btn-primary btn-submit" (click)="submitRent()"
              [disabled]="submitting() || !rentForm.start_date || !rentForm.end_date">
              @if (submitting()) {
                <span class="spinner-sm"></span> Envoi...
              } @else {
                <ng-icon name="lucideSend"></ng-icon> Envoyer la demande
              }
            </button>
          </div>
        </div>
      </div>
    }
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
    .btn-sm { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .btn-sm.primary { background: var(--zir-emerald); color: white; }
    .btn-sm ng-icon { width: 14px; height: 14px; }

    .tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: 10px; padding: 3px; margin-bottom: 16px; }
    .tab { flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: center; }
    .tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    /* Filter Bar */
    .filter-bar { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    .filter-group { margin-bottom: 14px; }
    .filter-group label { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
    .filter-group label ng-icon { width: 14px; height: 14px; }
    .filter-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 20px; background: var(--bg-primary); color: var(--text-secondary); font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .chip:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .chip.active { background: var(--zir-emerald); color: white; border-color: var(--zir-emerald); }
    .filter-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 4px; }
    .filter-field label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
    .filter-field label ng-icon { width: 14px; height: 14px; }
    .btn-search { height: 38px; flex-shrink: 0; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
    .stat-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon ng-icon { width: 20px; height: 20px; }
    .browse-icon { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .rental-icon { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .pending-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

    .form-el { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.85rem; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; }
    .form-el:focus { border-color: var(--zir-emerald); }
    textarea.form-el { resize: vertical; }

    /* Equipment Grid */
    h3 { font-size: 1rem; font-weight: 700; margin: 16px 0 12px; color: var(--text-primary); }
    .equip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .equip-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.15s; }
    .equip-card:hover { border-color: var(--zir-emerald); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .equip-photo { height: 140px; overflow: hidden; background: var(--bg-secondary); }
    .equip-photo img { width: 100%; height: 100%; object-fit: cover; }
    .equip-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--zir-emerald-alpha-10); }
    .equip-photo-placeholder ng-icon { width: 40px; height: 40px; color: var(--zir-emerald); }
    .equip-body { padding: 14px; }
    .equip-type-badge { display: inline-block; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); margin-bottom: 6px; }
    .equip-name { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; line-height: 1.2; }
    .equip-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .meta-pill { display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 7px; border-radius: 5px; }
    .meta-pill ng-icon { width: 11px; height: 11px; }
    .meta-pill.location { color: var(--zir-emerald); }
    .equip-condition { display: flex; align-items: center; gap: 1px; margin-bottom: 10px; }
    .equip-condition .star { font-size: 0.8rem; color: var(--border); }
    .equip-condition .star.filled { color: #f59e0b; }
    .condition-text { font-size: 0.7rem; color: var(--text-muted); margin-left: 4px; font-weight: 600; }
    .equip-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
    .equip-price { display: flex; flex-direction: column; }
    .equip-price strong { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .equip-price span { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
    .equip-price .deposit { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; }

    /* Rental List */
    .rental-list { display: flex; flex-direction: column; gap: 10px; }
    .rental-card { display: flex; gap: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; transition: all 0.15s; }
    .rental-card:hover { border-color: var(--zir-emerald); }
    .rental-photo { width: 80px; height: 80px; border-radius: 10px; overflow: hidden; background: var(--bg-secondary); flex-shrink: 0; }
    .rental-photo img { width: 100%; height: 100%; object-fit: cover; }
    .rental-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--zir-emerald-alpha-10); }
    .rental-photo-placeholder ng-icon { width: 24px; height: 24px; color: var(--zir-emerald); }
    .rental-body { flex: 1; min-width: 0; }
    .rental-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .rental-title { display: flex; flex-direction: column; gap: 2px; }
    .rental-title strong { font-size: 0.95rem; color: var(--text-primary); }
    .rental-type { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
    .status-badge[data-status="PENDING"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .status-badge[data-status="APPROVED"] { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .status-badge[data-status="COMPLETED"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .status-badge[data-status="REJECTED"] { background: rgba(239,68,68,0.1); color: #ef4444; }
    .rental-dates { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
    .rental-dates ng-icon { width: 14px; height: 14px; color: var(--text-muted); }
    .rental-price { display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 4px; }
    .rental-price ng-icon { width: 14px; height: 14px; color: var(--zir-emerald); }
    .rental-price strong { color: var(--zir-emerald); font-weight: 800; }
    .rental-price small { font-size: 0.7rem; color: var(--text-muted); }
    .rental-delivery { display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; color: #3b82f6; font-weight: 600; margin-top: 4px; }
    .rental-delivery ng-icon { width: 12px; height: 12px; }
    .rental-notes { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-style: italic; }

    /* Detail Panel */
    .detail-panel { position: fixed; top: 0; right: 0; width: 440px; max-width: 90vw; height: 100vh; background: var(--bg-card); border-left: 1px solid var(--border); z-index: 50; display: flex; flex-direction: column; box-shadow: -4px 0 20px rgba(0,0,0,0.1); }
    .detail-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .detail-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
    .close-btn ng-icon { width: 20px; height: 20px; }
    .detail-body { flex: 1; overflow-y: auto; padding: 20px; }
    .detail-photo { width: 100%; height: 180px; border-radius: 12px; overflow: hidden; margin-bottom: 16px; background: var(--bg-secondary); }
    .detail-photo img { width: 100%; height: 100%; object-fit: cover; }
    .detail-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--zir-emerald-alpha-10); }
    .detail-photo-placeholder ng-icon { width: 48px; height: 48px; color: var(--zir-emerald); }
    .detail-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .detail-title h4 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .detail-type { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .detail-grid .full { grid-column: 1 / -1; }
    .detail-field { display: flex; flex-direction: column; gap: 2px; }
    .detail-field small { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
    .detail-field span { font-size: 0.85rem; color: var(--text-primary); font-weight: 600; display: flex; align-items: center; gap: 3px; }
    .detail-field span ng-icon { width: 14px; height: 14px; color: var(--text-muted); }
    .condition-stars { display: flex; align-items: center; gap: 1px; }
    .condition-stars .star { font-size: 0.8rem; color: var(--border); }
    .condition-stars .star.filled { color: #f59e0b; }
    .condition-label { font-size: 0.72rem; color: var(--text-muted); margin-left: 4px; }
    .price-highlight { color: var(--zir-emerald) !important; font-size: 1rem !important; font-weight: 800 !important; }
    .detail-description { margin-bottom: 16px; }
    .detail-description small { display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-bottom: 4px; }
    .detail-description p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }

    .owner-section { margin-bottom: 16px; }
    .owner-section h5 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
    .owner-section h5 ng-icon { width: 16px; height: 16px; color: var(--zir-emerald); }
    .owner-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; }
    .owner-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--zir-emerald); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
    .owner-info strong { display: block; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 4px; }
    .owner-meta { display: flex; align-items: center; gap: 10px; font-size: 0.73rem; color: var(--text-muted); }
    .owner-rating { display: inline-flex; align-items: center; gap: 1px; }
    .owner-rating .star { font-size: 0.75rem; color: var(--border); }
    .owner-rating .star.filled { color: #f59e0b; }
    .rating-val { font-size: 0.72rem; font-weight: 600; margin-left: 2px; }
    .owner-location { display: inline-flex; align-items: center; gap: 2px; }
    .owner-location ng-icon { width: 12px; height: 12px; }

    .calendar-section { margin-bottom: 16px; }
    .calendar-section h5 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
    .calendar-section h5 ng-icon { width: 16px; height: 16px; color: var(--zir-emerald); }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .cal-day { text-align: center; padding: 6px 2px; border-radius: 6px; background: var(--bg-secondary); }
    .cal-day.available { background: var(--zir-emerald-alpha-10); }
    .cal-day.today { outline: 2px solid var(--zir-emerald); }
    .cal-num { display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
    .cal-label { display: block; font-size: 0.6rem; color: var(--text-muted); font-weight: 600; }

    .btn-full { width: 100%; justify-content: center; padding: 12px; margin-top: 8px; }

    /* Loading / Empty */
    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .empty-state p { margin: 0 0 16px; font-size: 0.85rem; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 440px; max-width: 90vw; position: relative; max-height: 90vh; overflow-y: auto; }
    .modal-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text-muted); cursor: pointer; z-index: 1; }
    .modal-close ng-icon { width: 20px; height: 20px; }
    .modal h3 { margin: 0 0 18px; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .modal h3 ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .modal-body { display: flex; flex-direction: column; gap: 14px; }
    .modal-field { display: flex; flex-direction: column; gap: 6px; }
    .modal-field label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
    .modal-field label ng-icon { width: 14px; height: 14px; }

    .rent-summary { background: var(--bg-secondary); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .rent-summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-primary); }
    .rent-summary-row strong { color: var(--zir-emerald); font-weight: 800; }
    .rent-summary-row.deposit { font-size: 0.8rem; color: var(--text-muted); }
    .rent-summary-row.deposit strong { color: var(--text-secondary); }

    .toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .toggle-input { display: none; }
    .toggle-switch { width: 40px; height: 22px; border-radius: 11px; background: var(--border); position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-switch::after { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle-input:checked + .toggle-switch { background: var(--zir-emerald); }
    .toggle-input:checked + .toggle-switch::after { transform: translateX(18px); }

    .btn-submit { margin-top: 6px; width: 100%; justify-content: center; padding: 12px; }
  `]
})
export class FarmerServicesEquipmentComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  readonly activeTab = signal<'browse' | 'rentals'>('browse');
  readonly available = signal<EquipmentItem[]>([]);
  readonly myRentals = signal<EquipmentReservation[]>([]);
  readonly searching = signal(false);
  readonly searchedOnce = signal(false);
  readonly loadingRentals = signal(false);
  readonly selectedEquipment = signal<EquipmentItem | null>(null);
  readonly showRentForm = signal(false);
  readonly rentFormTarget = signal<EquipmentItem | null>(null);
  readonly submitting = signal(false);
  readonly selectedTypes = signal<string[]>([]);

  search = { governorate: '', startDate: '', endDate: '' };

  rentForm = {
    start_date: '',
    end_date: '',
    usage_description: '',
    delivery_needed: false,
    special_requirements: '',
  };

  readonly EQUIPMENT_TYPES = [
    'Tracteur', 'Moissonneuse', 'Semoir', 'Pulvérisateur', 'Tondeuse',
    'Chargeur', 'Remorque', 'Système d\'irrigation', 'Autre'
  ];

  readonly DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  ngOnInit() {
    this.loadMyRentals();
    this.searchEquip();
  }

  switchTab(tab: 'browse' | 'rentals') {
    this.activeTab.set(tab);
    if (tab === 'rentals' && this.myRentals().length === 0) {
      this.loadMyRentals();
    }
  }

  toggleType(type: string) {
    const current = this.selectedTypes();
    if (current.includes(type)) {
      this.selectedTypes.set(current.filter(t => t !== type));
    } else {
      this.selectedTypes.set([...current, type]);
    }
  }

  searchEquip() {
    this.searching.set(true);
    this.searchedOnce.set(true);
    const p = new URLSearchParams();
    if (this.search.governorate) p.set('governorate', this.search.governorate);
    if (this.search.startDate) p.set('startDate', this.search.startDate);
    if (this.search.endDate) p.set('endDate', this.search.endDate);
    if (this.selectedTypes().length > 0) p.set('types', this.selectedTypes().join(','));

    this.http.get<EquipmentItem[]>(`${environment.apiUrl}/equipment/available?${p}`).subscribe({
      next: (d) => { this.available.set(Array.isArray(d) ? d : []); this.searching.set(false); },
      error: () => this.searching.set(false)
    });
  }

  loadMyRentals() {
    this.loadingRentals.set(true);
    this.http.get<EquipmentReservation[]>(`${environment.apiUrl}/equipment/reservations?myRentals=true`).subscribe({
      next: (d) => {
        this.myRentals.set(Array.isArray(d) ? d : []);
        this.loadingRentals.set(false);
      },
      error: () => this.loadingRentals.set(false)
    });
  }

  pendingCount(): number {
    return this.myRentals().filter(r => r.status === 'PENDING').length;
  }

  openDetails(eq: EquipmentItem) {
    this.selectedEquipment.set(eq);
  }

  openRentForm(eq: EquipmentItem) {
    this.rentFormTarget.set(eq);
    this.rentForm = {
      start_date: this.search.startDate || '',
      end_date: this.search.endDate || '',
      usage_description: '',
      delivery_needed: false,
      special_requirements: '',
    };
    this.showRentForm.set(true);
  }

  submitRent() {
    const target = this.rentFormTarget();
    if (!target || !this.rentForm.start_date || !this.rentForm.end_date) return;

    this.submitting.set(true);
    const body: any = {
      start_date: this.rentForm.start_date,
      end_date: this.rentForm.end_date,
    };
    if (this.rentForm.usage_description) body.usage_description = this.rentForm.usage_description;
    if (this.rentForm.delivery_needed) body.delivery_needed = true;
    if (this.rentForm.special_requirements) body.special_requirements = this.rentForm.special_requirements;

    this.http.post(`${environment.apiUrl}/equipment/${target.id}/reserve`, body).subscribe({
      next: () => {
        this.toast.success('Demande envoyée', 'Le propriétaire a été notifié');
        this.submitting.set(false);
        this.showRentForm.set(false);
        this.rentFormTarget.set(null);
        this.loadMyRentals();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible d\'envoyer la demande');
        this.submitting.set(false);
      }
    });
  }

  getConditionRating(condition: string): number {
    const map: Record<string, number> = {
      'excellent': 5, 'très bon': 5, 'comme neuf': 5,
      'bon': 4, 'très bien': 4,
      'correct': 3, 'moyen': 3,
      'usé': 2, 'passable': 2,
      'mauvais': 1, 'mauvaise': 1,
    };
    const lower = (condition || '').toLowerCase();
    return map[lower] || 3;
  }

  getDurationDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente',
      'APPROVED': 'Confirmée',
      'COMPLETED': 'Terminée',
      'REJECTED': 'Refusée',
    };
    return labels[status] || status;
  }

  calendarDays(): Array<{ date: string; dayNum: number; label: string; available: boolean; isToday: boolean }> {
    const eq = this.selectedEquipment();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Array<{ date: string; dayNum: number; label: string; available: boolean; isToday: boolean }> = [];

    const availFrom = eq?.available_from ? new Date(eq.available_from) : null;
    const availTo = eq?.available_to ? new Date(eq.available_to) : null;

    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isAvailable = !availFrom || !availTo || (d >= availFrom && d <= availTo);
      days.push({
        date: dateStr,
        dayNum: d.getDate(),
        label: this.DAYS_FR[d.getDay()],
        available: isAvailable,
        isToday: d.getTime() === today.getTime(),
      });
    }
    return days;
  }

  private dfDate = new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });

  formatDate(d: string): string {
    return d ? this.dfDate.format(new Date(d)) : '—';
  }
}
