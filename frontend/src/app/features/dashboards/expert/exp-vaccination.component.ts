import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideSyringe, lucideFilter, lucideAlertTriangle, lucideCheckCircle } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-exp-vaccination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideSyringe, lucideFilter, lucideAlertTriangle, lucideCheckCircle })],
  template: `
<div class="vac-wrap">
  <div class="page-header">
    <div>
      <h2>Suivi Prophylaxie & Vaccinations</h2>
      <p>Enregistrement des vaccinations et gestion des rappels</p>
    </div>
    <button class="action-btn" (click)="isDrawerOpen.set(true)">
      <ng-icon name="lucidePlus"></ng-icon> Nouveau Vaccin
    </button>
  </div>

  <!-- KPI Strip -->
  <div class="kpi-strip">
    <div class="kpi-item"><span class="kpi-val">{{ vaccinations().length }}</span><span class="kpi-lbl">Vaccinations</span></div>
    <div class="kpi-item warn"><span class="kpi-val">{{ urgentCount() }}</span><span class="kpi-lbl">Rappels imminents</span></div>
    <div class="kpi-item"><span class="kpi-val">{{ speciesSet().length }}</span><span class="kpi-lbl">Espèces</span></div>
  </div>

  <!-- Filters -->
  <div class="filters-bar">
    <div class="filter-group">
      <label>Espèce</label>
      <select class="filter-select" [(ngModel)]="filterSpecies" (ngModelChange)="cdr.markForCheck()">
        <option value="">Toutes</option>
        @for (s of speciesSet(); track s) {
          <option [value]="s">{{ sLabel(s) }}</option>
        }
      </select>
    </div>
    <div class="filter-group">
      <label>Statut</label>
      <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="cdr.markForCheck()">
        <option value="">Tous</option>
        <option value="urgent">Rappel imminent</option>
        <option value="ok">À jour</option>
      </select>
    </div>
    <div class="filter-group">
      <label>Recherche</label>
      <input class="filter-select" [(ngModel)]="filterSearch" (input)="cdr.markForCheck()" placeholder="Vaccin, lot...">
    </div>
  </div>

  <!-- Vaccination Cards -->
  <div class="vac-grid">
    @for (v of filtered(); track v.id) {
      <div class="vac-card" [class.urgent]="v.upcoming_reminder">
        <div class="card-head">
          <div>
            <strong>{{ v.vaccine_name }}</strong>
            <span class="species-tag">{{ sLabel(v.species) }}</span>
          </div>
          <span class="badge" [class.badge-red]="v.upcoming_reminder" [class.badge-green]="!v.upcoming_reminder">
            {{ v.upcoming_reminder ? 'Rappel!' : 'OK' }}
          </span>
        </div>
        <div class="card-sub">{{ v.farmer_name }}</div>
        <div class="card-metrics">
          <span class="cm-item"><ng-icon name="lucideSyringe"></ng-icon> {{ v.animal_count }} têtes</span>
          <span class="cm-item"><ng-icon name="lucideCalendar"></ng-icon> {{ v.vaccination_date | date:'dd/MM/yyyy' }}</span>
          <span class="cm-item"><ng-icon name="lucideAlertTriangle"></ng-icon> Rappel {{ v.next_reminder_date | date:'dd/MM/yyyy' }}</span>
        </div>
        @if (v.batch_number) {
          <div class="card-batch">Lot: {{ v.batch_number }}</div>
        }
        @if (v.notes) {
          <div class="card-notes">{{ v.notes }}</div>
        }
      </div>
    } @empty {
      <div class="empty-state">
        <ng-icon name="lucideSyringe"></ng-icon>
        <p>Aucune vaccination trouvée.</p>
      </div>
    }
  </div>
</div>

<!-- Drawer Form -->
<div class="drawer-backdrop" *ngIf="isDrawerOpen()" (click)="closeDrawer()"></div>
<div class="drawer" *ngIf="isDrawerOpen()">
  <div class="drawer-header">
    <h3>Nouvelle Vaccination</h3>
    <button class="close-btn" (click)="closeDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Agriculteur</label>
      <select class="form-control" [(ngModel)]="formModel.farmer_id">
        <option value="" disabled selected>Choisir...</option>
        <option *ngFor="let f of farmers()" [value]="f.id">{{ f.name }}</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Espèce</label>
        <select class="form-control" [(ngModel)]="formModel.species">
          <option value="bovin">Bovin</option>
          <option value="ovin">Ovin</option>
          <option value="caprin">Caprin</option>
          <option value="camel">Camélidé</option>
        </select>
      </div>
      <div class="form-group">
        <label>Nombre de têtes</label>
        <input type="number" class="form-control" [(ngModel)]="formModel.animal_count">
      </div>
    </div>
    <div class="form-group">
      <label>Vaccin</label>
      <select class="form-control" [(ngModel)]="formModel.vaccine_name">
        <option value="" disabled selected>Choisir...</option>
        <option *ngFor="let vt of vaccineTypes()" [value]="vt.vaccine_name">
          {{ vt.vaccine_name }} ({{ vt.disease_prevented }})
        </option>
      </select>
    </div>
    <div class="form-group">
      <label>Numéro de lot</label>
      <input class="form-control" [(ngModel)]="formModel.batch_number">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Date vaccination</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.vaccination_date">
      </div>
      <div class="form-group">
        <label>Prochain rappel</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.next_reminder_date">
      </div>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea class="form-control" rows="3" [(ngModel)]="formModel.notes"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveVaccination()" [disabled]="!formModel.farmer_id || !formModel.vaccine_name || !formModel.vaccination_date">Enregistrer</button>
  </div>
</div>
`,
  styles: [`
.vac-wrap { padding: 24px; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 1.4rem; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
.action-btn { background: var(--zir-emerald,#10b981); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.action-btn:hover { background: var(--zir-emerald-hover,#0d9668); }

.kpi-strip { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
.kpi-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center; }
.kpi-item.warn { border-color: #f59e0b; background: rgba(245,158,11,0.06); }
.kpi-val { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); display: block; }
.kpi-lbl { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; display: block; }

.filters-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.filter-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 0.82rem; min-width: 150px; }

.vac-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(320px,1fr)); gap: 12px; }
.vac-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.vac-card.urgent { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.card-head strong { font-size: 0.95rem; color: var(--text-primary); }
.species-tag { display: inline-block; background: var(--bg-secondary); padding: 1px 8px; border-radius: 4px; font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; }
.badge { padding: 3px 8px; border-radius: 5px; font-size: 0.65rem; font-weight: 700; }
.badge-green { background: rgba(16,185,129,0.12); color: #10b981; }
.badge-red { background: rgba(239,68,68,0.12); color: #ef4444; }
.card-sub { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px; }
.card-metrics { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 8px; }
.cm-item { font-size: 0.78rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px; }
.cm-item ng-icon { font-size: 0.7rem; color: var(--zir-emerald); }
.vac-card.urgent .cm-item ng-icon { color: #ef4444; }
.card-batch { font-size: 0.75rem; color: var(--text-muted); background: var(--bg-secondary); padding: 4px 8px; border-radius: 5px; display: inline-block; margin-bottom: 6px; }
.card-notes { font-size: 0.78rem; color: var(--text-secondary); padding: 6px 10px; background: var(--bg-secondary); border-radius: 6px; }
.empty-state { grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); }
.empty-state ng-icon { font-size: 48px; color: var(--border-accent); margin-bottom: 16px; }

.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 450px; height: 100vh; background: var(--bg-card); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; }
.drawer-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
.form-control { padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; font-size: 0.85rem; }
.form-control:focus { border-color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 14px; display: flex; gap: 10px; }
.btn-primary { background: var(--zir-emerald,#10b981); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; font-size: 0.85rem; }
.btn-primary[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; font-size: 0.85rem; }

@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: repeat(2,1fr); }
  .vac-grid { grid-template-columns: 1fr; }
  .filters-bar { flex-direction: column; }
  .filter-select { min-width: 100%; }
}
  `]
})
export class ExpVaccinationComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  vaccinations = signal<any[]>([]);
  farmers = signal<any[]>([]);
  vaccineTypes = signal<any[]>([]);
  isDrawerOpen = signal<boolean>(false);
  loading = signal(true);

  filterSpecies = '';
  filterStatus = '';
  filterSearch = '';

  formModel = {
    farmer_id: '', species: 'bovin', animal_count: 5, vaccine_name: '',
    batch_number: '', vaccination_date: new Date().toISOString().substring(0, 10),
    next_reminder_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), notes: ''
  };

  get speciesSet() {
    return () => [...new Set(this.vaccinations().map((v: any) => v.species).filter(Boolean))] as string[];
  }

  get urgentCount() {
    return () => this.vaccinations().filter(v => v.upcoming_reminder).length;
  }

  get filtered() {
    return () => {
      let list = this.vaccinations();
      if (this.filterSpecies) list = list.filter(v => v.species === this.filterSpecies);
      if (this.filterStatus === 'urgent') list = list.filter(v => v.upcoming_reminder);
      if (this.filterStatus === 'ok') list = list.filter(v => !v.upcoming_reminder);
      if (this.filterSearch) {
        const q = this.filterSearch.toLowerCase();
        list = list.filter(v => (v.vaccine_name || '').toLowerCase().includes(q) || (v.batch_number || '').toLowerCase().includes(q) || (v.farmer_name || '').toLowerCase().includes(q));
      }
      return list;
    };
  }

  sLabel(s: string) {
    return { bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin', camel: 'Camélidé', BOVINE: 'Bovin', OVINE: 'Ovin', CAPRINE: 'Caprin' }[s] || s;
  }

  ngOnInit() {
    this.loadVaccinations();
    this.api.getMyFarmers().subscribe(res => { this.farmers.set(res); this.cdr.markForCheck(); });
    this.api.getVaccineTypes().subscribe(res => { this.vaccineTypes.set(res); this.cdr.markForCheck(); });
  }

  loadVaccinations() {
    this.loading.set(true);
    this.api.getVaccinations().subscribe(res => {
      this.vaccinations.set(res);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '', species: 'bovin', animal_count: 5, vaccine_name: '',
      batch_number: '', vaccination_date: new Date().toISOString().substring(0, 10),
      next_reminder_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), notes: ''
    };
  }

  saveVaccination() {
    this.api.createVaccination(this.formModel).subscribe({
      next: () => { this.closeDrawer(); this.loadVaccinations(); }
    });
  }
}
