import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideInfo, lucideAlertTriangle, lucideDroplets, lucideEgg, lucideSkull, lucideHeart } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-exp-herd',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideInfo, lucideAlertTriangle, lucideDroplets, lucideEgg, lucideSkull, lucideHeart })],

  template: `
<div class="herd-wrap">
  <div class="page-header">
    <div>
      <h2>Suivi d'Élevages</h2>
      <p>Suivi des troupeaux, rendements et alertes de performance</p>
    </div>
    <button class="action-btn" (click)="isDrawerOpen.set(true)">
      <ng-icon name="lucidePlus"></ng-icon> Nouvelle Fiche
    </button>
  </div>

  <!-- KPI Strip -->
  <div class="kpi-strip">
    <div class="kpi-item"><span class="kpi-val">{{ herds().length }}</span><span class="kpi-lbl">Fiches</span></div>
    <div class="kpi-item"><span class="kpi-val">{{ totalAnimals() }}</span><span class="kpi-lbl">Têtes</span></div>
    <div class="kpi-item alert"><span class="kpi-val">{{ alertCount() }}</span><span class="kpi-lbl">Alertes</span></div>
    <div class="kpi-item"><span class="kpi-val">{{ avgMilk() }} <small>kg</small></span><span class="kpi-lbl">Ø Lait/j</span></div>
  </div>

  <!-- Species Tabs -->
  <div class="tabs-row">
    <button class="tab" [class.active]="activeTab() === 'TOUS'" (click)="activeTab.set('TOUS')">Tous</button>
    @for (s of speciesList(); track s) {
      <button class="tab" [class.active]="activeTab() === s" (click)="activeTab.set(s)">
        <ng-icon name="lucideActivity"></ng-icon> {{ sLabel(s) }}
      </button>
    }
  </div>
  <!-- Herd Cards -->
  <div class="herd-grid">
    @for (h of filteredHerds(); track h.id) {
      <div class="herd-card" [class.alert]="h.performance_alert">
        <div class="card-head">
          <div>
            <strong class="species">{{ h.species }}</strong>
            <span class="breed">{{ h.breed || '—' }}</span>
          </div>
          <span class="badge" [class.badge-red]="h.performance_alert" [class.badge-green]="!h.performance_alert">
            {{ h.performance_alert ? 'ALERTE' : 'OK' }}
          </span>
        </div>
        <div class="card-sub">{{ h.farmer_name }}</div>
        <div class="card-metrics">
          <div class="cm-item"><ng-icon name="lucideHeart"></ng-icon> {{ h.herd_size }} têtes</div>
          @if (h.daily_milk_yield_kg > 0) {
            <div class="cm-item"><ng-icon name="lucideDroplets"></ng-icon> {{ h.daily_milk_yield_kg }} kg/j</div>
          }
          <div class="cm-item"><ng-icon name="lucideEgg"></ng-icon> Natalité {{ h.birth_rate_pct }}%</div>
          <div class="cm-item"><ng-icon name="lucideSkull"></ng-icon> Mortalité {{ h.mortality_rate_pct }}%</div>
        </div>
        @if (h.feed_program) {
          <div class="card-feed">🍽️ {{ h.feed_program }}</div>
        }
        @if (h.performance_alert && h.notes) {
          <div class="card-alert">{{ h.notes }}</div>
        }
        <div class="card-foot">📅 {{ h.last_visit_date | date:'dd/MM/yyyy' }}</div>
      </div>
    } @empty {
      <div class="empty-state">Aucune fiche d'élevage enregistrée.</div>
    }
  </div>
</div>

<!-- Drawer Form -->
<div class="drawer-backdrop" *ngIf="isDrawerOpen()" (click)="closeDrawer()"></div>
<div class="drawer" *ngIf="isDrawerOpen()">
  <div class="drawer-header">
    <h3>Nouveau Suivi d'Élevage</h3>
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
          <option value="BOVINE">Bovin</option>
          <option value="OVINE">Ovin</option>
          <option value="CAPRINE">Caprin</option>
          <option value="CAMEL">Camélidé</option>
        </select>
      </div>
      <div class="form-group">
        <label>Race</label>
        <input class="form-control" [(ngModel)]="formModel.breed">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Taille du troupeau</label>
        <input type="number" class="form-control" [(ngModel)]="formModel.herd_size">
      </div>
      <div class="form-group">
        <label>Lait (kg/j)</label>
        <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.daily_milk_yield_kg">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Natalité (%)</label>
        <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.birth_rate_pct">
      </div>
      <div class="form-group">
        <label>Mortalité (%)</label>
        <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.mortality_rate_pct">
      </div>
    </div>
    <div class="form-group">
      <label>Date de visite</label>
      <input type="date" class="form-control" [(ngModel)]="formModel.last_visit_date">
    </div>
    <div class="form-group">
      <label>Programme alimentaire</label>
      <textarea class="form-control" rows="2" [(ngModel)]="formModel.feed_program"></textarea>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea class="form-control" rows="2" [(ngModel)]="formModel.notes"></textarea>
    </div>
    <div class="form-group check-row">
      <input type="checkbox" id="pa" [(ngModel)]="formModel.performance_alert">
      <label for="pa">Alerte performance</label>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveHerd()" [disabled]="!formModel.farmer_id || !formModel.species || !formModel.herd_size">Enregistrer</button>
  </div>
</div>
`,
  styles: [`
.herd-wrap { padding: 24px; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 1.4rem; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
.action-btn { background: var(--zir-emerald,#10b981); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.action-btn:hover { background: var(--zir-emerald-hover,#0d9668); }

.kpi-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
.kpi-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; text-align: center; }
.kpi-item.alert { border-color: #ef4444; background: rgba(239,68,68,0.06); }
.kpi-val { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); display: block; }
.kpi-val small { font-weight: 400; font-size: 0.75rem; color: var(--text-muted); }
.kpi-lbl { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; display: block; }

.tabs-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
.tab.active { background: var(--zir-emerald,#10b981); color: #fff; border-color: var(--zir-emerald); }

.herd-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 12px; }
.herd-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; transition: box-shadow .15s; }
.herd-card.alert { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.card-head .species { font-size: 0.95rem; color: var(--text-primary); }
.card-head .breed { font-size: 0.75rem; color: var(--text-muted); margin-left: 6px; }
.badge { padding: 3px 8px; border-radius: 5px; font-size: 0.65rem; font-weight: 700; }
.badge-green { background: rgba(16,185,129,0.12); color: #10b981; }
.badge-red { background: rgba(239,68,68,0.12); color: #ef4444; }
.card-sub { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px; }
.card-metrics { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 8px; }
.cm-item { font-size: 0.78rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px; }
.cm-item ng-icon { font-size: 0.7rem; color: var(--zir-emerald); }
.card-feed { font-size: 0.78rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; }
.card-alert { font-size: 0.78rem; color: #ef4444; background: rgba(239,68,68,0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; }
.card-foot { font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; }

.empty-state { grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); }

.drawer-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 450px; height: 100vh; background: var(--bg-card); box-shadow: var(--shadow-lg); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; }
.drawer-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.check-row { flex-direction: row; align-items: center; gap: 8px; }
.form-group label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
.form-control { padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; font-size: 0.85rem; }
.form-control:focus { border-color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 14px; display: flex; gap: 10px; }
.btn-primary { background: var(--zir-emerald,#10b981); color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; font-size: 0.85rem; }
.btn-primary[disabled] { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 9px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; font-size: 0.85rem; }

@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: repeat(2,1fr); }
  .herd-grid { grid-template-columns: 1fr; }
}
  `]
})
export class ExpHerdComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  herds = signal<any[]>([]);
  loading = signal(true);
  farmers = signal<any[]>([]);
  isDrawerOpen = signal<boolean>(false);
  activeTab = signal<string>('TOUS');

  speciesList = signal<string[]>([]);

  formModel = {
    farmer_id: '', species: 'BOVINE', breed: '', herd_size: 10,
    daily_milk_yield_kg: 20, birth_rate_pct: 80, mortality_rate_pct: 2,
    last_visit_date: new Date().toISOString().substring(0, 10),
    feed_program: '', notes: '', performance_alert: false
  };

  ngOnInit() {
    this.loadHerds();
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  get totalAnimals() {
    return () => this.herds().reduce((s, h) => s + (h.herd_size || 0), 0);
  }

  get alertCount() {
    return () => this.herds().filter(h => h.performance_alert).length;
  }

  get avgMilk() {
    return () => {
      const milking = this.herds().filter(h => h.daily_milk_yield_kg > 0);
      return milking.length ? Math.round(milking.reduce((s, h) => s + h.daily_milk_yield_kg, 0) / milking.length) : 0;
    };
  }

  get filteredHerds() {
    return () => {
      const tab = this.activeTab();
      if (tab === 'TOUS') return this.herds();
      return this.herds().filter(h => h.species === tab);
    };
  }

  sLabel(s: string) {
    return { BOVINE: 'Bovin', OVINE: 'Ovin', CAPRINE: 'Caprin', CAMEL: 'Camélidé' }[s] || s;
  }

  loadHerds() {
    this.loading.set(true);
    this.api.getAllHerdRecords().subscribe(res => {
      this.herds.set(res);
      const species = [...new Set(res.map((h: any) => h.species).filter(Boolean))] as string[];
      this.speciesList.set(species);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '', species: 'BOVINE', breed: '', herd_size: 10,
      daily_milk_yield_kg: 20, birth_rate_pct: 80, mortality_rate_pct: 2,
      last_visit_date: new Date().toISOString().substring(0, 10),
      feed_program: '', notes: '', performance_alert: false
    };
  }

  saveHerd() {
    this.api.createOrUpdateHerdRecord(this.formModel).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadHerds();
      }
    });
  }
}
