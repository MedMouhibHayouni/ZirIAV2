import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote, lucidePlus, lucideTrendingUp,
  lucidePieChart, lucideCalendar, lucideTarget
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface SubsidyProgram {
  id: string;
  name: string;
  criteria: string;
  totalBudgetTnd: number;
  allocatedBudgetTnd: number;
  applicationWindowStart: string;
  applicationWindowEnd: string;
  isOpen: boolean;
  applications: { id: string; status: string; requestedAmountTnd: number; grantedAmountTnd: number | null }[];
}

interface SubsidyKpis {
  totalPrograms: number;
  openPrograms: number;
  totalBudgetTnd: number;
  allocatedBudgetTnd: number;
  remainingBudgetTnd: number;
  utilizationRate: number;
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
}

@Component({
  selector: 'app-crda-subventions',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideBanknote, lucidePlus, lucideTrendingUp,
    lucidePieChart, lucideCalendar, lucideTarget
  })],
  styles: [`
    :host { --zir-violet: #8b5cf6; --zir-violet-deep: #6d28d9; }
    .crda-budget-bar { width: 100%; height: 8px; border-radius: 999px; background: var(--bg-secondary); overflow: hidden; }
    .crda-budget-bar__fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--zir-violet), var(--zir-violet-deep)); transition: width 0.7s ease; }
    .crda-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    @media (max-width: 600px) { .crda-stat-grid { grid-template-columns: 1fr; } }
    .crda-stat { display: flex; flex-direction: column; gap: 2px; }
    .crda-stat__label { font-size: 0.7rem; color: var(--text-muted); }
    .crda-stat__value { font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
    .crda-stat__value--violet { color: #a78bfa; }
    .inst-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--violet">
            <ng-icon name="lucideBanknote"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Programmes de Subvention</h1>
            <p class="inst-header__sub">Gestion budgétaire et dossiers de subventions agricoles</p>
          </div>
        </div>
        <div class="inst-header__actions">
          <button class="inst-btn inst-btn--violet" (click)="showCreate.set(true)">
            <ng-icon name="lucidePlus"></ng-icon>
            Nouveau programme
          </button>
        </div>
      </header>

      <!-- KPIs -->
      @if (kpis(); as k) {
        <div class="inst-kpi-grid">
          <div class="inst-kpi">
            <p class="inst-kpi__label">Programmes</p>
            <p class="inst-kpi__value">{{ k.totalPrograms }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Ouverts</p>
            <p class="inst-kpi__value" style="color: #10b981">{{ k.openPrograms }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Budget Total (TND)</p>
            <p class="inst-kpi__value inst-kpi__value--violet">{{ k.totalBudgetTnd | number:'1.3-3' }}</p>
          </div>
          <div class="inst-kpi">
            <p class="inst-kpi__label">Utilisation</p>
            <p class="inst-kpi__value" style="color: #f59e0b">{{ k.utilizationRate }}%</p>
          </div>
        </div>
      }

      <!-- Skeleton KPIs -->
      @if (loading()) {
        <div class="inst-kpi-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="inst-kpi sk-row">
              <div class="sk sk--h12 sk--w40"></div>
              <div class="sk sk--h20 sk--w60"></div>
            </div>
          }
        </div>
      }

      <!-- Create Modal -->
      @if (showCreate()) {
        <div class="inst-modal-backdrop" (click)="showCreate.set(false)">
          <div class="inst-modal" (click)="$event.stopPropagation()">
            <div class="inst-modal__head">
              <h3>Nouveau programme de subvention</h3>
              <button class="inst-modal__close" (click)="showCreate.set(false)">
                <ng-icon name="lucidePlus" style="transform: rotate(45deg)"></ng-icon>
              </button>
            </div>
            <div class="inst-modal__body">
              <div class="inst-field">
                <label>Nom du programme *</label>
                <input [(ngModel)]="form.name" placeholder="Ex: Subvention semences certifiées">
              </div>
              <div class="inst-field">
                <label>Critères d'éligibilité *</label>
                <textarea [(ngModel)]="form.criteria" rows="3"
                  placeholder="Décrivez les critères d'éligibilité..."></textarea>
              </div>
              <div class="inst-field">
                <label>Budget total (TND) *</label>
                <input type="number" [(ngModel)]="form.totalBudgetTnd" placeholder="0.000">
              </div>
              <div class="inst-field-row">
                <div class="inst-field">
                  <label>Date d'ouverture</label>
                  <input type="date" [(ngModel)]="form.applicationWindowStart">
                </div>
                <div class="inst-field">
                  <label>Date de clôture</label>
                  <input type="date" [(ngModel)]="form.applicationWindowEnd">
                </div>
              </div>
            </div>
            <div class="inst-modal__foot">
              <button class="inst-btn inst-btn--ghost" (click)="showCreate.set(false)">Annuler</button>
              <button class="inst-btn inst-btn--violet" (click)="createProgram()">
                <ng-icon name="lucidePlus"></ng-icon>
                Créer
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Programs List -->
      @if (loading()) {
        <div style="display: flex; flex-direction: column; gap: 14px">
          @for (i of [1,2,3]; track i) {
            <div class="inst-card" style="padding: 20px">
              <div class="sk-row">
                <div class="sk sk--h12 sk--w40"></div>
                <div class="sk sk--h20 sk--w60"></div>
                <div class="sk sk--h12 sk--full"></div>
                <div class="sk sk--h12 sk--w40"></div>
              </div>
            </div>
          }
        </div>
      } @else if (programs().length === 0) {
        <div class="inst-card">
          <div class="inst-empty">
            <ng-icon name="lucidePieChart"></ng-icon>
            <p>Aucun programme. Créez votre premier programme de subvention.</p>
          </div>
        </div>
      } @else {
        <div style="display: flex; flex-direction: column; gap: 14px">
          @for (p of programs(); track p.id) {
            <div class="inst-card" style="padding: 20px">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px">
                <div>
                  <span class="status-pill"
                    [class.status-pill--emerald]="p.isOpen"
                    [class.status-pill--red]="!p.isOpen">
                    <span class="status-pill__dot"></span>
                    {{ p.isOpen ? 'OUVERT' : 'FERMÉ' }}
                  </span>
                  <h3 style="margin: 8px 0 4px; font-size: 0.95rem; font-weight: 700; color: var(--text-primary)">{{ p.name }}</h3>
                  <p style="margin: 0; font-size: 0.78rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden">{{ p.criteria }}</p>
                </div>
              </div>

              <!-- Budget bar -->
              <div style="margin-bottom: 14px">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px">
                  <span style="font-size: 0.72rem; color: var(--text-muted)">Budget utilisé</span>
                  <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-primary)">
                    {{ p.allocatedBudgetTnd | number:'1.3-3' }} / {{ p.totalBudgetTnd | number:'1.3-3' }} TND
                  </span>
                </div>
                <div class="crda-budget-bar">
                  <div class="crda-budget-bar__fill"
                    [style.width.%]="p.totalBudgetTnd > 0 ? (p.allocatedBudgetTnd / p.totalBudgetTnd) * 100 : 0">
                  </div>
                </div>
              </div>

              <div class="crda-stat-grid">
                <div class="crda-stat">
                  <span class="crda-stat__label"><ng-icon name="lucideCalendar" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Fenêtre</span>
                  <span class="crda-stat__value">{{ p.applicationWindowStart }} → {{ p.applicationWindowEnd }}</span>
                </div>
                <div class="crda-stat">
                  <span class="crda-stat__label"><ng-icon name="lucideTarget" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Demandes</span>
                  <span class="crda-stat__value">                  {{ p.applications.length ?? 0 }}</span>
                </div>
                <div class="crda-stat">
                  <span class="crda-stat__label"><ng-icon name="lucideTrendingUp" style="width:12px;height:12px;vertical-align:-2px"></ng-icon> Restant</span>
                  <span class="crda-stat__value crda-stat__value--violet">
                    {{ (p.totalBudgetTnd - p.allocatedBudgetTnd) | number:'1.3-3' }} TND
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CrdaSubventionsComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  programs = signal<SubsidyProgram[]>([]);
  kpis = signal<SubsidyKpis | null>(null);
  loading = signal(true);
  showCreate = signal(false);

  form = { name: '', criteria: '', totalBudgetTnd: 0, applicationWindowStart: '', applicationWindowEnd: '' };

  private get headers() { return { Authorization: `Bearer ${this.authStore.token()}` }; }

  ngOnInit() { this.load(); this.loadKpis(); }

  load() {
    this.http.get<SubsidyProgram[]>(`${environment.apiUrl}/crda/subsidy-programs`, { headers: this.headers })
      .subscribe({ next: d => { this.programs.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  loadKpis() {
    this.http.get<SubsidyKpis>(`${environment.apiUrl}/crda/subsidy-programs/kpis`, { headers: this.headers })
      .subscribe({ next: d => this.kpis.set(d) });
  }

  createProgram() {
    if (!this.form.name || !this.form.criteria || !this.form.totalBudgetTnd) return;
    this.http.post<SubsidyProgram>(`${environment.apiUrl}/crda/subsidy-programs`, this.form, { headers: this.headers })
      .subscribe({
        next: p => { this.programs.update(l => [p, ...l]); this.showCreate.set(false); this.loadKpis(); this.resetForm(); }
      });
  }

  private resetForm() {
    this.form = { name: '', criteria: '', totalBudgetTnd: 0, applicationWindowStart: '', applicationWindowEnd: '' };
  }
}
