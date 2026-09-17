import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    lucideCpu, lucideTarget, lucideShieldAlert, lucideUsers, lucideFlaskConical,
  lucideMap, lucideFileText, lucideDroplets, lucideCheckCircle, lucideWrench,
  lucideDroplet, lucideAlertTriangle, lucideActivity, lucideMapPin,
  lucideHeart, lucideCalculator, lucideClipboardList, lucideSyringe,
  lucideBell, lucideLeaf, lucideCopy, lucideAlertCircle, lucideInfo
} from '@ng-icons/lucide';
import { ExpertApiService, ExpertDashboardStats } from '../../../core/services/expert-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { ToastService } from './shared/toast.service';

const TUNISIAN_GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte',
  'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
  'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Medenine',
  'Tataouine', 'Gafsa', 'Tozeur', 'Kébili'
];

const SPECIES_EMOJI: Record<string, string> = {
  BOVINE: '\uD83D\uDC02', OVINE: '\uD83D\uDC11', CAPRINE: '\uD83D\uDC10',
  POULTRY: '\uD83D\uDC14', CAMEL: '\uD83D\uDC2A', EQUINE: '\uD83D\uDC34', OTHER: '\uD83D\uDC3E'
};

const SPECIES_FRENCH: Record<string, string> = {
  BOVINE: 'Bovin', OVINE: 'Ovin', CAPRINE: 'Caprin',
  POULTRY: 'Volaille', CAMEL: 'Camelin', EQUINE: 'Equin', OTHER: 'Autre'
};

@Component({
  selector: 'app-exp-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, SkeletonLoaderComponent],
  providers: [provideIcons({
  lucideCpu, lucideTarget, lucideShieldAlert, lucideUsers, lucideFlaskConical,
    lucideMap, lucideFileText, lucideDroplets, lucideCheckCircle, lucideWrench,
    lucideDroplet, lucideAlertTriangle, lucideActivity, lucideMapPin,
    lucideHeart, lucideCalculator, lucideClipboardList, lucideSyringe,
    lucideBell, lucideLeaf, lucideCopy, lucideAlertCircle, lucideInfo
  })],
  template: `
    <div class="overview-container animate-in">
      <!-- KPI Cards -->
      <div class="kpi-row">
        @for (kpi of kpiCards(); track kpi.label) {
          <div class="kpi-card">
            <div class="kpi-icon-wrap" [style.background]="kpi.iconBg">
              <ng-icon [name]="kpi.icon" [style.color]="kpi.iconColor"></ng-icon>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ kpi.value }}</div>
              <div class="kpi-label">{{ kpi.label }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Ce qui compte aujourd'hui -->
      <div class="today-section">
        <span class="today-date">{{ getFrenchDate() }}</span>
        <span class="today-subtitle">{{ getTimeGreeting() }}{{ (auth.currentUser()?.name ?? '').split(' ')[0] }}.</span>
      </div>

      <!-- Specialized Block per Expert Type -->
      @switch (expertType()) {
        @case ('PHYTOPATHOLOGIST') {
          <div class="specialized-grid specialized-grid--phyto">
            <!-- File de Triage Urgente -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">File de Triage Urgente</h3>
                  @if (urgentCases().length > 0) {
                    <span class="count-badge count-badge--danger">{{ urgentCases().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/cases" class="see-all-link">Voir tout &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="case-mini-card">
                    <app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader>
                    <div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader><app-skeleton-loader height="12px" width="40%"></app-skeleton-loader></div>
                  </div>
                }
              } @else if (urgentCases().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideCheckCircle" class="empty-icon"></ng-icon>
                  <span class="empty-title">Aucun cas urgent</span>
                  <span class="empty-sub">La zone est saine cette semaine.</span>
                </div>
              } @else {
                @for (c of urgentCases().slice(0, 3); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      @if (c.photo_url) {
                        <img [src]="c.photo_url" alt="" class="case-thumb">
                      } @else {
                        <ng-icon name="lucideLeaf" class="case-thumb-placeholder"></ng-icon>
                      }
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <div class="confidence-bar-wrap">
                        <div class="confidence-bar" [style.width]="((c.confidence_score || 0) * 100) + '%'" [style.background]="getConfidenceColor(c.confidence_score || 0)"></div>
                      </div>
                      <a routerLink="/dashboard/expert/cases" class="treat-link">&rarr; Traiter</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Maladies Cette Semaine -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Maladies Cette Semaine</h3>
                  <span class="count-badge count-badge--muted">7 derniers jours</span>
                </div>
              </div>
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="disease-row"><app-skeleton-loader height="12px" width="50%"></app-skeleton-loader><app-skeleton-loader height="6px" width="30%"></app-skeleton-loader></div>
                }
              } @else if (!stats()?.top_diseases_week?.length) {
                <div class="empty-state"><span class="empty-sub">Aucune maladie signalée cette semaine.</span></div>
              } @else {
                @for (d of stats()?.top_diseases_week; track d.disease_name; let i = $index) {
                  <div class="disease-row">
                    <span class="disease-name">{{ d.disease_name }}</span>
                    <div class="disease-bar-wrap">
                      <div class="disease-bar" [style.width]="getDiseaseBarWidth(d.count) + '%'" [style.background]="i === 0 ? 'var(--zir-emerald)' : i === 1 ? 'var(--warning)' : 'var(--info)'"></div>
                    </div>
                    <span class="disease-count">{{ d.count }}</span>
                  </div>
                }
                <div class="disease-summary">{{ getOutbreakCount() }} foyers detectes cette semaine dans votre zone</div>
              }
            </div>
          </div>
        }

        @case ('AGRONOMIST') {
          <div class="specialized-grid specialized-grid--agro">
            <!-- File d'action prioritaire Agronome -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Analyses Hors-Normes</h3>
                  @if (priorityActions().length > 0) {
                    <span class="count-badge count-badge--danger">{{ priorityActions().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/analyses-sol" class="see-all-link">Voir tout &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="case-mini-card"><app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader><div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader><app-skeleton-loader height="12px" width="40%"></app-skeleton-loader></div></div>
                }
              } @else if (priorityActions().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideCheckCircle" class="empty-icon"></ng-icon>
                  <span class="empty-title">Toutes les analyses dans les normes</span>
                  <span class="empty-sub">Aucune alerte nutritive active.</span>
                </div>
              } @else {
                @for (c of priorityActions().slice(0, 3); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      <ng-icon name="lucideFlaskConical" class="case-thumb-placeholder"></ng-icon>
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <a routerLink="/dashboard/expert/analyses-sol" class="treat-link">&rarr; Traiter</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Dernieres Analyses de Sol -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Dernieres Analyses de Sol</h3>
                </div>
                <a routerLink="/dashboard/expert/analyses-sol" class="see-all-link">Voir toutes &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="soil-analysis-item"><app-skeleton-loader height="80px" border-radius="10px"></app-skeleton-loader></div>
                }
              } @else if (soilAnalyses().length === 0) {
                <div class="empty-state">
                  <span class="empty-title">Commencez par ajouter votre premiere analyse de sol</span>
                  <a routerLink="/dashboard/expert/analyses-sol" class="empty-action-btn">Ajouter une Analyse</a>
                </div>
              } @else {
                @for (a of soilAnalyses().slice(0, 3); track a.id) {
                  <div class="soil-analysis-item">
                    <div class="soil-analysis-header">
                      <span class="soil-date">{{ a.analysis_date | date:'dd/MM/yyyy' }}</span>
                      <span class="soil-farmer">{{ a.farmer_name }}</span>
                      <span class="soil-parcel">{{ a.parcel_name || '' }}</span>
                    </div>
                    <div class="npk-badges">
                      <span class="npk-badge" [class]="getNpkClass(a.nitrogen_ppm, 'N')">N:{{ a.nitrogen_ppm }}ppm</span>
                      <span class="npk-badge" [class]="getNpkClass(a.phosphorus_ppm, 'P')">P:{{ a.phosphorus_ppm }}ppm</span>
                      <span class="npk-badge" [class]="getNpkClass(a.potassium_ppm, 'K')">K:{{ a.potassium_ppm }}ppm</span>
                      <span class="npk-badge" [class]="getPhClass(a.ph)">pH:{{ a.ph }}</span>
                      <span class="npk-badge" [class]="getEcClass(a.electrical_conductivity)">EC:{{ a.electrical_conductivity }}ms</span>
                    </div>
                    <a routerLink="/dashboard/expert/analyses-sol" class="detail-link">Voir detail &rarr;</a>
                  </div>
                }
              }
            </div>

            <!-- Calculateur NPK Express -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Calculateur NPK Express</h3>
                </div>
                <span class="spec-subtitle">Base sur les normes INRAT Tunisie</span>
              </div>
              <div class="calc-form">
                <div class="calc-field">
                  <label class="calc-label">Culture</label>
                  <select class="calc-select" [(ngModel)]="npkCrop">
                    <option value="ble_dur">Ble dur</option>
                    <option value="orge">Orge</option>
                    <option value="tomate">Tomate</option>
                    <option value="olivier_adulte">Olivier adulte</option>
                    <option value="pomme_de_terre">Pomme de terre</option>
                    <option value="mais">Mais</option>
                    <option value="poivron">Poivron</option>
                    <option value="piment">Piment</option>
                    <option value="cultures_maracheres">Cultures maraicheres</option>
                  </select>
                </div>
                <div class="calc-field">
                  <label class="calc-label">Surface (ha)</label>
                  <input type="number" class="calc-input" [(ngModel)]="npkArea" min="0.1" step="0.1">
                </div>
                <div class="calc-field">
                  <label class="calc-label">pH actuel du sol</label>
                  <input type="number" class="calc-input" [(ngModel)]="npkPh" min="3" max="10" step="0.1">
                </div>
                <button class="calc-btn" [disabled]="!npkCrop || !npkArea" (click)="calculateNpk()">Calculer</button>
              </div>
              @if (npkResult()) {
                <div class="calc-result">
                  <div class="result-cards">
                    <div class="result-card">
                      <span class="result-label">N</span>
                      <span class="result-value">{{ npkResult().n_total_kg || 0 }}</span>
                      <span class="result-unit">kg/ha</span>
                      <span class="result-total">= {{ (npkResult().n_total_kg || 0) * npkArea }} kg total</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">P</span>
                      <span class="result-value">{{ npkResult().p_total_kg || 0 }}</span>
                      <span class="result-unit">kg/ha</span>
                      <span class="result-total">= {{ (npkResult().p_total_kg || 0) * npkArea }} kg total</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">K</span>
                      <span class="result-value">{{ npkResult().k_total_kg || 0 }}</span>
                      <span class="result-unit">kg/ha</span>
                      <span class="result-total">= {{ (npkResult().k_total_kg || 0) * npkArea }} kg total</span>
                    </div>
                  </div>
                  @if (npkPh < 6.5) {
                    <div class="ph-warning">
                      <ng-icon name="lucideAlertTriangle"></ng-icon>
                      Sol acide -- Prevoir un amendement calcaire avant incorporation.
                    </div>
                  }
                  @if (npkPh > 7.5) {
                    <div class="ph-warning">
                      <ng-icon name="lucideAlertTriangle"></ng-icon>
                      Sol alcalin -- Soufre elementaire recommande.
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @case ('HYDRAULIC_ENGINEER') {
          <div class="specialized-grid specialized-grid--hydraulic">
            <!-- File d'action prioritaire Hydraulicien -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Projets en Retard</h3>
                  @if (priorityActions().length > 0) {
                    <span class="count-badge count-badge--danger">{{ priorityActions().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/projets-irrigation" class="see-all-link">Voir tous &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="case-mini-card"><app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader><div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader></div></div>
                }
              } @else if (priorityActions().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideCheckCircle" class="empty-icon"></ng-icon>
                  <span class="empty-title">Tous les projets dans les delais</span>
                  <span class="empty-sub">Aucun projet en retard.</span>
                </div>
              } @else {
                @for (c of priorityActions().slice(0, 3); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      <ng-icon name="lucideDroplets" class="case-thumb-placeholder"></ng-icon>
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <a routerLink="/dashboard/expert/projets-irrigation" class="treat-link">&rarr; Traiter</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Projets en Cours -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Projets en Cours</h3>
                </div>
                <a routerLink="/dashboard/expert/projets-irrigation" class="see-all-link">Voir tous &rarr;</a>
              </div>

              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="project-item"><app-skeleton-loader height="80px" border-radius="10px"></app-skeleton-loader></div>
                }
              } @else if (waterProjects().length === 0) {
                <div class="empty-state">
                  <span class="empty-title">Aucun projet d'irrigation</span>
                  <a routerLink="/dashboard/expert/projets-irrigation" class="empty-action-btn">Creer le premier projet</a>
                </div>
              } @else {
                @for (p of waterProjects(); track p.id) {
                  <div class="project-item">
                    <div class="project-header">
                      <span class="project-name">{{ p.project_name }}</span>
                      <span class="project-farmer">{{ p.farmer_name }}</span>
                    </div>
                    <div class="project-badges">
                      <span class="irrigation-badge" [class]="'irrigation-badge irrigation-badge--' + (p.irrigation_type || 'DRIP').toLowerCase()">{{ p.irrigation_type }}</span>
                      <span class="status-badge" [class]="'status-badge status-badge--' + (p.status || 'ACTIVE').toLowerCase()">{{ p.status }}</span>
                      <span class="surface-badge">{{ p.area_ha }} ha</span>
                    </div>
                    @if (p.installation_date && p.estimated_completion_date) {
                      <div class="project-progress-wrap">
                        <div class="project-progress"><div class="project-progress-bar" [style.width]="getProjectProgress(p) + '%'"></div></div>
                      </div>
                    }
                    <a routerLink="/dashboard/expert/projets-irrigation" class="detail-link">Gerer &rarr;</a>
                  </div>
                }
              }
            </div>

            <!-- Calcul ETc Rapide -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Calcul ETc Rapide</h3>
                </div>
              </div>
              <div class="calc-form">
                <div class="calc-field">
                  <label class="calc-label">Culture</label>
                  <select class="calc-select" [(ngModel)]="etcCrop">
                    <option value="">Selectionner...</option>
                    @for (kc of cropKcList(); track kc.crop_type) {
                      <option [value]="kc.crop_type">{{ kc.crop_type }}</option>
                    }
                  </select>
                </div>
                <div class="calc-field">
                  <label class="calc-label">Stade</label>
                  <select class="calc-select" [(ngModel)]="etcStage">
                    <option value="INITIAL">Initial</option>
                    <option value="MI_SAISON">Mi-saison</option>
                    <option value="FIN">Fin de saison</option>
                  </select>
                </div>
                <div class="calc-field">
                  <label class="calc-label">Gouvernorat</label>
                  <select class="calc-select" [(ngModel)]="etcGovernorate">
                    <option value="">Selectionner...</option>
                    @for (gov of TUNISIAN_GOVERNORATES; track gov) {
                      <option [value]="gov">{{ gov }}</option>
                    }
                  </select>
                </div>
                <button class="calc-btn" [disabled]="!etcCrop || !etcGovernorate" (click)="calculateEtc()">Calculer</button>
              </div>
              @if (etcResult()) {
                <div class="calc-result">
                  <div class="result-cards">
                    <div class="result-card">
                      <span class="result-label">ETc</span>
                      <span class="result-value">{{ etcResult().etc_mm_day || 0 }}</span>
                      <span class="result-unit">mm/jour</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">Besoin</span>
                      <span class="result-value">{{ (etcResult().etc_mm_day || 0) * 10 }}</span>
                      <span class="result-unit">m3/ha/jour</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">Frequence</span>
                      <span class="result-value result-value--text">{{ getEtcFrequency(etcResult().etc_mm_day || 0) }}</span>
                    </div>
                  </div>
                  <button class="export-btn" (click)="exportEtcPdf()">Exporter en PDF</button>
                </div>
              }
            </div>
          </div>
        }

        @case ('HYDROGEOLOGIST') {
          <div class="specialized-grid specialized-grid--hydro">
            <!-- File d'action prioritaire Hydrogéologue -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Puits en Anomalie</h3>
                  @if (priorityActions().length > 0) {
                    <span class="count-badge count-badge--danger">{{ priorityActions().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/carte-puits" class="see-all-link">Voir carte &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="case-mini-card"><app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader><div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader></div></div>
                }
              } @else if (priorityActions().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideCheckCircle" class="empty-icon"></ng-icon>
                  <span class="empty-title">Tous les puits dans les normes</span>
                  <span class="empty-sub">Aucune anomalie detectee.</span>
                </div>
              } @else {
                @for (c of priorityActions().slice(0, 3); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      <ng-icon name="lucideDroplet" class="case-thumb-placeholder"></ng-icon>
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <a routerLink="/dashboard/expert/carte-puits" class="treat-link">&rarr; Inspecter</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Tableau de Bord Aquifere -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Tableau de Bord Aquifere</h3>
                </div>
              </div>

              <div class="aquifer-counters">
                <div class="aquifer-counter">
                  <ng-icon name="lucideDroplet" class="aquifer-icon aquifer-icon--emerald"></ng-icon>
                  <span class="aquifer-count">{{ getActiveWellsCount() }}</span>
                  <span class="aquifer-label">Puits Actifs</span>
                </div>
                <div class="aquifer-counter">
                  <ng-icon name="lucideAlertTriangle" class="aquifer-icon aquifer-icon--danger"></ng-icon>
                  <span class="aquifer-count">{{ getDrawdownCount() }}</span>
                  <span class="aquifer-label">Alertes Niveau</span>
                </div>
                <div class="aquifer-counter">
                  <ng-icon name="lucideActivity" class="aquifer-icon aquifer-icon--warning"></ng-icon>
                  <span class="aquifer-count">{{ getSalinityCount() }}</span>
                  <span class="aquifer-label">Alertes Salinite</span>
                </div>
                <div class="aquifer-counter">
                  <ng-icon name="lucideWrench" class="aquifer-icon aquifer-icon--muted"></ng-icon>
                  <span class="aquifer-count">{{ getMaintenanceCount() }}</span>
                  <span class="aquifer-label">En Maintenance</span>
                </div>
              </div>
              @if (getDrawdownCount() > 0) {
                <div class="aquifer-alert">
                  <ng-icon name="lucideAlertTriangle" class="aquifer-alert-icon"></ng-icon>
                  <div>
                    <span class="aquifer-alert-title">{{ getDrawdownCount() }} puits presentent une baisse critique du niveau d'eau.</span>
                    <span class="aquifer-alert-sub">Verification urgente recommandee.</span>
                  </div>
                </div>
              }
              <a routerLink="/dashboard/expert/carte-puits" class="full-btn">Ouvrir la Carte des Puits &rarr;</a>
            </div>

            <!-- Mesures Recentes -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Mesures Recentes</h3>
                </div>
              </div>
              @if (loading()) {
                <div class="table-skeleton">
                  @for (i of [1,2,3,4,5]; track i) {
                    <div class="skeleton-row"><app-skeleton-loader height="14px"></app-skeleton-loader></div>
                  }
                </div>
              } @else {
                <div class="measurements-table">
                  <div class="table-header-row">
                    <span class="th">Puits</span><span class="th">Fermier</span><span class="th">Niveau (m)</span><span class="th">Salinite (g/L)</span><span class="th">Date</span><span class="th">Anomalie</span>
                  </div>
                  @for (m of recentMeasurements(); track m.id) {
                    <div class="table-row" [class.table-row--anomaly]="m.anomaly_drawdown || m.anomaly_salinity">
                      <span class="td">{{ m.well_name }}</span>
                      <span class="td">{{ m.farmer_name }}</span>
                      <span class="td td--num">{{ m.water_level_m }}</span>
                      <span class="td td--num">{{ m.salinity_g_l }}</span>
                      <span class="td">{{ m.measured_at | date:'dd/MM' }}</span>
                      <span class="td">
                        @if (m.anomaly_drawdown) { <span class="anomaly-badge anomaly-badge--danger">Niveau &darr;</span> }
                        @if (m.anomaly_salinity) { <span class="anomaly-badge anomaly-badge--warning">Salinite &uarr;</span> }
                        @if (!m.anomaly_drawdown && !m.anomaly_salinity) { <ng-icon name="lucideCheckCircle" class="check-icon"></ng-icon> }
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @case ('ZOOTECHNICIAN') {
          <div class="specialized-grid specialized-grid--zoo">
            <!-- File d'action prioritaire Zootechnicien -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Elevages Sous Attention</h3>
                  @if (priorityActions().length > 0) {
                    <span class="count-badge count-badge--danger">{{ priorityActions().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/mes-elevages" class="see-all-link">Voir tous &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2]; track i) {
                  <div class="case-mini-card"><app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader><div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader></div></div>
                }
              } @else if (priorityActions().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideHeart" class="empty-icon"></ng-icon>
                  <span class="empty-title">Tous vos elevages performent bien</span>
                  <span class="empty-sub">Aucun animal sous-performant cette semaine</span>
                </div>
              } @else {
                @for (c of priorityActions().slice(0, 3); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      <ng-icon name="lucideHeart" class="case-thumb-placeholder"></ng-icon>
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <a routerLink="/dashboard/expert/mes-elevages" class="treat-link">&rarr; Voir</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Elevages Sous Attention -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Elevages Sous Attention</h3>
                </div>
                <a routerLink="/dashboard/expert/mes-elevages" class="see-all-link">Voir tous &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2]; track i) {
                  <div class="herd-item"><app-skeleton-loader height="70px" border-radius="10px"></app-skeleton-loader></div>
                }
              } @else if (getAttentionHerds().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideHeart" class="empty-icon"></ng-icon>
                  <span class="empty-title">Tous vos elevages performent bien</span>
                  <span class="empty-sub">Aucun animal sous-performant cette semaine</span>
                </div>
              } @else {
                @for (h of getAttentionHerds(); track h.id) {
                  <div class="herd-item">
                    <span class="herd-emoji">{{ getSpeciesEmoji(h.species) }}</span>
                    <div class="herd-info">
                      <span class="herd-species">{{ getSpeciesFrench(h.species) }} {{ h.breed || '' }}</span>
                      <span class="herd-farmer">{{ h.farmer_name }}</span>
                      <span class="herd-size">Effectif : {{ h.herd_size }} animaux</span>
                    </div>
                    <div class="herd-perf">
                      <span class="perf-text">{{ h.performance_pct || 0 }}% de la norme INRAT</span>
                      <div class="perf-bar-wrap">
                        <div class="perf-bar" [style.width]="(h.performance_pct || 0) + '%'" [style.background]="getPerfColor(h.performance_pct || 0)"></div>
                      </div>
                    </div>
                    <a routerLink="/dashboard/expert/mes-elevages" class="detail-link">Voir &rarr;</a>
                  </div>
                }
              }
            </div>


            <!-- Ration Express -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Ration Express</h3>
                </div>
              </div>
              <div class="calc-form">
                <div class="calc-field">
                  <label class="calc-label">Espece</label>
                  <select class="calc-select" [(ngModel)]="rationSpecies">
                    <option value="BOVINE">Bovin lait</option>
                    <option value="BOVINE_VIande">Bovin viande</option>
                    <option value="OVINE">Ovin</option>
                    <option value="CAPRINE">Caprin</option>
                    <option value="POULTRY_CHAIR">Volaille chair</option>
                    <option value="POULTRY_OEUF">Poule pondeuse</option>
                    <option value="CAMEL">Camelin</option>
                  </select>
                </div>
                <div class="calc-field">
                  <label class="calc-label">Stade physiologique</label>
                  <select class="calc-select" [(ngModel)]="rationStage">
                    <option value="ENTRETIEN">Entretien</option>
                    <option value="GESTATION">Gestation</option>
                    <option value="LACTATION">Lactation</option>
                    <option value="CROISSANCE">Croissance</option>
                    <option value="ENGRAISSEMENT">Engraissement</option>
                  </select>
                </div>
                <div class="calc-field">
                  <label class="calc-label">Effectif</label>
                  <input type="number" class="calc-input" [(ngModel)]="rationHerdSize" min="1">
                </div>
                <button class="calc-btn" [disabled]="!rationSpecies || !rationHerdSize" (click)="calculateRation()">Calculer</button>
              </div>
              @if (rationResult()) {
                <div class="calc-result">
                  <div class="result-cards">
                    <div class="result-card">
                      <span class="result-label">UFL</span>
                      <span class="result-value">{{ rationResult().ufl_total || 0 }}</span>
                      <span class="result-unit">total</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">PDIN</span>
                      <span class="result-value">{{ rationResult().pdin_total_g || 0 }}</span>
                      <span class="result-unit">g total</span>
                    </div>
                    <div class="result-card">
                      <span class="result-label">PDIE</span>
                      <span class="result-value">{{ rationResult().pdie_total_g || 0 }}</span>
                      <span class="result-unit">g total</span>
                    </div>
                  </div>
                  @if (rationResult().example_ration) {
                    <div class="ration-text-zone">
                      <div class="ration-text-header">
                        <span class="ration-text-label">Exemple de ration</span>
                        <button class="copy-btn" (click)="copyRation()"><ng-icon name="lucideCopy"></ng-icon> Copier</button>
                      </div>
                      <span class="ration-text">{{ rationResult().example_ration }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @case ('VETERINARY_EPIDEMIOLOGIST') {
          <div class="specialized-grid specialized-grid--vet">
            <!-- File d'action prioritaire Vétérinaire : rappels + consultations unifiés -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Actions Prioritaires</h3>
                  @if (priorityActions().length > 0) {
                    <span class="count-badge count-badge--danger">{{ priorityActions().length }}</span>
                  }
                </div>
                <a routerLink="/dashboard/expert/vaccinations" class="see-all-link">Vaccinations &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="case-mini-card"><app-skeleton-loader width="72px" height="72px" border-radius="10px"></app-skeleton-loader><div class="case-mini-info"><app-skeleton-loader height="14px" width="60%"></app-skeleton-loader></div></div>
                }
              } @else if (priorityActions().length === 0) {
                <div class="empty-state empty-state--success">
                  <ng-icon name="lucideSyringe" class="empty-icon"></ng-icon>
                  <span class="empty-title">Aucune action urgente</span>
                  <span class="empty-sub">Carnet vaccinal et consultations a jour</span>
                </div>
              } @else {
                @for (c of priorityActions().slice(0, 4); track c.id) {
                  <div class="case-mini-card" [style.border-left-color]="getUrgencyBorderColor(c.urgency_score || 0)">
                    <div class="case-photo">
                      <ng-icon [name]="c.case_type === 'VACCINATION_REMINDER' ? 'lucideSyringe' : 'lucideClipboardList'" class="case-thumb-placeholder"></ng-icon>
                    </div>
                    <div class="case-mini-info">
                      <span class="case-disease">{{ c.title }}</span>
                      <span class="case-farmer"><ng-icon name="lucideUsers" class="inline-icon"></ng-icon> {{ c.farmer_name }} &middot; {{ c.delegation || '' }}</span>
                      <span class="case-time">{{ getTimeAgo(c.created_at) }}</span>
                    </div>
                    <div class="case-mini-right">
                      <span class="urgency-badge" [class]="'urgency-badge urgency-badge--' + getUrgencyLevel(c.urgency_score || 0)">{{ getUrgencyLabel(c.urgency_score || 0) }}</span>
                      <a [routerLink]="c.action_route" class="treat-link">&rarr; Traiter</a>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Consultations en Attente -->
            <div class="spec-card">
              <div class="spec-card-header">
                <div class="spec-card-title-row">
                  <h3 class="spec-card-title">Consultations en Attente</h3>
                </div>
                <a routerLink="/dashboard/expert/consultations" class="see-all-link">Voir la file &rarr;</a>
              </div>
              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="consult-item"><app-skeleton-loader height="60px" border-radius="10px"></app-skeleton-loader></div>
                }
              } @else if (consultationsQueue().length === 0) {
                <div class="empty-state"><span class="empty-sub">Aucune consultation en attente.</span></div>
              } @else {
                @for (c of consultationsQueue().slice(0, 3); track c.id) {
                  <div class="consult-item">
                    <div class="consult-info">
                      <span class="consult-title">{{ c.title || c.consultation_type }}</span>
                      <span class="consult-desc">{{ (c.description || '') | slice:0:80 }}{{ (c.description || '').length > 80 ? '...' : '' }}</span>
                      <span class="consult-farmer">{{ c.farmer_name }}</span>
                    </div>
                    <div class="consult-right">
                      <span class="consult-amount">{{ c.net_to_expert_tnd || 0 }} TND</span>
                      <button class="accept-btn-sm" (click)="acceptConsultation(c)">Accepter</button>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .overview-container { max-width: 1400px; }

    /* KPI Row */
    .kpi-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .kpi-card { flex: 1; min-width: 200px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px 24px; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 16px; }
    .kpi-icon-wrap { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-icon-wrap ng-icon { width: 20px; height: 20px; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 2rem; font-weight: 900; color: var(--text-primary); line-height: 1; font-variant-numeric: tabular-nums; }
    .kpi-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 4px; }

    /* Today Section */
    .today-section { display: flex; align-items: baseline; gap: 12px; margin-bottom: 24px; }
    .today-date { font-size: 0.9rem; color: var(--text-secondary); }
    .today-subtitle { font-size: 0.85rem; color: var(--text-muted); }

    /* Specialized Grid */
    .specialized-grid { display: grid; gap: 20px; }
    .specialized-grid--phyto { grid-template-columns: 60% 40%; }
    .specialized-grid--agro { grid-template-columns: 50% 50%; }
    .specialized-grid--hydraulic { grid-template-columns: 50% 50%; }
    .specialized-grid--hydro { grid-template-columns: 40% 60%; }
    .specialized-grid--zoo { grid-template-columns: 55% 45%; }
    .specialized-grid--vet { grid-template-columns: 50% 50%; }

    /* Spec Card */
    .spec-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
    .spec-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .spec-card-title-row { display: flex; align-items: center; gap: 8px; }
    .spec-card-title { font-size: 1rem; font-weight: 800; color: var(--text-primary); margin: 0; }
    .spec-subtitle { font-size: 0.82rem; color: var(--text-muted); }
    .see-all-link { font-size: 0.85rem; color: var(--expert-accent, var(--zir-emerald)); font-weight: 600; text-decoration: none; white-space: nowrap; }
    .see-all-link:hover { text-decoration: underline; }
    .count-badge { border-radius: 20px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700; }
    .count-badge--danger { background: var(--danger-alpha); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
    .count-badge--warning { background: var(--warning-alpha); color: var(--warning); border: 1px solid rgba(245,158,11,0.2); }
    .count-badge--muted { background: var(--bg-primary); color: var(--text-muted); border: 1px solid var(--border); }

    /* Case Mini Card (Phyto) */
    .case-mini-card { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--border); border-left: 3px solid transparent; padding-left: 12px; margin-left: -12px; }
    .case-mini-card:last-child { border-bottom: none; }
    .case-photo { width: 72px; height: 72px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; }
    .case-thumb { width: 100%; height: 100%; object-fit: cover; }
    .case-thumb-placeholder { width: 28px; height: 28px; color: var(--text-muted); }
    .case-mini-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .case-disease { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .case-farmer { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .case-time { font-size: 0.75rem; color: var(--text-muted); }
    .case-mini-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .urgency-badge { border-radius: 20px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; border: 1px solid transparent; }
    .urgency-badge--critical { background: var(--danger-alpha); color: var(--danger); border-color: rgba(239,68,68,0.2); }
    .urgency-badge--high { background: var(--warning-alpha); color: var(--warning); border-color: rgba(245,158,11,0.2); }
    .urgency-badge--moderate { background: rgba(234,179,8,0.1); color: #b45309; border-color: rgba(234,179,8,0.2); }
    .urgency-badge--normal { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border-color: var(--zir-emerald-alpha-20); }
    .confidence-bar-wrap { width: 60px; height: 4px; border-radius: 2px; background: var(--bg-primary); overflow: hidden; }
    .confidence-bar { height: 100%; border-radius: 2px; transition: width 600ms ease-out; }
    .treat-link { font-size: 0.78rem; font-weight: 700; color: var(--expert-accent, var(--zir-emerald)); background: var(--expert-accent-bg, var(--zir-emerald-alpha-10)); border: 1px solid color-mix(in srgb, var(--expert-accent, var(--zir-emerald)) 30%, transparent); border-radius: 8px; padding: 4px 10px; text-decoration: none; margin-top: 4px; }
    .treat-link:hover { background: var(--expert-accent-bg, var(--zir-emerald-alpha-20)); }

    /* Disease Row */
    .disease-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .disease-name { font-weight: 600; color: var(--text-primary); flex: 1; font-size: 0.9rem; }
    .disease-bar-wrap { flex: 1; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
    .disease-bar { height: 100%; border-radius: 3px; transition: width 600ms ease-out; }
    .disease-count { color: var(--text-muted); font-size: 0.85rem; font-weight: 700; width: 24px; text-align: right; }
    .disease-summary { font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; }

    /* Soil Analysis */
    .soil-analysis-item { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .soil-analysis-item:last-child { border-bottom: none; }
    .soil-analysis-header { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
    .soil-date { font-size: 0.78rem; color: var(--text-muted); }
    .soil-farmer { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
    .soil-parcel { color: var(--text-secondary); font-size: 0.82rem; }
    .npk-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .npk-badge { display: inline-flex; align-items: center; gap: 2px; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .npk-badge--green { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border: 1px solid var(--zir-emerald-alpha-20); }
    .npk-badge--orange { background: var(--warning-alpha); color: var(--warning); border: 1px solid rgba(245,158,11,0.2); }
    .npk-badge--red { background: var(--danger-alpha); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
    .detail-link { font-size: 0.82rem; color: var(--expert-accent, var(--zir-emerald)); font-weight: 600; text-decoration: none; }
    .detail-link:hover { text-decoration: underline; }

    /* Calc Form */
    .calc-form { display: flex; flex-direction: column; gap: 12px; }
    .calc-field { display: flex; flex-direction: column; gap: 4px; }
    .calc-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
    .calc-select, .calc-input { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text-primary); font-size: 0.9rem; transition: border-color 150ms; }
    .calc-select:focus, .calc-input:focus { border-color: var(--expert-accent, var(--zir-emerald)); outline: none; box-shadow: 0 0 0 3px var(--expert-accent-bg, var(--zir-emerald-alpha-10)); }
    .calc-btn { width: 100%; background: var(--expert-accent, var(--zir-emerald)); color: white; border: none; border-radius: 10px; padding: 10px; font-weight: 700; cursor: pointer; transition: opacity 150ms; height: 42px; }
    .calc-btn:hover { opacity: 0.9; }
    .calc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Calc Result */
    .calc-result { margin-top: 16px; animation: fadeIn 200ms ease-out; }
    .result-cards { display: flex; gap: 12px; }
    .result-card { flex: 1; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 10px; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .result-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .result-value { font-size: 1.4rem; font-weight: 900; color: var(--text-primary); }
    .result-value--text { font-size: 0.85rem; font-weight: 700; }
    .result-unit { font-size: 0.8rem; color: var(--text-muted); }
    .result-total { font-size: 0.85rem; font-weight: 700; color: var(--zir-emerald); }
    .ph-warning { margin-top: 12px; background: var(--warning-alpha); border: 1px solid var(--warning); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--warning); font-weight: 600; }
    .ph-warning ng-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .export-btn { margin-top: 12px; width: 100%; background: transparent; color: var(--zir-emerald); border: 1px solid var(--zir-emerald-alpha-20); border-radius: 10px; padding: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
    .export-btn:hover { background: var(--zir-emerald-alpha-10); }

    /* Project Item */
    .project-item { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .project-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .project-name { font-weight: 700; color: var(--text-primary); }
    .project-farmer { color: var(--text-muted); font-size: 0.82rem; }
    .project-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .irrigation-badge, .status-badge, .surface-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .irrigation-badge--drip { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .irrigation-badge--sprinkler { background: var(--info-alpha); color: var(--info); }
    .irrigation-badge--flood { background: var(--warning-alpha); color: var(--warning); }
    .irrigation-badge--pivot { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    .irrigation-badge--localized { background: var(--info-alpha); color: var(--info); }
    .status-badge--design { background: var(--bg-card); color: var(--text-muted); }
    .status-badge--installation { background: var(--warning-alpha); color: var(--warning); }
    .status-badge--active { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .status-badge--maintenance { background: var(--danger-alpha); color: var(--danger); }
    .status-badge--completed { background: var(--info-alpha); color: var(--info); }
    .surface-badge { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); }
    .project-progress-wrap { margin-top: 8px; }
    .project-progress { height: 4px; background: var(--bg-primary); border-radius: 2px; overflow: hidden; }
    .project-progress-bar { height: 100%; background: var(--zir-emerald); border-radius: 2px; transition: width 600ms ease-out; }

    /* Aquifer */
    .aquifer-counters { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .aquifer-counter { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .aquifer-icon { width: 24px; height: 24px; }
    .aquifer-icon--emerald { color: var(--zir-emerald); }
    .aquifer-icon--danger { color: var(--danger); }
    .aquifer-icon--warning { color: var(--warning); }
    .aquifer-icon--muted { color: var(--text-muted); }
    .aquifer-count { font-size: 1.8rem; font-weight: 900; color: var(--text-primary); }
    .aquifer-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .aquifer-alert { background: var(--danger-alpha); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
    .aquifer-alert-icon { width: 18px; height: 18px; color: var(--danger); flex-shrink: 0; margin-top: 2px; }
    .aquifer-alert-title { font-weight: 600; color: var(--text-primary); display: block; }
    .aquifer-alert-sub { font-size: 0.85rem; color: var(--text-secondary); }
    .full-btn { display: block; width: 100%; background: var(--expert-accent, var(--zir-emerald)); color: white; border: none; border-radius: 10px; padding: 10px; font-weight: 700; text-align: center; text-decoration: none; cursor: pointer; }
    .full-btn:hover { opacity: 0.9; }

    /* Measurements Table */
    .measurements-table { width: 100%; }
    .table-header-row { display: grid; grid-template-columns: 1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .th { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    .table-row { display: grid; grid-template-columns: 1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .table-row:last-child { border-bottom: none; }
    .table-row--anomaly { background: rgba(239,68,68,0.04); }
    .td { color: var(--text-primary); }
    .td--num { text-align: right; font-variant-numeric: tabular-nums; }
    .anomaly-badge { display: inline-flex; padding: 2px 6px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; }
    .anomaly-badge--danger { background: var(--danger-alpha); color: var(--danger); }
    .anomaly-badge--warning { background: var(--warning-alpha); color: var(--warning); }
    .check-icon { width: 16px; height: 16px; color: var(--zir-emerald); }

    /* Herd Item */
    .herd-item { display: flex; gap: 14px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .herd-item:last-child { border-bottom: none; }
    .herd-emoji { font-size: 2rem; flex-shrink: 0; }
    .herd-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .herd-species { font-weight: 700; color: var(--text-primary); }
    .herd-farmer { font-size: 0.82rem; color: var(--text-secondary); }
    .herd-size { font-size: 0.82rem; color: var(--text-muted); }
    .herd-perf { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .perf-text { font-size: 0.82rem; color: var(--text-muted); }
    .perf-bar-wrap { width: 100px; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
    .perf-bar { height: 100%; border-radius: 3px; transition: width 600ms ease-out; }

    /* Vaccination Item */
    .vacc-item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .vacc-item:last-child { border-bottom: none; }
    .vacc-emoji { font-size: 2rem; flex-shrink: 0; }
    .vacc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .vacc-name { font-weight: 700; color: var(--text-primary); }
    .vacc-farmer { font-size: 0.82rem; color: var(--text-muted); }
    .vacc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .days-badge { border-radius: 20px; padding: 3px 10px; font-size: 0.78rem; font-weight: 700; }
    .days-badge--critical { background: var(--danger-alpha); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }
    .days-badge--warning { background: var(--warning-alpha); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); }
    .reminder-btn { font-size: 0.78rem; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border: 1px solid var(--zir-emerald-alpha-20); border-radius: 8px; padding: 4px 10px; cursor: pointer; margin-top: 4px; }
    .reminder-btn:hover { background: var(--zir-emerald-alpha-20); }

    /* Consultation Item */
    .consult-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
    .consult-item:last-child { border-bottom: none; }
    .consult-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .consult-title { font-weight: 700; color: var(--text-primary); }
    .consult-desc { font-size: 0.82rem; color: var(--text-secondary); }
    .consult-farmer { font-size: 0.8rem; color: var(--text-muted); }
    .consult-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .consult-amount { font-weight: 700; color: var(--zir-emerald); }
    .accept-btn-sm { font-size: 0.78rem; background: var(--zir-emerald); color: white; border: none; border-radius: 8px; padding: 4px 10px; cursor: pointer; }
    .accept-btn-sm:hover { opacity: 0.9; }

    /* Ration Text */
    .ration-text-zone { margin-top: 12px; background: var(--bg-primary); border-radius: 10px; padding: 14px; border: 1px solid var(--border); }
    .ration-text-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .ration-text-label { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); }
    .copy-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.82rem; padding: 0; }
    .copy-btn:hover { color: var(--zir-emerald); }
    .copy-btn ng-icon { width: 14px; height: 14px; }
    .ration-text { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; }

    /* Empty State */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; gap: 8px; }
    .empty-state--success { background: rgba(16,185,129,0.04); border-radius: 12px; }
    .empty-icon { width: 40px; height: 40px; color: var(--zir-emerald); }
    .empty-title { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .empty-sub { color: var(--text-muted); font-size: 0.82rem; }
    .empty-action-btn { margin-top: 8px; background: var(--zir-emerald); color: white; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; text-decoration: none; font-size: 0.85rem; }

    .inline-icon { width: 12px; height: 12px; }
    .table-skeleton { display: flex; flex-direction: column; gap: 8px; }
    .skeleton-row { height: 36px; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (max-width: 1024px) {
      .specialized-grid { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 640px) {
      .kpi-row { flex-direction: column; }
      .kpi-card { min-width: 0; }
      .result-cards { flex-direction: column; }
      .aquifer-counters { grid-template-columns: 1fr; }
    }
  `]
})
export class ExpOverviewComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  readonly auth = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly stats = signal<ExpertDashboardStats | null>(null);
  readonly expertType = computed(() => this.auth.currentUser()?.expert_type);
  readonly loading = signal(true);

  readonly TUNISIAN_GOVERNORATES = TUNISIAN_GOVERNORATES;

  // Phyto
  urgentCases = signal<any[]>([]);

  // Agronomist
  soilAnalyses = signal<any[]>([]);
  npkCrop = 'ble_dur';
  npkArea = 1.0;
  npkPh = 7.0;
  npkResult = signal<any | null>(null);

  // Hydraulic
  cropKcList = signal<any[]>([]);
  waterProjects = signal<any[]>([]);
  etcCrop = '';
  etcStage = 'MI_SAISON';
  etcGovernorate = '';
  etcResult = signal<any | null>(null);

  // Hydrogeologist
  wells = signal<any[]>([]);
  recentMeasurements = signal<any[]>([]);

  // Zootechnician
  herdRecords = signal<any[]>([]);
  rationSpecies = 'BOVINE';
  rationStage = 'ENTRETIEN';
  rationHerdSize = 1;
  rationResult = signal<any | null>(null);

  // Vet
  vaccinations = signal<any[]>([]);
  consultationsQueue = signal<any[]>([]);

  // Priority Actions (shared across all expert types)
  priorityActions = signal<any[]>([]);

  kpiCards = computed(() => {
    const type = this.expertType();
    const s = this.stats();
    const base = [
      { value: s?.validated_this_month, label: '', icon: '', iconBg: '', iconColor: '' }
    ];
    switch (type) {
      case 'PHYTOPATHOLOGIST': return [
        { value: s?.validated_this_month ?? 0, label: 'Cas validés ce mois', icon: 'lucideCpu', iconBg: 'var(--info-alpha)', iconColor: 'var(--info)' },
        { value: (s?.ai_accuracy_rate ?? 0) + '%', label: 'Précision IA', icon: 'lucideTarget', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: s?.alerts_this_month ?? 0, label: 'Alertes diffusées', icon: 'lucideShieldAlert', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' },
        { value: s?.farmers_count ?? 0, label: 'Agriculteurs protégés', icon: 'lucideUsers', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' }
      ];
      case 'AGRONOMIST': return [
        { value: s?.farmers_count ?? 0, label: 'Agriculteurs suivis', icon: 'lucideUsers', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: s?.validated_this_month ?? 0, label: 'Analyses réalisées', icon: 'lucideFlask', iconBg: 'var(--info-alpha)', iconColor: 'var(--info)' },
        { value: s?.alerts_this_month ?? 0, label: 'Parcelles actives', icon: 'lucideMap', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' },
        { value: s?.active_consultations_count ?? 0, label: 'Ordonnances ce mois', icon: 'lucideFileText', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' }
      ];
      case 'HYDRAULIC_ENGINEER': return [
        { value: s?.active_consultations_count ?? 0, label: 'Projets actifs', icon: 'lucideDroplets', iconBg: 'var(--info-alpha)', iconColor: 'var(--info)' },
        { value: s?.validated_this_month ?? 0, label: 'Installations terminées', icon: 'lucideCheckCircle', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: s?.farmers_count ?? 0, label: 'Agriculteurs suivis', icon: 'lucideUsers', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: s?.alerts_this_month ?? 0, label: 'Projets en maintenance', icon: 'lucideWrench', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' }
      ];
      case 'HYDROGEOLOGIST': return [
        { value: this.getActiveWellsCount(), label: 'Puits actifs', icon: 'lucideDroplet', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: this.getDrawdownCount(), label: 'Alertes niveau', icon: 'lucideAlertTriangle', iconBg: 'var(--danger-alpha)', iconColor: 'var(--danger)' },
        { value: this.getSalinityCount(), label: 'Alertes salinité', icon: 'lucideActivity', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' },
        { value: s?.validated_this_month ?? 0, label: 'Forages réalisés', icon: 'lucideMapPin', iconBg: 'var(--info-alpha)', iconColor: 'var(--info)' }
      ];
      case 'ZOOTECHNICIAN': return [
        { value: s?.farmers_count ?? 0, label: 'Élevages suivis', icon: 'lucideHeart', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' },
        { value: this.getAttentionHerds().length, label: 'Élevages sous-performants', icon: 'lucideAlertTriangle', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' },
        { value: s?.validated_this_month ?? 0, label: 'Rations calculées ce mois', icon: 'lucideCalculator', iconBg: 'var(--info-alpha)', iconColor: 'var(--info)' },
        { value: s?.farmers_count ?? 0, label: 'Agriculteurs-éleveurs', icon: 'lucideUsers', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' }
      ];
      case 'VETERINARY_EPIDEMIOLOGIST': return [
        { value: s?.pending_cases_count ?? 0, label: 'Dossiers cliniques ouverts', icon: 'lucideClipboardList', iconBg: 'var(--warning-alpha)', iconColor: 'var(--warning)' },
        { value: this.getCriticalVaccinationCount(), label: 'Rappels vaccinaux urgents', icon: 'lucideSyringe', iconBg: 'var(--danger-alpha)', iconColor: 'var(--danger)' },
        { value: s?.alerts_this_month ?? 0, label: 'Foyers actifs', icon: 'lucideMap', iconBg: 'var(--danger-alpha)', iconColor: 'var(--danger)' },
        { value: s?.farmers_count ?? 0, label: 'Éleveurs suivis', icon: 'lucideUsers', iconBg: 'var(--zir-emerald-alpha-10)', iconColor: 'var(--zir-emerald)' }
      ];
      default: return [];
    }
  });

  ngOnInit() {
    this.api.getDashboardStats().subscribe(s => {
      this.stats.set(s);
      this.loading.set(false);
    });

    // Load priority actions for all expert types
    this.api.getPriorityActions().subscribe(actions => this.priorityActions.set(actions || []));

    const type = this.expertType();
    if (type === 'PHYTOPATHOLOGIST') {
      this.api.getPendingCases().subscribe(cases => {
        this.urgentCases.set((cases || []).filter((c: any) => c.severity === 'HIGH' || c.severity === 'CRITICAL').sort((a: any, b: any) => (b.urgency_score || 0) - (a.urgency_score || 0)));
      });
    } else if (type === 'AGRONOMIST') {
      this.api.getSoilAnalyses().subscribe(soils => this.soilAnalyses.set(soils));
    } else if (type === 'HYDRAULIC_ENGINEER') {
      this.api.getCropKc().subscribe(kcs => this.cropKcList.set(kcs));
      this.api.getWaterProjects().subscribe(projects => this.waterProjects.set(projects));
    } else if (type === 'HYDROGEOLOGIST') {
      this.api.getWells().subscribe(wells => {
        this.wells.set(wells);
        const measurements: any[] = [];
        wells.forEach((w: any) => {
          if (w.recent_measurement) {
            measurements.push({ ...w.recent_measurement, well_name: w.well_name, farmer_name: w.farmer_name, anomaly_drawdown: w.anomaly_drawdown, anomaly_salinity: w.anomaly_salinity });
          }
        });
        this.recentMeasurements.set(measurements.slice(0, 5));
      });
    } else if (type === 'ZOOTECHNICIAN') {
      this.api.getAllHerdRecords().subscribe(herds => this.herdRecords.set(herds));
    } else if (type === 'VETERINARY_EPIDEMIOLOGIST') {
      this.api.getVaccinations().subscribe(vacs => this.vaccinations.set(vacs));
      this.api.getConsultationsQueue().subscribe(consults => this.consultationsQueue.set(consults));
    }
  }

  getFrenchDate(): string {
    const now = new Date();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonne matinée, ';
    if (h < 17) return 'Bon après-midi, ';
    return 'Bonsoir, ';
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'il y a < 1h';
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  getUrgencyBorderColor(score: number): string {
    if (score >= 50) return 'var(--danger)';
    if (score >= 30) return 'var(--warning)';
    return 'transparent';
  }

  getUrgencyLevel(score: number): string {
    if (score >= 50) return 'critical';
    if (score >= 30) return 'high';
    if (score >= 10) return 'moderate';
    return 'normal';
  }

  getUrgencyLabel(score: number): string {
    if (score >= 50) return 'CRITIQUE';
    if (score >= 30) return 'ELEVE';
    if (score >= 10) return 'MODERE';
    return 'NORMAL';
  }

  getConfidenceColor(score: number): string {
    if (score > 0.8) return 'var(--zir-emerald)';
    if (score > 0.6) return 'var(--warning)';
    return 'var(--danger)';
  }

  getDiseaseBarWidth(count: number): number {
    const max = Math.max(...(this.stats()?.top_diseases_week?.map((d: any) => d.count) || [1]));
    return (count / max) * 100;
  }

  getOutbreakCount(): number {
    return (this.stats()?.top_diseases_week || []).reduce((sum: number, d: any) => sum + (d.count || 0), 0);
  }

  getNpkClass(value: number, type: string): string {
    if (type === 'N') return value >= 200 ? 'npk-badge--green' : value >= 100 ? 'npk-badge--orange' : 'npk-badge--red';
    if (type === 'P') return value >= 50 ? 'npk-badge--green' : value >= 25 ? 'npk-badge--orange' : 'npk-badge--red';
    return value >= 100 ? 'npk-badge--green' : value >= 50 ? 'npk-badge--orange' : 'npk-badge--red';
  }

  getPhClass(ph: number): string {
    if (ph >= 5.5 && ph <= 7.2) return 'npk-badge--green';
    if (ph < 5.5) return 'npk-badge--red';
    return 'npk-badge--orange';
  }

  getEcClass(ec: number): string {
    if (ec < 2) return 'npk-badge--green';
    if (ec <= 4) return 'npk-badge--orange';
    return 'npk-badge--red';
  }

  calculateNpk() {
    this.api.getNpkCalculation(this.npkCrop, this.npkArea, this.npkPh).subscribe(res => this.npkResult.set(res));
  }

  calculateEtc() {
    this.api.getEtcCalculation(this.etcCrop, this.etcStage, this.etcGovernorate).subscribe(res => this.etcResult.set(res));
  }

  getEtcFrequency(etc: number): string {
    if (etc < 3) return 'Tous les 3-4 jours';
    if (etc <= 6) return 'Tous les 2 jours';
    return 'Quotidien recommande';
  }

  exportEtcPdf() { window.print(); }

  getActiveWellsCount(): number { return this.wells().filter((w: any) => w.status === 'ACTIVE').length; }
  getDrawdownCount(): number { return this.wells().filter((w: any) => w.anomaly_drawdown).length; }
  getSalinityCount(): number { return this.wells().filter((w: any) => w.anomaly_salinity).length; }
  getMaintenanceCount(): number { return this.wells().filter((w: any) => w.status === 'MAINTENANCE').length; }

  getAttentionHerds(): any[] { return this.herdRecords().filter((h: any) => h.performance_alert); }

  getSpeciesEmoji(species: string): string { return SPECIES_EMOJI[species] || '\uD83D\uDC3E'; }
  getSpeciesFrench(species: string): string { return SPECIES_FRENCH[species] || species; }

  getPerfColor(pct: number): string {
    if (pct < 60) return 'var(--danger)';
    if (pct < 80) return 'var(--warning)';
    return 'var(--zir-emerald)';
  }

  calculateRation() {
    this.api.getRationCalculation(this.rationSpecies, this.rationStage, this.rationHerdSize).subscribe(res => this.rationResult.set(res));
  }

  copyRation() {
    const text = this.rationResult()?.example_ration || '';
    navigator.clipboard.writeText(text);
    this.toastService.success('Ration copiee');
  }

  getUrgentVaccinations(): any[] {
    return this.vaccinations().filter((v: any) => v.days_until_reminder != null && v.days_until_reminder <= 7).sort((a: any, b: any) => (a.days_until_reminder || 99) - (b.days_until_reminder || 99));
  }

  getCriticalVaccinationCount(): number { return this.vaccinations().filter((v: any) => v.days_until_reminder != null && v.days_until_reminder <= 3).length; }
  getUrgentVaccinationCount(): number { return this.vaccinations().filter((v: any) => v.days_until_reminder != null && v.days_until_reminder <= 7).length; }

  openVaccinationReminder(v: any) { this.toastService.info('Ouvrez l\'onglet Vaccinations pour enregistrer ce rappel.'); }

  acceptConsultation(c: any) {
    this.api.acceptConsultation(c.id).subscribe({
      next: () => {
        this.consultationsQueue.update(q => q.filter((x: any) => x.id !== c.id));
        this.toastService.success('Consultation acceptee');
      },
      error: () => this.toastService.error('Erreur', 'Impossible d\'accepter la consultation.')
    });
  }

  getProjectProgress(p: any): number {
    if (!p.installation_date || !p.estimated_completion_date) return 0;
    const start = new Date(p.installation_date).getTime();
    const end = new Date(p.estimated_completion_date).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }
}
