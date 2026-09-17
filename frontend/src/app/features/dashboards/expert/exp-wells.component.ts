import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMapPin, lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideInfo,
  lucideDroplets, lucideThermometer, lucideRefreshCw, lucidePencil, lucideTrash2
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-exp-wells',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideMapPin, lucidePlus, lucideX, lucideActivity, lucideCalendar, lucideInfo,
    lucideDroplets, lucideThermometer, lucideRefreshCw, lucidePencil, lucideTrash2
  })],
  template: `
<div class="wells-wrap">
  <div class="page-header">
    <div>
      <h2>Suivi des Puits & Forages</h2>
      <p>Supervision des nappes phréatiques, niveau d'eau et relevés de salinité.</p>
    </div>
    <button class="action-btn" (click)="isCreateDrawerOpen.set(true)">
      <ng-icon name="lucidePlus"></ng-icon> Nouveau Puits
    </button>
  </div>

  <div class="layout-grid animate-in">
    <div class="wells-list">
      <div class="card glass mb-4" *ngFor="let w of wells()">
        <div class="card-header-flex">
          <strong>{{ w.well_name }}</strong>
          <span class="badge" [class.badge-green]="w.status === 'ACTIVE'" [class.badge-red]="w.status === 'INACTIVE'">{{ w.status }}</span>
        </div>
        <p class="text-sm">Agriculteur: {{ w.farmer_name }}</p>
        <div class="metrics-grid mt-3">
          <div class="metric">
            <span class="lbl">Profondeur</span>
            <span class="val">{{ w.depth_m }} m</span>
          </div>
          <div class="metric">
            <span class="lbl">Niveau Eau</span>
            <span class="val">{{ w.water_level_m }} m</span>
          </div>
          <div class="metric">
            <span class="lbl">Salinité</span>
            <span class="val">{{ w.salinity_g_l }} g/L</span>
          </div>
        </div>
        <div class="card-actions mt-3">
          <button class="btn-secondary text-xs py-1 px-3" (click)="viewMeasurements(w)">Historique</button>
          <button class="btn-primary text-xs py-1 px-3" (click)="openAddMeasDrawer(w)">Releve</button>
          <button class="btn-icon" title="Modifier" (click)="openEditDrawer(w)"><ng-icon name="lucidePencil"></ng-icon></button>
          <button class="btn-icon btn-danger-icon" title="Supprimer" (click)="confirmDelete(w)"><ng-icon name="lucideTrash2"></ng-icon></button>
        </div>
      </div>
      <div *ngIf="!wells().length" class="empty-state">
        <ng-icon name="lucideMapPin"></ng-icon>
        <p>Aucun puits sous votre supervision.</p>
      </div>
    </div>

    <!-- RIGHT: Side measurements display -->
    <div class="meas-panel" *ngIf="selectedWell()">
      <div class="panel-header">
        <h3>Historique - {{ selectedWell().well_name }}</h3>
        <button class="close-btn-sm" (click)="selectedWell.set(null)"><ng-icon name="lucideX"></ng-icon></button>
      </div>
      <div class="meas-list mt-3">
        <div class="meas-item" *ngFor="let m of measurements()">
          <div class="meas-meta">
            <strong>{{ m.measured_at | date:'dd/MM/yyyy HH:mm' }}</strong>
            <span>Niveau: {{ m.water_level_m }}m | Salinité: {{ m.salinity_g_l }}g/L</span>
          </div>
          <p class="text-muted text-xs mt-1" *ngIf="m.notes">{{ m.notes }}</p>
        </div>
        <div *ngIf="!measurements().length" class="empty-text">Aucune mesure enregistrée.</div>
      </div>
    </div>
  </div>
</div>

<!-- Drawer Create Well -->
<div class="drawer-backdrop" *ngIf="isCreateDrawerOpen()" (click)="closeCreateDrawer()"></div>
<div class="drawer" *ngIf="isCreateDrawerOpen()">
  <div class="drawer-header">
    <h3>🚰 Nouveau Puits / Forage</h3>
    <button class="close-btn" (click)="closeCreateDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Agriculteur propriétaire</label>
      <select class="form-control" [(ngModel)]="wellForm.farmer_id">
        <option value="" disabled selected>Choisir un agriculteur...</option>
        <option *ngFor="let f of farmers()" [value]="f.id">{{ f.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Nom du Puits</label>
      <input type="text" class="form-control" placeholder="Puits Nord, Forage principal..." [(ngModel)]="wellForm.well_name">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Latitude</label>
        <input type="number" step="0.000001" class="form-control" [(ngModel)]="wellForm.lat">
      </div>
      <div class="form-group">
        <label>Longitude</label>
        <input type="number" step="0.000001" class="form-control" [(ngModel)]="wellForm.lng">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Profondeur totale (m)</label>
        <input type="number" class="form-control" [(ngModel)]="wellForm.depth_m">
      </div>
      <div class="form-group">
        <label>Niveau initial d'eau (m)</label>
        <input type="number" class="form-control" [(ngModel)]="wellForm.water_level_m">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Salinité (g/L)</label>
        <input type="number" step="0.1" class="form-control" [(ngModel)]="wellForm.salinity_g_l">
      </div>
      <div class="form-group">
        <label>Conductivité TDS (mg/L)</label>
        <input type="number" class="form-control" [(ngModel)]="wellForm.tds_mg_l">
      </div>
    </div>
    <div class="form-group">
      <label>Notes géologiques</label>
      <textarea class="form-control" rows="3" [(ngModel)]="wellForm.geological_notes"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeCreateDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveWell()" [disabled]="!wellForm.farmer_id || !wellForm.well_name">Enregistrer</button>
  </div>
</div>

<!-- Drawer Add Measurement -->
<div class="drawer-backdrop" *ngIf="isMeasDrawerOpen()" (click)="closeMeasDrawer()"></div>
<div class="drawer" *ngIf="isMeasDrawerOpen()">
  <div class="drawer-header">
    <h3>Ajouter un Releve</h3>
    <button class="close-btn" (click)="closeMeasDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Niveau piezometrique / Niveau d'eau (m)</label>
      <input type="number" step="0.1" class="form-control" [(ngModel)]="measForm.water_level_m">
    </div>
    <div class="form-group">
      <label>Salinite de l'eau (g/L)</label>
      <input type="number" step="0.1" class="form-control" [(ngModel)]="measForm.salinity_g_l">
    </div>
    <div class="form-group">
      <label>Remarques / Observations</label>
      <textarea class="form-control" rows="3" [(ngModel)]="measForm.notes"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeMeasDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveMeasurement()">Enregistrer</button>
  </div>
</div>

<!-- Drawer Edit Well -->
<div class="drawer-backdrop" *ngIf="isEditDrawerOpen()" (click)="closeEditDrawer()"></div>
<div class="drawer" *ngIf="isEditDrawerOpen()">
  <div class="drawer-header">
    <h3>Modifier le Puits</h3>
    <button class="close-btn" (click)="closeEditDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Nom du Puits</label>
      <input type="text" class="form-control" [(ngModel)]="editForm.well_name">
    </div>
    <div class="form-group">
      <label>Statut</label>
      <select class="form-control" [(ngModel)]="editForm.status">
        <option value="ACTIVE">Actif (ACTIVE)</option>
        <option value="INACTIVE">Inactif (INACTIVE)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notes geologiques</label>
      <textarea class="form-control" rows="3" [(ngModel)]="editForm.geological_notes"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeEditDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveEdit()">Enregistrer</button>
  </div>
</div>

<!-- Delete Confirmation -->
<div class="drawer-backdrop" *ngIf="isDeleteConfirmOpen()" (click)="closeDeleteConfirm()"></div>
<div class="drawer drawer-small" *ngIf="isDeleteConfirmOpen()">
  <div class="drawer-header">
    <h3>Confirmer la suppression</h3>
    <button class="close-btn" (click)="closeDeleteConfirm()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <p class="delete-msg">Voulez-vous vraiment supprimer le puits <strong>{{ deleteTarget()?.well_name }}</strong> ?</p>
    <p class="delete-warning">Toutes les mesures associees seront egalement supprimees.</p>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDeleteConfirm()">Annuler</button>
    <button class="btn-danger" (click)="deleteWell()">Supprimer</button>
  </div>
</div>
`,
  styles: [`
.wells-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.page-header h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

.action-btn { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
.action-btn:hover { background: var(--zir-emerald-hover, #0d9668); }

.layout-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 32px; }
.wells-list { display: flex; flex-direction: column; gap: 16px; }

.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.badge-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.badge-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.metric { background: var(--bg-secondary); padding: 8px; border-radius: 8px; text-align: center; border: 1px solid var(--border-light); }
.metric .lbl { font-size: 0.72rem; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.metric .val { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

.card-actions { display: flex; gap: 10px; align-items: center; }
.btn-icon { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; cursor: pointer; color: var(--text-secondary); display: inline-flex; align-items: center; transition: all 0.15s; }
.btn-icon:hover { border-color: var(--border-accent); color: var(--text-primary); }
.btn-danger-icon:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.06); }
.btn-danger { background: #ef4444; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-danger:hover { background: #dc2626; }
.drawer-small { width: 380px; }
.delete-msg { font-size: 0.95rem; color: var(--text-primary); line-height: 1.5; }
.delete-warning { font-size: 0.82rem; color: #ef4444; margin-top: 8px; }

.meas-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
.panel-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }
.close-btn-sm { background: none; border: none; cursor: pointer; color: var(--text-muted); }

.meas-list { display: flex; flex-direction: column; gap: 10px; max-height: 450px; overflow-y: auto; }
.meas-item { background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 8px; padding: 10px; font-size: 0.85rem; }
.meas-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }

.empty-state { text-align: center; padding: 48px; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); }
.empty-state ng-icon { font-size: 48px; color: var(--border-accent); margin-bottom: 16px; }

/* Drawer */
.drawer-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 450px; height: 100vh; background: var(--bg-card); box-shadow: var(--shadow-lg); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.form-control { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; }
.form-control:focus { border-color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 16px; display: flex; gap: 12px; }
.btn-primary { background: var(--zir-emerald); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
  `]
})
export class ExpWellsComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  wells = signal<any[]>([]);
  farmers = signal<any[]>([]);
  selectedWell = signal<any | null>(null);
  measurements = signal<any[]>([]);
  loading = signal(true);

  isCreateDrawerOpen = signal<boolean>(false);
  isMeasDrawerOpen = signal<boolean>(false);
  isEditDrawerOpen = signal<boolean>(false);
  isDeleteConfirmOpen = signal<boolean>(false);
  editTarget = signal<any | null>(null);
  deleteTarget = signal<any | null>(null);

  wellForm = {
    farmer_id: '',
    well_name: '',
    lat: 35.23,
    lng: 9.12,
    depth_m: 50.0,
    water_level_m: 25.0,
    salinity_g_l: 1.5,
    tds_mg_l: 1200,
    geological_notes: ''
  };

  editForm = {
    well_name: '',
    status: 'ACTIVE',
    geological_notes: ''
  };

  measForm = {
    water_level_m: 25.0,
    salinity_g_l: 1.5,
    notes: ''
  };

  ngOnInit() {
    this.loadWells();
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  loadWells() {
    this.loading.set(true);
    this.api.getWells().subscribe(res => {
      this.wells.set(res);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  getActiveCount(): number { return this.wells().filter(w => w.status === 'ACTIVE').length; }
  getInactiveCount(): number { return this.wells().filter(w => w.status === 'INACTIVE').length; }
  getHighSalinityCount(): number { return this.wells().filter(w => w.salinity_g_l > 3).length; }

  viewMeasurements(well: any) {
    this.selectedWell.set(well);
    this.api.getWellMeasurements(well.id).subscribe(meas => {
      this.measurements.set(meas);
      this.cdr.markForCheck();
    });
  }

  closeCreateDrawer() {
    this.isCreateDrawerOpen.set(false);
    this.wellForm = {
      farmer_id: '',
      well_name: '',
      lat: 35.23,
      lng: 9.12,
      depth_m: 50.0,
      water_level_m: 25.0,
      salinity_g_l: 1.5,
      tds_mg_l: 1200,
      geological_notes: ''
    };
  }

  saveWell() {
    this.api.createWell(this.wellForm).subscribe({
      next: () => {
        this.closeCreateDrawer();
        this.loadWells();
        this.toast.success('Puits enregistré');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors de l\'enregistrement');
        this.cdr.markForCheck();
      }
    });
  }

  openAddMeasDrawer(well: any) {
    this.selectedWell.set(well);
    this.measForm = {
      water_level_m: well.water_level_m,
      salinity_g_l: well.salinity_g_l,
      notes: ''
    };
    this.isMeasDrawerOpen.set(true);
  }

  closeMeasDrawer() {
    this.isMeasDrawerOpen.set(false);
  }

  saveMeasurement() {
    const well = this.selectedWell();
    if (!well) return;
    this.api.addWellMeasurement(well.id, this.measForm).subscribe({
      next: () => {
        this.closeMeasDrawer();
        this.viewMeasurements(well);
        this.loadWells();
        this.toast.success('Releve enregistre');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors de l\'enregistrement');
        this.cdr.markForCheck();
      }
    });
  }

  openEditDrawer(well: any) {
    this.editTarget.set(well);
    this.editForm = {
      well_name: well.well_name || '',
      status: well.status || 'ACTIVE',
      geological_notes: well.geological_notes || ''
    };
    this.isEditDrawerOpen.set(true);
  }

  closeEditDrawer() {
    this.isEditDrawerOpen.set(false);
    this.editTarget.set(null);
  }

  saveEdit() {
    const target = this.editTarget();
    if (!target) return;
    this.api.updateWell(target.id, this.editForm).subscribe({
      next: (updated) => {
        this.closeEditDrawer();
        this.loadWells();
        this.toast.success('Puits modifie');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors de la modification');
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(well: any) {
    this.deleteTarget.set(well);
    this.isDeleteConfirmOpen.set(true);
  }

  closeDeleteConfirm() {
    this.isDeleteConfirmOpen.set(false);
    this.deleteTarget.set(null);
  }

  deleteWell() {
    const target = this.deleteTarget();
    if (!target) return;
    this.api.deleteWell(target.id).subscribe({
      next: () => {
        this.closeDeleteConfirm();
        this.loadWells();
        this.toast.success('Puits supprime');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression');
        this.cdr.markForCheck();
      }
    });
  }
}
