import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, ChangeDetectorRef, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideFolder, lucideMail, lucideX, lucideSearch,
  lucideMapPin, lucideCheck, lucideXCircle, lucideChevronDown,
  lucideStar, lucideCalendar, lucideLeaf, lucideMicroscope,
  lucideUserPlus, lucideSend, lucideExternalLink, lucideChevronRight,
  lucideShield, lucidePhone, lucideMessageCircle,
  lucideFlaskConical, lucideDroplets, lucideWaves, lucidePawPrint, lucideSyringe
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { AuthStore } from '../../../core/state/auth.store';
import { NotificationStore } from '../../../core/state/notification.store';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { SlideInPanelComponent } from './shared/slide-in-panel.component';
import { ToastService } from './shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exp-farmers',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgIconComponent, RouterModule,
    SkeletonLoaderComponent, SlideInPanelComponent
  ],
  providers: [provideIcons({
    lucideUsers, lucideFolder, lucideMail, lucideX, lucideSearch,
    lucideMapPin, lucideCheck, lucideXCircle, lucideChevronDown,
    lucideStar, lucideCalendar, lucideLeaf, lucideMicroscope,
    lucideUserPlus, lucideSend, lucideExternalLink, lucideChevronRight,
    lucideShield, lucidePhone, lucideMessageCircle,
    lucideFlaskConical, lucideDroplets, lucideWaves, lucidePawPrint, lucideSyringe
  })],
  template: `
    <div class="farmers-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            Mes Agriculteurs
            <span class="count-badge">{{ filteredFarmers().length }}</span>
          </h1>
          <p class="page-subtitle">Gérez vos relations avec vos clients agriculteurs</p>
        </div>
        <button class="btn-confrere" (click)="showConfrereModal.set(true)">
          <ng-icon name="lucideUserPlus"></ng-icon>
          Trouver un Confrère
        </button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-bar">
          <ng-icon name="lucideSearch" class="search-icon"></ng-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher un agriculteur..."
                 class="search-input" (input)="onSearch()" />
        </div>
        <div class="filter-select-wrap">
          <ng-icon name="lucideMapPin" class="filter-icon"></ng-icon>
          <select [(ngModel)]="selectedGovernorate" (change)="onGovernorateFilter()" class="gov-select">
            <option value="">Tous les gouvernorats</option>
            <option *ngFor="let gov of uniqueGovernorates()" [value]="gov">{{ gov }}</option>
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab" [class.active]="activeTab() === 'farmers'" (click)="activeTab.set('farmers')">
          <ng-icon name="lucideUsers"></ng-icon>
          Mes Agriculteurs
          <span class="tab-badge" *ngIf="farmers().length > 0">{{ farmers().length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab() === 'pending'" (click)="activeTab.set('pending')">
          <ng-icon name="lucideMail"></ng-icon>
          Demandes en Attente
          <span class="tab-badge urgent" *ngIf="pendingRelations().length > 0">{{ pendingRelations().length }}</span>
        </button>
      </div>

      <!-- Farmers Tab -->
      <div *ngIf="activeTab() === 'farmers'">
        <div *ngIf="loading(); else farmersLoaded" class="loading-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <app-skeleton-loader width="100%" height="220px" borderRadius="16px"></app-skeleton-loader>
          }
        </div>
        <ng-template #farmersLoaded>
          <div *ngIf="filteredFarmers().length === 0" class="empty-state">
            <ng-icon name="lucideUsers" class="empty-icon"></ng-icon>
            <p>Aucun agriculteur dans votre liste</p>
            <small>Utilisez la section Demandes pour accepter de nouveaux agriculteurs</small>
          </div>
          <div class="farmers-grid" *ngIf="filteredFarmers().length > 0">
            <div class="farmer-card" *ngFor="let farmer of filteredFarmers()">
              <div class="card-top">
                <div class="farmer-avatar">
                  {{ farmer.name?.charAt(0)?.toUpperCase() }}
                  <span class="role-badge" *ngIf="farmer.role">{{ farmer.role }}</span>
                </div>
                <div class="farmer-info">
                  <span class="farmer-name">{{ farmer.name }}</span>
                  <span class="farmer-gov">
                    <ng-icon name="lucideMapPin" class="tiny-icon"></ng-icon>
                    {{ farmer.governorate || '—' }}
                  </span>
                </div>
              </div>
              <div class="card-meta">
                <div class="meta-item">
                  <ng-icon name="lucideLeaf" class="meta-icon"></ng-icon>
                  <span>{{ farmer.parcel_count || 0 }} parcelles</span>
                </div>
                <div class="meta-item">
                  <ng-icon name="lucideMicroscope" class="meta-icon"></ng-icon>
                  <span>{{ farmer.total_diagnostics_count || 0 }} diagnostics</span>
                </div>
              </div>
              <div class="last-consultation" *ngIf="farmer.last_consultation_date; else noConsult">
                <ng-icon name="lucideCalendar" class="meta-icon"></ng-icon>
                <small>Dernière consultation : {{ farmer.last_consultation_date | date:'dd/MM/yyyy' }}</small>
              </div>
              <ng-template #noConsult>
                <div class="last-consultation muted">
                  <small>Aucune consultation encore</small>
                </div>
              </ng-template>

              <!-- Domain-specific chip -->
              <ng-container [ngSwitch]="expertType()">

                <!-- AGRONOMIST: last soil analysis + nutritive alert -->
                <ng-container *ngSwitchCase="'AGRONOMIST'">
                  <div class="domain-chip" *ngIf="farmer.domain; else noSoil"
                       [class.domain-alert]="farmer.domain.has_nutritive_alert">
                    <ng-icon name="lucideFlaskConical" class="domain-icon"></ng-icon>
                    <span *ngIf="farmer.domain.last_soil_analysis_date">
                      Sol : {{ farmer.domain.last_soil_analysis_date | date:'dd/MM/yy' }}
                    </span>
                    <span *ngIf="!farmer.domain.last_soil_analysis_date">Sol analysé</span>
                    <span class="alert-dot" *ngIf="farmer.domain.has_nutritive_alert" title="Alerte nutritive">⚠</span>
                  </div>
                  <ng-template #noSoil>
                    <div class="domain-chip domain-empty">
                      <ng-icon name="lucideFlaskConical" class="domain-icon"></ng-icon>
                      <span>Aucune analyse de sol</span>
                    </div>
                  </ng-template>
                </ng-container>

                <!-- HYDRAULIC_ENGINEER: active irrigation projects -->
                <ng-container *ngSwitchCase="'HYDRAULIC_ENGINEER'">
                  <div class="domain-chip" [class.domain-empty]="!farmer.domain || +farmer.domain.active_irrigation_projects === 0">
                    <ng-icon name="lucideDroplets" class="domain-icon"></ng-icon>
                    <span>{{ farmer.domain ? farmer.domain.active_irrigation_projects : 0 }} projet(s) actif(s)</span>
                  </div>
                </ng-container>

                <!-- HYDROGEOLOGIST: wells + anomaly -->
                <ng-container *ngSwitchCase="'HYDROGEOLOGIST'">
                  <div class="domain-chip" *ngIf="farmer.domain; else noWells"
                       [class.domain-alert]="farmer.domain.has_well_anomaly">
                    <ng-icon name="lucideWaves" class="domain-icon"></ng-icon>
                    <span>{{ farmer.domain.monitored_wells_count }} puits suivi(s)</span>
                    <span class="alert-dot" *ngIf="farmer.domain.has_well_anomaly" title="Anomalie détectée">⚠</span>
                  </div>
                  <ng-template #noWells>
                    <div class="domain-chip domain-empty">
                      <ng-icon name="lucideWaves" class="domain-icon"></ng-icon>
                      <span>Aucun puits suivi</span>
                    </div>
                  </ng-template>
                </ng-container>

                <!-- ZOOTECHNICIAN: herd species + size -->
                <ng-container *ngSwitchCase="'ZOOTECHNICIAN'">
                  <div class="domain-chip" *ngIf="farmer.domain; else noHerd">
                    <ng-icon name="lucidePawPrint" class="domain-icon"></ng-icon>
                    <span>{{ farmer.domain.last_herd_size }} têtes · {{ farmer.domain.last_herd_species | lowercase }}</span>
                  </div>
                  <ng-template #noHerd>
                    <div class="domain-chip domain-empty">
                      <ng-icon name="lucidePawPrint" class="domain-icon"></ng-icon>
                      <span>Aucun élevage enregistré</span>
                    </div>
                  </ng-template>
                </ng-container>

                <!-- VETERINARY_EPIDEMIOLOGIST: upcoming vaccine reminders -->
                <ng-container *ngSwitchCase="'VETERINARY_EPIDEMIOLOGIST'">
                  <div class="domain-chip"
                       [class.domain-alert]="farmer.domain && +farmer.domain.upcoming_vaccine_reminders > 0">
                    <ng-icon name="lucideSyringe" class="domain-icon"></ng-icon>
                    <span>{{ farmer.domain ? farmer.domain.upcoming_vaccine_reminders : 0 }} rappel(s) vaccinal sous 14j</span>
                  </div>
                </ng-container>

              </ng-container>
              <div class="card-actions">
                <button class="btn-dossier" (click)="openFarmerPanel(farmer)">
                  <ng-icon name="lucideFolder"></ng-icon>
                  Voir Dossier
                </button>
                <button class="btn-message" (click)="goToMessages(farmer)">
                  <ng-icon name="lucideMail"></ng-icon>
                  Message
                </button>
              </div>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- Pending Tab -->
      <div *ngIf="activeTab() === 'pending'" class="pending-list">
        <div *ngIf="pendingLoading()" class="skeleton-list">
          @for (i of [1,2,3]; track i) {
            <app-skeleton-loader width="100%" height="76px" borderRadius="14px"></app-skeleton-loader>
          }
        </div>
        <div *ngIf="!pendingLoading() && pendingRelations().length === 0" class="empty-state">
          <ng-icon name="lucideCheckCircle" class="empty-icon success"></ng-icon>
          <p>Aucune demande en attente</p>
        </div>
        <div class="pending-item" *ngFor="let rel of pendingRelations()">
          <div class="pending-avatar">{{ rel.farmer_name?.charAt(0)?.toUpperCase() }}</div>
          <div class="pending-info">
            <span class="pending-name">{{ rel.farmer_name }}</span>
            <span class="pending-gov">
              <ng-icon name="lucideMapPin" class="tiny-icon"></ng-icon>
              {{ rel.governorate || '—' }}
            </span>
            <em class="pending-note" *ngIf="rel.note">« {{ rel.note }} »</em>
            <small class="pending-date">{{ formatAgo(rel.created_at) }}</small>
          </div>
          <div class="pending-actions">
            <button class="btn-accept" (click)="respondToRelation(rel.id, true)" [disabled]="respondingId() === rel.id">
              <ng-icon name="lucideCheck"></ng-icon>
              Accepter
            </button>
            <button class="btn-decline" (click)="respondToRelation(rel.id, false)" [disabled]="respondingId() === rel.id">
              <ng-icon name="lucideXCircle"></ng-icon>
              Décliner
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Farmer Details Slide-in Panel -->
    <app-slide-in-panel
      [isOpen]="panelOpen()"
      [width]="'520px'"
      [title]="selectedFarmer()?.name || 'Dossier Agriculteur'"
      (close)="closePanel()"
    >
      @if (panelDetails(); as details) {
        <div class="panel-body">
          <!-- Farmer Identity -->
          <div class="panel-identity">
            <div class="identity-avatar">
              {{ selectedFarmer()?.name?.charAt(0) }}
              <span class="role-badge" *ngIf="selectedFarmer()?.role">{{ selectedFarmer()?.role }}</span>
            </div>
            <div class="identity-info">
              <h3>{{ selectedFarmer()?.name }}</h3>
              <span class="identity-gov">
                <ng-icon name="lucideMapPin"></ng-icon>
                {{ selectedFarmer()?.governorate }}
              </span>
              <span class="identity-phone" *ngIf="selectedFarmer()?.phone">
                <ng-icon name="lucidePhone"></ng-icon>
                {{ selectedFarmer()?.phone }}
              </span>
            </div>
          </div>

          <!-- Map Placeholder (Leaflet will mount here) -->
          <div class="panel-map" id="farmer-map-{{ selectedFarmer()?.id }}">
            <div class="map-placeholder">
              <ng-icon name="lucideMapPin"></ng-icon>
              <span>Carte des parcelles</span>
            </div>
          </div>

          <!-- Accordion: Parcelles -->
          <div class="accordion-section" [class.open]="expandedSection() === 'parcels'" (click)="toggleSection('parcels')">
            <div class="accordion-header">
              <span class="accordion-title">
                <ng-icon name="lucideLeaf"></ng-icon>
                Ses Parcelles
              </span>
              <div class="accordion-meta">{{ details.parcels?.length || 0 }} parcelles</div>
              <ng-icon [name]="expandedSection() === 'parcels' ? 'lucideChevronDown' : 'lucideChevronRight'" class="accordion-chevron"></ng-icon>
            </div>
            @if (expandedSection() === 'parcels') {
              <div class="accordion-content">
                <div *ngIf="details.parcels?.length === 0" class="muted-text">Aucune parcelle enregistrée</div>
                <div class="parcels-list">
                  <div class="parcel-item" *ngFor="let p of details.parcels">
                    <span class="parcel-name">{{ p.name || 'Parcelle' }}</span>
                    <span class="parcel-meta">{{ p.area_ha | number:'1.0-2' }} ha · {{ p.crop_type || '—' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Accordion: Diagnostics -->
          <div class="accordion-section" [class.open]="expandedSection() === 'diagnostics'" (click)="toggleSection('diagnostics')">
            <div class="accordion-header">
              <span class="accordion-title">
                <ng-icon name="lucideMicroscope"></ng-icon>
                Diagnostics Récents
              </span>
              <div class="accordion-meta">{{ details.diagnostics?.length || 0 }}</div>
              <ng-icon [name]="expandedSection() === 'diagnostics' ? 'lucideChevronDown' : 'lucideChevronRight'" class="accordion-chevron"></ng-icon>
            </div>
            @if (expandedSection() === 'diagnostics') {
              <div class="accordion-content">
                <div *ngIf="details.diagnostics?.length === 0" class="muted-text">Aucun diagnostic</div>
                <div class="diag-item" *ngFor="let d of details.diagnostics">
                  <div class="diag-info">
                    <span class="diag-name">{{ d.disease_name }}</span>
                    <span class="diag-date">{{ d.created_at | date:'dd/MM/yy' }}</span>
                  </div>
                  <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="(d.confidence_score || 0) * 100"
                         [class.high]="d.confidence_score >= 0.8"
                         [class.medium]="d.confidence_score >= 0.5 && d.confidence_score < 0.8"
                         [class.low]="d.confidence_score < 0.5"></div>
                  </div>
                  <span class="validated-badge" [class.ok]="d.is_expert_validated" [class.pending]="!d.is_expert_validated">
                    {{ d.is_expert_validated ? 'Validé' : 'En attente' }}
                  </span>
                </div>
              </div>
            }
          </div>

          <!-- Accordion: Consultations -->
          <div class="accordion-section" [class.open]="expandedSection() === 'consultations'" (click)="toggleSection('consultations')">
            <div class="accordion-header">
              <span class="accordion-title">
                <ng-icon name="lucideMessageCircle"></ng-icon>
                Nos Consultations
              </span>
              <div class="accordion-meta">{{ details.consultations?.length || 0 }}</div>
              <ng-icon [name]="expandedSection() === 'consultations' ? 'lucideChevronDown' : 'lucideChevronRight'" class="accordion-chevron"></ng-icon>
            </div>
            @if (expandedSection() === 'consultations') {
              <div class="accordion-content">
                <div *ngIf="details.consultations?.length === 0" class="muted-text">Aucune consultation</div>
                <div class="consult-table" *ngIf="details.consultations?.length > 0">
                  <div class="consult-row header">
                    <span>Date</span><span>Type</span><span>Statut</span><span>Montant</span>
                  </div>
                  <div class="consult-row" *ngFor="let c of details.consultations">
                    <span>{{ c.created_at | date:'dd/MM/yy' }}</span>
                    <span>{{ c.consultation_type || '—' }}</span>
                    <span class="status-badge" [class]="c.status?.toLowerCase()">{{ c.status }}</span>
                    <span>{{ c.net_to_expert_tnd ? (c.net_to_expert_tnd | number:'1.2-2') + ' TND' : '—' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Accordion: Prescriptions -->
          <div class="accordion-section" [class.open]="expandedSection() === 'prescriptions'" (click)="toggleSection('prescriptions')">
            <div class="accordion-header">
              <span class="accordion-title">
                <ng-icon name="lucideShield"></ng-icon>
                Mes Prescriptions
              </span>
              <div class="accordion-meta">{{ details.prescriptions?.length || 0 }}</div>
              <ng-icon [name]="expandedSection() === 'prescriptions' ? 'lucideChevronDown' : 'lucideChevronRight'" class="accordion-chevron"></ng-icon>
            </div>
            @if (expandedSection() === 'prescriptions') {
              <div class="accordion-content">
                <div *ngIf="details.prescriptions?.length === 0" class="muted-text">Aucune prescription</div>
                <div class="presc-item" *ngFor="let p of details.prescriptions">
                  <span class="presc-name">{{ p.product_name }}</span>
                  <span class="presc-dose">{{ p.dosage }} · {{ p.application_method }}</span>
                  <span class="presc-exp" *ngIf="p.valid_until">Exp. {{ p.valid_until | date:'dd/MM/yy' }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (panelLoading_()) {
        <div class="panel-skeleton">
          @for (i of [1,2,3]; track i) {
            <app-skeleton-loader width="100%" height="120px" borderRadius="12px"></app-skeleton-loader>
          }
        </div>
      }
    </app-slide-in-panel>

    <!-- Trouver un Confrère Modal -->
    @if (showConfrereModal()) {
      <div class="modal-backdrop" (click)="showConfrereModal.set(false)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Trouver un Confrère</h3>
            <button class="modal-close" (click)="showConfrereModal.set(false)">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-search">
              <ng-icon name="lucideSearch"></ng-icon>
              <input type="text" [(ngModel)]="confrereSearch" placeholder="Rechercher par nom ou gouvernorat..." class="modal-search-input" />
            </div>
            <div class="confrere-filters">
              <select [(ngModel)]="confrereGovFilter" class="modal-select">
                <option value="">Tous les gouvernorats</option>
                <option *ngFor="let gov of TUNISIAN_GOVERNORATES" [value]="gov">{{ gov }}</option>
              </select>
            </div>
            <div class="confrere-list">
              @if (filteredConfreres().length === 0) {
                <div class="modal-empty">
                  <ng-icon name="lucideUsers"></ng-icon>
                  <p>Aucun confrère trouvé</p>
                </div>
              }
              @for (expert of filteredConfreres(); track expert.id) {
                <div class="confrere-card">
                  <div class="confrere-avatar">{{ expert.name?.charAt(0) }}</div>
                  <div class="confrere-info">
                    <span class="confrere-name">{{ expert.name }}</span>
                    <span class="confrere-type">{{ expert.expert_type }}</span>
                    <span class="confrere-gov">
                      <ng-icon name="lucideMapPin"></ng-icon>
                      {{ expert.governorate }}
                    </span>
                  </div>
                  <button class="btn-contact" (click)="contactConfrere(expert)">
                    <ng-icon name="lucideSend"></ng-icon>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .farmers-page { padding: 24px; max-width: 1400px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 12px; }
    .count-badge { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); padding: 4px 12px; border-radius: 20px; font-size: 1rem; }
    .page-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }

    .btn-confrere {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: 12px;
      background: var(--zir-emerald); color: #ffffff;
      font-weight: 700; font-size: 0.9rem; border: none;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-confrere:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--zir-emerald-alpha-20); }

    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
    .search-bar { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 16px; flex: 1; }
    .search-icon { color: var(--text-secondary); font-size: 1rem; }
    .search-input { background: none; border: none; color: var(--text-primary); font-size: 0.95rem; flex: 1; outline: none; }
    .filter-select-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 16px; }
    .filter-icon { color: var(--text-secondary); font-size: 1rem; }
    .gov-select { background: none; border: none; color: var(--text-primary); font-size: 0.9rem; outline: none; cursor: pointer; }

    .tabs-bar { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); }
    .tab { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: none; border: none; color: var(--text-secondary); font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 0.95rem; }
    .tab.active { color: var(--zir-emerald); border-bottom-color: var(--zir-emerald); }
    .tab-badge { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; }
    .tab-badge.urgent { background: var(--danger-alpha); color: var(--danger); }

    .farmers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    @media (max-width: 1100px) { .farmers-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) { .farmers-grid { grid-template-columns: 1fr; } }

    .farmer-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: transform 0.15s, box-shadow 0.15s; }
    .farmer-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .card-top { display: flex; align-items: center; gap: 12px; }
    .farmer-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.3rem; border: 1px solid var(--zir-emerald-alpha-20);
      flex-shrink: 0; position: relative;
    }
    .role-badge {
      position: absolute; bottom: -4px; right: -4px;
      background: var(--info); color: #ffffff;
      font-size: 7px; padding: 2px 4px; border-radius: 4px;
      font-weight: 700; text-transform: uppercase;
      white-space: nowrap;
    }
    .farmer-info { display: flex; flex-direction: column; }
    .farmer-name { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
    .farmer-gov { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px; }
    .tiny-icon { font-size: 0.75rem; }

    .card-meta { display: flex; gap: 16px; }
    .meta-item { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 0.85rem; }
    .meta-icon { font-size: 0.9rem; }

    .last-consultation { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.82rem; }
    .last-consultation.muted { color: var(--text-secondary); opacity: 0.6; }

    .domain-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      border: 1px solid var(--zir-emerald-alpha-20);
      font-size: 0.78rem; font-weight: 600;
    }
    .domain-chip.domain-alert {
      background: rgba(239,68,68,0.08); color: #ef4444;
      border-color: rgba(239,68,68,0.2);
    }
    .domain-chip.domain-empty {
      background: var(--bg-secondary); color: var(--text-secondary);
      border-color: var(--border-color); font-weight: 500;
    }
    .domain-icon { font-size: 0.85rem; flex-shrink: 0; }
    .alert-dot { font-size: 0.85rem; margin-left: 2px; }

    .card-actions { display: flex; gap: 8px; margin-top: 4px; }
    .btn-dossier, .btn-message { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; padding: 9px; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; transition: opacity 0.2s; }
    .btn-dossier { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border: 1px solid var(--zir-emerald-alpha-20); }
    .btn-dossier:hover { opacity: 0.85; }
    .btn-message { background: var(--bg-primary); color: var(--text-secondary); border: 1px solid var(--border-color); }
    .btn-message:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }

    .loading-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

    .pending-list { display: flex; flex-direction: column; gap: 12px; }
    .pending-item { display: flex; align-items: center; gap: 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px 20px; }
    .pending-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
    .pending-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .pending-name { font-weight: 700; color: var(--text-primary); }
    .pending-gov { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 0.82rem; }
    .pending-note { color: var(--text-secondary); font-size: 0.85rem; font-style: italic; }
    .pending-date { color: var(--text-secondary); font-size: 0.78rem; opacity: 0.7; }
    .pending-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn-accept, .btn-decline { display: flex; align-items: center; gap: 5px; padding: 8px 16px; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; transition: opacity 0.2s; }
    .btn-accept { background: var(--zir-emerald); color: white; }
    .btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-decline { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
    .btn-decline:disabled { opacity: 0.5; cursor: not-allowed; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .empty-icon.success { color: var(--zir-emerald); }
    .empty-state p { font-size: 1.1rem; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
    .empty-state small { font-size: 0.85rem; }

    /* Panel Styles */
    .panel-body { display: flex; flex-direction: column; gap: 16px; }
    .panel-identity { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 12px; }
    .identity-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.5rem; position: relative;
    }
    .identity-info { display: flex; flex-direction: column; gap: 4px; }
    .identity-info h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .identity-gov, .identity-phone { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.85rem; }

    .panel-map {
      height: 180px; border-radius: 12px; overflow: hidden;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
    }
    .map-placeholder {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px;
      color: var(--text-secondary);
    }

    .accordion-section {
      border: 1px solid var(--border-color); border-radius: 12px;
      overflow: hidden; transition: all 0.2s;
    }
    .accordion-section.open { border-color: var(--zir-emerald); }
    .accordion-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; background: var(--bg-card);
      cursor: pointer; transition: background 0.2s;
    }
    .accordion-header:hover { background: var(--bg-secondary); }
    .accordion-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--text-primary); font-size: 0.9rem; flex: 1; }
    .accordion-meta { font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 2px 8px; border-radius: 10px; }
    .accordion-chevron { color: var(--text-secondary); font-size: 1rem; }
    .accordion-content { padding: 16px; background: var(--bg-card); border-top: 1px solid var(--border-color); }

    .parcels-list { display: flex; flex-direction: column; gap: 6px; }
    .parcel-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); }
    .parcel-name { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
    .parcel-meta { color: var(--text-secondary); font-size: 0.82rem; }

    .diag-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
    .diag-item:last-child { border-bottom: none; }
    .diag-info { flex: 1; }
    .diag-name { font-weight: 600; color: var(--text-primary); font-size: 0.88rem; display: block; }
    .diag-date { color: var(--text-secondary); font-size: 0.78rem; }
    .confidence-bar { width: 60px; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; }
    .confidence-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .confidence-fill.high { background: var(--zir-emerald); }
    .confidence-fill.medium { background: var(--warning); }
    .confidence-fill.low { background: var(--danger); }
    .validated-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }
    .validated-badge.ok { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .validated-badge.pending { background: var(--warning-alpha); color: var(--warning); }

    .consult-table { display: flex; flex-direction: column; gap: 4px; }
    .consult-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; font-size: 0.82rem; padding: 8px; border-radius: 6px; }
    .consult-row.header { font-weight: 700; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; }
    .status-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 8px; text-align: center; }
    .status-badge.completed { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .status-badge.in_progress { background: var(--info-alpha); color: var(--info); }
    .status-badge.open { background: var(--warning-alpha); color: var(--warning); }

    .presc-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color); gap: 12px; font-size: 0.85rem; }
    .presc-item:last-child { border-bottom: none; }
    .presc-name { font-weight: 700; color: var(--text-primary); flex: 1; }
    .presc-dose { color: var(--text-secondary); flex: 1; }
    .presc-exp { color: var(--text-secondary); font-size: 0.78rem; white-space: nowrap; opacity: 0.7; }

    .panel-skeleton { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .muted-text { color: var(--text-secondary); font-size: 0.85rem; opacity: 0.7; }

    .skeleton-list { display: flex; flex-direction: column; gap: 12px; }

    /* Confrere Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 100; display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-content {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 20px; width: 480px; max-width: 90vw; max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px; border-bottom: 1px solid var(--border-color);
    }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .modal-close {
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; padding: 4px; border-radius: 8px;
    }
    .modal-close:hover { color: var(--danger); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }

    .modal-search {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }
    .modal-search-input {
      background: none; border: none; color: var(--text-primary);
      font-size: 0.9rem; flex: 1; outline: none;
    }

    .confrere-filters { display: flex; gap: 8px; }
    .modal-select {
      flex: 1; padding: 10px 12px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-primary); font-size: 0.85rem; outline: none;
    }

    .confrere-list { display: flex; flex-direction: column; gap: 8px; }
    .confrere-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; border-radius: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      transition: all 0.2s;
    }
    .confrere-card:hover { border-color: var(--zir-emerald-alpha-20); }
    .confrere-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1rem; flex-shrink: 0;
    }
    .confrere-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .confrere-name { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .confrere-type { font-size: 0.75rem; color: var(--zir-emerald); font-weight: 600; }
    .confrere-gov { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 0.8rem; }
    .btn-contact {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--zir-emerald); color: #ffffff;
      display: flex; align-items: center; justify-content: center;
      border: none; cursor: pointer; transition: all 0.2s;
    }
    .btn-contact:hover { transform: scale(1.05); }

    .modal-empty {
      text-align: center; padding: 40px 20px; color: var(--text-secondary);
    }
    .modal-empty ng-icon { font-size: 2rem; margin-bottom: 8px; opacity: 0.5; }
    .modal-empty p { margin: 0; font-size: 0.9rem; }
  `]
})
export class ExpFarmersComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStore);

  readonly expertType = computed(() => this.auth.currentUser()?.expert_type ?? null);

  readonly TUNISIAN_GOVERNORATES = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
    'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef',
    'Mahdia', 'Manouba', 'Médenine', 'Monastir', 'Nabeul',
    'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine',
    'Tozeur', 'Tunis', 'Zaghouan'
  ];

  readonly farmers = signal<any[]>([]);
  readonly pendingRelations = signal<any[]>([]);
  readonly loading = signal(false);
  readonly pendingLoading = signal(false);
  readonly selectedFarmer = signal<any>(null);
  readonly panelDetails = signal<any>(null);
  readonly panelLoading_ = signal(false);
  readonly panelOpen = signal(false);
  readonly activeTab = signal<'farmers' | 'pending'>('farmers');
  readonly respondingId = signal<string | null>(null);
  readonly expandedSection = signal<string | null>(null);
  readonly showConfrereModal = signal(false);
  confrereSearch = '';
  confrereGovFilter = '';
  readonly availableExperts = signal<any[]>([]);

  searchQuery = '';
  selectedGovernorate = '';

  readonly filteredFarmers = computed(() => {
    let list = this.farmers();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.governorate?.toLowerCase().includes(q)
      );
    }
    if (this.selectedGovernorate) {
      list = list.filter(f => f.governorate === this.selectedGovernorate);
    }
    return list;
  });

  readonly uniqueGovernorates = computed(() => {
    const govs = new Set(this.farmers().map((f: any) => f.governorate).filter(Boolean));
    return Array.from(govs);
  });

  readonly filteredConfreres = computed(() => {
    let list = this.availableExperts();
    if (this.confrereSearch) {
      const q = this.confrereSearch.toLowerCase();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.governorate?.toLowerCase().includes(q)
      );
    }
    if (this.confrereGovFilter) {
      list = list.filter(e => e.governorate === this.confrereGovFilter);
    }
    return list;
  });

  ngOnInit() {
    this.loadFarmers();
    this.loadPending();
    this.loadAvailableExperts();
  }

  /** Real‑time: reload pending list when a new request arrives via WebSocket */
  private readonly _pendingWatcher = effect(() => {
    this.api.pendingRequestRefresh();
    this.loadPending();
  });

  loadFarmers() {
    this.loading.set(true);
    this.api.getMyFarmers().subscribe({
      next: (data) => { this.farmers.set(data); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  loadPending() {
    this.pendingLoading.set(true);
    this.api.getPendingRelations().subscribe({
      next: (data) => { this.pendingRelations.set(data); this.pendingLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.pendingLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  loadAvailableExperts() {
    this.api.getAvailableExperts().subscribe({
      next: (data) => { this.availableExperts.set(data); this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  onSearch() { /* signal computed re-runs */ }
  onGovernorateFilter() { /* signal computed re-runs */ }

  openFarmerPanel(farmer: any) {
    this.selectedFarmer.set(farmer);
    this.panelDetails.set(null);
    this.panelOpen.set(true);
    this.panelLoading_.set(true);
    this.expandedSection.set(null);

    this.api.getFarmerDetails(farmer.id).subscribe({
      next: (details) => { this.panelDetails.set(details); this.panelLoading_.set(false); this.cdr.markForCheck(); },
      error: () => { this.panelLoading_.set(false); this.cdr.markForCheck(); }
    });
  }

  closePanel() {
    this.panelOpen.set(false);
  }

  toggleSection(section: string) {
    this.expandedSection.update(cur => cur === section ? null : section);
  }

  goToMessages(farmer: any) {
    this.router.navigate(['/dashboard/expert/messages'], {
      queryParams: { farmerId: farmer.id, farmerName: farmer.name }
    });
  }

  respondToRelation(id: string, accepted: boolean) {
    this.respondingId.set(id);
    this.api.respondToLink(id, accepted).subscribe({
      next: () => {
        this.pendingRelations.update(list => list.filter(r => r.id !== id));
        this.respondingId.set(null);
        this.toast.success(accepted ? 'Agriculteur ajouté à votre liste' : 'Demande déclinée');
        if (accepted) this.loadFarmers();
        this.cdr.markForCheck();
      },
      error: () => { this.respondingId.set(null); this.cdr.markForCheck(); }
    });
  }

  contactConfrere(expert: any) {
    this.showConfrereModal.set(false);
    this.router.navigate(['/dashboard/expert/messages'], {
      queryParams: { farmerId: expert.id, farmerName: expert.name }
    });
  }

  formatAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'il y a 1 jour';
    return `il y a ${days} jours`;
  }
}
