import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX, lucideDroplet, lucideCheck, lucideArrowRight } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-exp-water-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucidePlus, lucideX, lucideDroplet, lucideCheck, lucideArrowRight })],
  template: `
<div class="projects-wrap">
  <div class="page-header">
    <div>
      <h2>Projets d'Irrigation</h2>
      <p>Étude et planification des systèmes d'irrigation, de drainage et d'efficience hydrique.</p>
    </div>
    <button class="action-btn" (click)="isDrawerOpen.set(true)">
      <ng-icon name="lucidePlus"></ng-icon> Nouveau Projet
    </button>
  </div>

  <div class="grid-layout animate-in">
    <div class="projects-list">
      <div class="card glass mb-4" *ngFor="let p of projects()">
        <div class="card-header-flex">
          <strong>{{ p.project_name }} ({{ p.area_ha }} ha)</strong>
          <span class="badge" [class.badge-green]="p.status === 'COMPLETED'" [class.badge-orange]="p.status === 'DESIGN'" [class.badge-blue]="p.status === 'INSTALLATION'" [class.badge-red]="p.status === 'CANCELLED'">{{ p.status }}</span>
        </div>
        <p class="text-sm">Agriculteur: {{ p.farmer_name }}</p>
        <p class="text-sm">Type d'irrigation: {{ p.irrigation_type }}</p>
        <p class="text-sm text-secondary" *ngIf="p.notes">Notes: {{ p.notes }}</p>
        <div class="card-footer mt-2">
          <span>Cree le: {{ p.created_at | date:'dd/MM/yyyy' }}</span>
        </div>
        <div class="status-actions mt-3">
          <span class="status-label">Avancer le statut :</span>
          <div class="status-buttons">
            <button *ngIf="p.status === 'DESIGN'" class="status-btn btn-install" (click)="changeStatus(p, 'INSTALLATION')">
              <ng-icon name="lucideArrowRight"></ng-icon> Installation
            </button>
            <button *ngIf="p.status === 'INSTALLATION'" class="status-btn btn-complete" (click)="changeStatus(p, 'COMPLETED')">
              <ng-icon name="lucideCheck"></ng-icon> Termine
            </button>
            <button *ngIf="p.status !== 'COMPLETED' && p.status !== 'CANCELLED'" class="status-btn btn-cancel" (click)="changeStatus(p, 'CANCELLED')">
              Annuler
            </button>
          </div>
        </div>
      </div>
      <div *ngIf="!projects().length" class="empty-state">
        <ng-icon name="lucideDroplet"></ng-icon>
        <p>Aucun projet d'irrigation en cours.</p>
      </div>
    </div>
  </div>
</div>

<!-- Drawer Form -->
<div class="drawer-backdrop" *ngIf="isDrawerOpen()" (click)="closeDrawer()"></div>
<div class="drawer" *ngIf="isDrawerOpen()">
  <div class="drawer-header">
    <h3>💧 Nouveau Projet d'Irrigation</h3>
    <button class="close-btn" (click)="closeDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Agriculteur</label>
      <select class="form-control" [(ngModel)]="formModel.farmer_id">
        <option value="" disabled selected>Choisir un agriculteur...</option>
        <option *ngFor="let f of farmers()" [value]="f.id">{{ f.name }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>Nom du Projet</label>
      <input type="text" class="form-control" placeholder="Ex: Réseau goutte-à-goutte Est" [(ngModel)]="formModel.project_name">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Superficie (ha)</label>
        <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.area_ha">
      </div>
      <div class="form-group">
        <label>Type d'irrigation</label>
        <input type="text" class="form-control" placeholder="Ex: Goutte-à-goutte, Aspersion..." [(ngModel)]="formModel.irrigation_type">
      </div>
    </div>
    <div class="form-group">
      <label>Statut</label>
      <select class="form-control" [(ngModel)]="formModel.status">
        <option value="DESIGN">Étude (DESIGN)</option>
        <option value="INSTALLATION">Installation (INSTALLATION)</option>
        <option value="COMPLETED">Complété (COMPLETED)</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Date installation</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.installation_date">
      </div>
      <div class="form-group">
        <label>Date achèvement estimée</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.estimated_completion_date">
      </div>
    </div>
    <div class="form-group">
      <label>Remarques & Notes techniques</label>
      <textarea class="form-control" rows="3" [(ngModel)]="formModel.notes"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveProject()" [disabled]="!formModel.farmer_id || !formModel.project_name">Enregistrer</button>
  </div>
</div>
`,
  styles: [`
.projects-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.page-header h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

.action-btn { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
.action-btn:hover { background: var(--zir-emerald-hover, #0d9668); }

.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.badge-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.badge-orange { background: rgba(249, 115, 22, 0.12); color: #f97316; }
.badge-blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.badge-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.card-footer { font-size: 0.8rem; color: var(--text-muted); }
.empty-state { text-align: center; padding: 48px; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); }
.empty-state ng-icon { font-size: 48px; color: var(--border-accent); margin-bottom: 16px; }

.status-actions { border-top: 1px solid var(--border); padding-top: 12px; }
.status-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 8px; }
.status-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.status-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; border: 1px solid transparent; cursor: pointer; transition: all 0.15s; }
.btn-install { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2); }
.btn-install:hover { background: rgba(59, 130, 246, 0.2); }
.btn-complete { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
.btn-complete:hover { background: rgba(16, 185, 129, 0.2); }
.btn-cancel { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
.btn-cancel:hover { background: rgba(239, 68, 68, 0.2); }

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
export class ExpWaterProjectsComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  projects = signal<any[]>([]);
  farmers = signal<any[]>([]);
  isDrawerOpen = signal<boolean>(false);

  formModel = {
    farmer_id: '',
    project_name: '',
    area_ha: 1.0,
    irrigation_type: 'Goutte-à-goutte',
    status: 'DESIGN',
    installation_date: new Date().toISOString().substring(0, 10),
    estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    notes: ''
  };

  ngOnInit() {
    this.loadProjects();
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  loadProjects() {
    this.api.getWaterProjects().subscribe(res => {
      this.projects.set(res);
      this.cdr.markForCheck();
    });
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '',
      project_name: '',
      area_ha: 1.0,
      irrigation_type: 'Goutte-à-goutte',
      status: 'DESIGN',
      installation_date: new Date().toISOString().substring(0, 10),
      estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes: ''
    };
  }

  saveProject() {
    this.api.createWaterProject(this.formModel).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadProjects();
        this.toast.success('Projet cree');
        this.cdr.markForCheck();
      }
    });
  }

  changeStatus(project: any, newStatus: string) {
    this.api.updateWaterProjectStatus(project.id, newStatus).subscribe({
      next: (updated) => {
        const list = this.projects().map(p => p.id === updated.id ? { ...p, status: updated.status } : p);
        this.projects.set(list);
        this.toast.success('Statut mis a jour');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors de la mise a jour du statut');
        this.cdr.markForCheck();
      }
    });
  }
}
