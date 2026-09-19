import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideUsers, lucideMapPin, lucidePhone, lucideFileText,
  lucideX, lucideCheck, lucideShield, lucideEye, lucideFilter,
  lucideDownload, lucideRefreshCw, lucideUser, lucideCalendar,
  lucideBanknote, lucideFolder
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface Dossier {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  programName: string;
  requestedAmountTnd: number;
  approvedAmountTnd?: number | null;
  createdAt: string;
  farmer?: { id: string; name: string; phone?: string; governorate?: string };
}

interface FarmerCard {
  id: string;
  name: string;
  phone: string;
  governorate: string;
  dossierCount: number;
  totalRequested: number;
  latestDossier: string;
  latestStatus: string;
  dossiers: Dossier[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED:    { label: 'Soumis',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  UNDER_REVIEW: { label: 'En revision', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:     { label: 'Approuve',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:     { label: 'Rejete',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  INCOMPLETE:   { label: 'Incomplet',   color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  DRAFT:        { label: 'Brouillon',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  CLOSED:       { label: 'Cloture',     color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  WITHDRAWN:    { label: 'Retire',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
};

@Component({
  selector: 'app-apia-farmer-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideSearch, lucideUsers, lucideMapPin, lucidePhone, lucideFileText,
    lucideX, lucideCheck, lucideShield, lucideEye, lucideFilter,
    lucideDownload, lucideRefreshCw, lucideUser, lucideCalendar,
    lucideBanknote, lucideFolder
  })],
  styles: [`
    .fl-page { padding: 24px; min-height: 100vh; background: var(--bg-main); }

    .fl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .fl-header__left { display: flex; align-items: center; gap: 12px; }
    .fl-header__icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--zir-emerald) 12%, transparent); border: 1px solid color-mix(in srgb, var(--zir-emerald) 25%, transparent); }
    .fl-header__title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .fl-header__sub { font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0; }

    .fl-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .fl-kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
    .fl-kpi__value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .fl-kpi__value--emerald { color: var(--zir-emerald); }
    .fl-kpi__value--amber { color: #f59e0b; }
    .fl-kpi__value--red { color: #ef4444; }
    .fl-kpi__label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; }

    .fl-toolbar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    .fl-search { flex: 1; min-width: 240px; position: relative; }
    .fl-search ng-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 16px; height: 16px; }
    .fl-search input { width: 100%; padding: 10px 14px 10px 38px; border-radius: 10px; font-size: 0.85rem; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); outline: none; }
    .fl-search input:focus { border-color: var(--zir-emerald); }

    .fl-chip { padding: 7px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .fl-chip:hover { border-color: var(--zir-emerald); color: var(--text-primary); }
    .fl-chip--active { background: color-mix(in srgb, var(--zir-emerald) 12%, transparent); border-color: color-mix(in srgb, var(--zir-emerald) 40%, transparent); color: var(--zir-emerald); }

    .fl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

    .fl-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
    .fl-card:hover { border-color: color-mix(in srgb, var(--zir-emerald) 35%, transparent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }

    .fl-card__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .fl-card__avatar { width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--zir-emerald) 12%, transparent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .fl-card__avatar-letter { font-size: 0.95rem; font-weight: 700; color: var(--zir-emerald); }
    .fl-card__name { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
    .fl-card__location { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .fl-card__location ng-icon { width: 12px; height: 12px; }

    .fl-card__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
    .fl-stat { display: flex; flex-direction: column; gap: 2px; }
    .fl-stat__label { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .fl-stat__value { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }

    .fl-card__dossier-row { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
    .fl-card__dossier-tag { font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; }

    .fl-card__phone { display: flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 0.78rem; color: var(--text-muted); font-family: monospace; }
    .fl-card__phone ng-icon { width: 13px; height: 13px; }

    .fl-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .fl-empty ng-icon { width: 48px; height: 48px; opacity: 0.25; margin-bottom: 12px; }
    .fl-empty__title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .fl-empty__desc { font-size: 0.82rem; margin: 0; }

    .fl-detail-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .fl-detail { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; }
    .fl-detail__head { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .fl-detail__title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
    .fl-detail__body { padding: 20px 24px; }
    .fl-detail__section { margin-bottom: 16px; }
    .fl-detail__section-title { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }

    .fl-dossier-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 10px; background: var(--bg-secondary); margin-bottom: 8px; }
    .fl-dossier-item__info { display: flex; flex-direction: column; gap: 2px; }
    .fl-dossier-item__ref { font-size: 0.78rem; font-weight: 700; font-family: monospace; color: var(--zir-emerald); }
    .fl-dossier-item__name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
    .fl-dossier-item__date { font-size: 0.7rem; color: var(--text-muted); }
    .fl-dossier-item__right { text-align: right; }
    .fl-dossier-item__amount { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
    .fl-dossier-item__unit { font-size: 0.68rem; color: var(--text-muted); }

    .fl-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }

    .sk { border-radius: 8px; animation: sk-pulse 1.5s ease-in-out infinite; background: var(--bg-secondary); }
    .sk-card { height: 180px; }
    .sk-kpi { height: 70px; }
    @keyframes sk-pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }

    .fl-btn { padding: 8px 16px; border-radius: 10px; font-size: 0.82rem; font-weight: 600; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.15s; }
    .fl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .fl-btn--primary { background: var(--zir-emerald); color: #fff; }
    .fl-btn--ghost { background: transparent; color: var(--text-muted); }
    .fl-btn--outline { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }

    @media (max-width: 768px) {
      .fl-kpi-row { grid-template-columns: repeat(2, 1fr); }
      .fl-grid { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <div class="fl-page">

      <!-- Header -->
      <div class="fl-header">
        <div class="fl-header__left">
          <div class="fl-header__icon">
            <ng-icon name="lucideUsers" style="width: 22px; height: 22px; color: var(--zir-emerald);"></ng-icon>
          </div>
          <div>
            <h1 class="fl-header__title">Agriculteurs Regionaux</h1>
            <p class="fl-header__sub">Porteurs de projets lies a l'APIA via leurs dossiers d'investissement</p>
          </div>
        </div>
        <button class="fl-btn fl-btn--outline" (click)="loadFarmers()">
          <ng-icon name="lucideRefreshCw" style="width: 14px; height: 14px;"></ng-icon>
          Actualiser
        </button>
      </div>

      <!-- KPIs -->
      <div class="fl-kpi-row">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="sk sk-kpi"></div>
          }
        } @else {
          <div class="fl-kpi">
            <div class="fl-kpi__value">{{ totalFarmers() }}</div>
            <div class="fl-kpi__label">Agriculteurs</div>
          </div>
          <div class="fl-kpi">
            <div class="fl-kpi__value fl-kpi__value--emerald">{{ totalDossiers() }}</div>
            <div class="fl-kpi__label">Dossiers actifs</div>
          </div>
          <div class="fl-kpi">
            <div class="fl-kpi__value fl-kpi__value--amber">{{ pendingCount() }}</div>
            <div class="fl-kpi__label">En attente</div>
          </div>
          <div class="fl-kpi">
            <div class="fl-kpi__value">{{ totalAmount() | number:'1.0-0' }}</div>
            <div class="fl-kpi__label">DT demande</div>
          </div>
        }
      </div>

      <!-- Toolbar -->
      <div class="fl-toolbar">
        <div class="fl-search">
          <ng-icon name="lucideSearch"></ng-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher par nom, telephone, gouvernorat..."
                 (input)="filterFarmers()" />
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="fl-chip" [class.fl-chip--active]="activeFilter() === 'ALL'" (click)="setFilter('ALL')">
            Tous
          </button>
          <button class="fl-chip" [class.fl-chip--active]="activeFilter() === 'APPROVED'" (click)="setFilter('APPROVED')">
            Approuves
          </button>
          <button class="fl-chip" [class.fl-chip--active]="activeFilter() === 'SUBMITTED'" (click)="setFilter('SUBMITTED')">
            Soumis
          </button>
          <button class="fl-chip" [class.fl-chip--active]="activeFilter() === 'UNDER_REVIEW'" (click)="setFilter('UNDER_REVIEW')">
            En revision
          </button>
          <button class="fl-chip" [class.fl-chip--active]="activeFilter() === 'REJECTED'" (click)="setFilter('REJECTED')">
            Rejetes
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="fl-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="sk sk-card"></div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && filteredFarmers().length === 0) {
        <div class="fl-empty">
          <ng-icon name="lucideUsers"></ng-icon>
          <p class="fl-empty__title">Aucun agriculteur trouve</p>
          <p class="fl-empty__desc">
            @if (searchQuery || activeFilter() !== 'ALL') {
              Modifiez vos criteres de recherche ou de filtre
            } @else {
              Aucun dossier d'investissement n'a ete soumis a votre bureau regional
            }
          </p>
        </div>
      }

      <!-- Farmer Grid -->
      @if (!loading() && filteredFarmers().length > 0) {
        <div class="fl-grid">
          @for (farmer of filteredFarmers(); track farmer.id) {
            <div class="fl-card" (click)="openDetail(farmer)">
              <div class="fl-card__top">
                <div class="fl-card__avatar">
                  <span class="fl-card__avatar-letter">{{ farmer.name.charAt(0) }}</span>
                </div>
                <div style="text-align: right;">
                  <p class="fl-card__name">{{ farmer.name }}</p>
                  <div class="fl-card__location">
                    <ng-icon name="lucideMapPin"></ng-icon>
                    {{ farmer.governorate || 'Region' }}
                  </div>
                </div>
              </div>

              <div class="fl-card__dossier-row">
                <span class="fl-card__dossier-tag"
                      [style.background]="statusConfig(farmer.latestStatus).bg"
                      [style.color]="statusConfig(farmer.latestStatus).color">
                  {{ statusConfig(farmer.latestStatus).label }}
                </span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">
                  {{ farmer.dossierCount }} dossier(s)
                </span>
              </div>

              @if (farmer.phone) {
                <div class="fl-card__phone">
                  <ng-icon name="lucidePhone"></ng-icon>
                  {{ farmer.phone }}
                </div>
              }

              <div class="fl-card__stats">
                <div class="fl-stat">
                  <span class="fl-stat__label">Demande</span>
                  <span class="fl-stat__value">{{ farmer.totalRequested | number:'1.0-0' }} DT</span>
                </div>
                <div class="fl-stat">
                  <span class="fl-stat__label">Dernier dossier</span>
                  <span class="fl-stat__value" style="font-size: 0.78rem;">{{ farmer.latestDossier | date:'dd/MM/yy' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedFarmer()) {
        <div class="fl-detail-backdrop" (click)="selectedFarmer.set(null)">
          <div class="fl-detail" (click)="$event.stopPropagation()">
            <div class="fl-detail__head">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="fl-card__avatar">
                  <span class="fl-card__avatar-letter">{{ selectedFarmer()!.name.charAt(0) }}</span>
                </div>
                <div>
                  <div class="fl-detail__title">{{ selectedFarmer()!.name }}</div>
                  <div class="fl-card__location" style="margin-top: 2px;">
                    <ng-icon name="lucideMapPin"></ng-icon>
                    {{ selectedFarmer()!.governorate || 'Region non definie' }}
                    @if (selectedFarmer()!.phone) {
                      <span style="margin-left: 8px;">
                        <ng-icon name="lucidePhone" style="width: 12px; height: 12px;"></ng-icon>
                        {{ selectedFarmer()!.phone }}
                      </span>
                    }
                  </div>
                </div>
              </div>
              <button class="fl-btn fl-btn--ghost" (click)="selectedFarmer.set(null)">
                <ng-icon name="lucideX" style="width: 18px; height: 18px;"></ng-icon>
              </button>
            </div>

            <div class="fl-detail__body">
              <div class="fl-detail__section">
                <div class="fl-detail__section-title">
                  <ng-icon name="lucideFolder" style="width: 13px; height: 13px; display: inline; vertical-align: -2px;"></ng-icon>
                  Dossiers d'investissement ({{ selectedFarmer()!.dossiers.length }})
                </div>

                @for (d of selectedFarmer()!.dossiers; track d.id) {
                  <div class="fl-dossier-item">
                    <div class="fl-dossier-item__info">
                      <span class="fl-dossier-item__ref">{{ d.referenceNumber }}</span>
                      <span class="fl-dossier-item__name">{{ d.programName }}</span>
                      <span class="fl-dossier-item__date">{{ d.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="fl-dossier-item__right">
                      <div class="fl-dossier-item__amount">{{ d.requestedAmountTnd | number:'1.3-3' }}</div>
                      <div class="fl-dossier-item__unit">DT demande</div>
                      <span class="fl-pill"
                            [style.background]="statusConfig(d.status).bg"
                            [style.color]="statusConfig(d.status).color"
                            style="margin-top: 4px;">
                        {{ statusConfig(d.status).label }}
                      </span>
                    </div>
                  </div>
                }
              </div>

              <div style="padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, var(--zir-emerald) 6%, transparent); border: 1px solid color-mix(in srgb, var(--zir-emerald) 15%, transparent); display: flex; align-items: center; gap: 8px;">
                <ng-icon name="lucideShield" style="width: 14px; height: 14px; color: var(--zir-emerald); flex-shrink: 0;"></ng-icon>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">
                  Consultation enregistree dans le journal d'audit. Cet agriculteur ne verra que le nom de votre institution.
                </p>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class ApiaFarmerLookupComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = environment.apiUrl;

  allFarmers = signal<FarmerCard[]>([]);
  filteredFarmers = signal<FarmerCard[]>([]);
  selectedFarmer = signal<FarmerCard | null>(null);
  loading = signal(true);
  searchQuery = '';
  activeFilter = signal<string>('ALL');

  totalFarmers = computed(() => this.filteredFarmers().length);
  totalDossiers = computed(() => this.filteredFarmers().reduce((sum, f) => sum + f.dossierCount, 0));
  pendingCount = computed(() => this.filteredFarmers().reduce((sum, f) =>
    sum + f.dossiers.filter(d => d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW').length, 0));
  totalAmount = computed(() => this.filteredFarmers().reduce((sum, f) => sum + f.totalRequested, 0));

  private get headers() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  ngOnInit() {
    this.loadFarmers();
  }

  loadFarmers() {
    this.loading.set(true);
    const user = this.authStore.currentUser() as any;
    const institutionId = user?.institutionMember?.institutionId;
    if (!institutionId) {
      this.loading.set(false);
      return;
    }

    this.http.get<{ data: Dossier[]; total: number }>(
      `${this.apiUrl}/dossiers/institution/${institutionId}?limit=200`,
      { headers: this.headers }
    ).subscribe({
      next: (res) => {
        this.buildFarmerCards(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private buildFarmerCards(dossiers: Dossier[]) {
    const map = new Map<string, FarmerCard>();

    for (const d of dossiers) {
      if (!d.farmer) continue;
      const fid = d.farmer.id;

      if (!map.has(fid)) {
        map.set(fid, {
          id: fid,
          name: d.farmer.name || 'Agriculteur',
          phone: d.farmer.phone || '',
          governorate: d.farmer.governorate || '',
          dossierCount: 0,
          totalRequested: 0,
          latestDossier: d.createdAt,
          latestStatus: d.status,
          dossiers: [],
        });
      }

      const card = map.get(fid)!;
      card.dossiers.push(d);
      card.dossierCount++;
      card.totalRequested += Number(d.requestedAmountTnd || 0);

      if (new Date(d.createdAt) > new Date(card.latestDossier)) {
        card.latestDossier = d.createdAt;
        card.latestStatus = d.status;
      }
    }

    const farmers = Array.from(map.values()).sort((a, b) => b.dossierCount - a.dossierCount);
    this.allFarmers.set(farmers);
    this.filterFarmers();
  }

  filterFarmers() {
    const q = this.searchQuery.toLowerCase();
    const statusFilter = this.activeFilter();

    let result = this.allFarmers();

    if (q) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.phone.includes(q) ||
        (f.governorate || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(f => f.dossiers.some(d => d.status === statusFilter));
    }

    this.filteredFarmers.set(result);
  }

  setFilter(filter: string) {
    this.activeFilter.set(filter);
    this.filterFarmers();
  }

  openDetail(farmer: FarmerCard) {
    this.selectedFarmer.set(farmer);
  }

  statusConfig(status: string) {
    return STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  }
}
