import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX, lucideBookOpen } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';

@Component({
  selector: 'app-exp-crop-journal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucidePlus, lucideX, lucideBookOpen })],
  template: `
<div class="journal-wrap">
  <div class="page-header">
    <div>
      <h2>Cahiers de Culture</h2>
      <p>Consultation et saisie des journaux de culture pour chaque parcelle d'agriculteur.</p>
    </div>
  </div>

  <div class="grid-layout animate-in">
    <div class="farmer-select-card card glass p-4 mb-4">
      <label class="block font-semibold mb-2">Sélectionner un agriculteur :</label>
      <select class="form-control w-full max-w-md" [(ngModel)]="selectedFarmerId" (change)="onFarmerChange()">
        <option value="" disabled selected>Choisir...</option>
        <option *ngFor="let f of farmers()" [value]="f.id">{{ f.name }}</option>
      </select>
    </div>

    <div class="journals-box" *ngIf="selectedFarmerId">
      <div class="flex justify-between items-center mb-4">
        <h3>Entrées du Journal de Culture</h3>
        <button class="action-btn" (click)="isDrawerOpen.set(true)">
          <ng-icon name="lucidePlus"></ng-icon> Nouvelle Entrée
        </button>
      </div>

      <div class="journal-list">
        <div class="card glass mb-3" *ngFor="let j of journals()">
          <div class="flex justify-between items-center mb-2">
            <strong>Saison: {{ j.season }} | Culture: {{ j.crop_type }}</strong>
            <span class="text-muted text-xs">Semis: {{ j.sowing_date | date:'dd/MM/yyyy' }}</span>
          </div>
          <p class="text-sm">Rendement estimé: {{ j.yield_kg_ha }} kg/ha</p>
          <p class="text-sm text-secondary" *ngIf="j.fertilizer_used">🌱 Engrais: {{ j.fertilizer_used }}</p>
          <p class="text-sm text-secondary" *ngIf="j.pesticides_used">💊 Pesticides: {{ j.pesticides_used }}</p>
          <p class="text-sm text-secondary" *ngIf="j.observations">👀 Observations: {{ j.observations }}</p>
          <p class="text-sm text-secondary font-semibold" *ngIf="j.recommendations">💡 Recommandations expert: {{ j.recommendations }}</p>
        </div>
        <div *ngIf="!journals().length" class="empty-state">
          <p>Aucun enregistrement trouvé pour cet agriculteur.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Drawer Form -->
<div class="drawer-backdrop" *ngIf="isDrawerOpen()" (click)="closeDrawer()"></div>
<div class="drawer" *ngIf="isDrawerOpen()">
  <div class="drawer-header">
    <h3>📖 Nouvelle Entrée Journal</h3>
    <button class="close-btn" (click)="closeDrawer()"><ng-icon name="lucideX"></ng-icon></button>
  </div>
  <div class="drawer-body">
    <div class="form-group">
      <label>Saison</label>
      <input type="text" class="form-control" placeholder="Ex: Printemps 2026, Hiver 2025" [(ngModel)]="formModel.season">
    </div>
    <div class="form-group">
      <label>Type de Culture</label>
      <input type="text" class="form-control" placeholder="Ex: Blé dur, Tomate..." [(ngModel)]="formModel.crop_type">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Date de Semis</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.sowing_date">
      </div>
      <div class="form-group">
        <label>Date de Récolte</label>
        <input type="date" class="form-control" [(ngModel)]="formModel.harvest_date">
      </div>
    </div>
    <div class="form-group">
      <label>Rendement (kg/ha)</label>
      <input type="number" class="form-control" [(ngModel)]="formModel.yield_kg_ha">
    </div>
    <div class="form-group">
      <label>Engrais utilisés</label>
      <input type="text" class="form-control" [(ngModel)]="formModel.fertilizer_used">
    </div>
    <div class="form-group">
      <label>Pesticides utilisés</label>
      <input type="text" class="form-control" [(ngModel)]="formModel.pesticides_used">
    </div>
    <div class="form-group">
      <label>Observations</label>
      <textarea class="form-control" rows="2" [(ngModel)]="formModel.observations"></textarea>
    </div>
    <div class="form-group">
      <label>Recommandations Expert</label>
      <textarea class="form-control" rows="2" [(ngModel)]="formModel.recommendations"></textarea>
    </div>
  </div>
  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
    <button class="btn-primary" (click)="saveJournal()" [disabled]="!formModel.season || !formModel.crop_type">Enregistrer</button>
  </div>
</div>
`,
  styles: [`
.journal-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

.action-btn { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
.action-btn:hover { background: var(--zir-emerald-hover, #0d9668); }

.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm); }
.empty-state { text-align: center; padding: 48px; color: var(--text-muted); }

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
export class ExpCropJournalComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  farmers = signal<any[]>([]);
  journals = signal<any[]>([]);
  selectedFarmerId = '';
  isDrawerOpen = signal<boolean>(false);

  formModel = {
    farmer_id: '',
    season: 'Printemps 2026',
    crop_type: '',
    sowing_date: '',
    harvest_date: '',
    yield_kg_ha: 0,
    fertilizer_used: '',
    pesticides_used: '',
    observations: '',
    recommendations: ''
  };

  ngOnInit() {
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  onFarmerChange() {
    if (!this.selectedFarmerId) return;
    this.api.getCropJournals(this.selectedFarmerId).subscribe(res => {
      this.journals.set(res);
      this.cdr.markForCheck();
    });
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '',
      season: 'Printemps 2026',
      crop_type: '',
      sowing_date: '',
      harvest_date: '',
      yield_kg_ha: 0,
      fertilizer_used: '',
      pesticides_used: '',
      observations: '',
      recommendations: ''
    };
  }

  saveJournal() {
    this.formModel.farmer_id = this.selectedFarmerId;
    this.api.createCropJournal(this.formModel).subscribe({
      next: () => {
        this.closeDrawer();
        this.onFarmerChange();
      }
    });
  }
}
