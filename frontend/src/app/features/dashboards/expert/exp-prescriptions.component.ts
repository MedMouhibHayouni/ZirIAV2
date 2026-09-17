import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideFileText, lucideUser, lucideCalendar, lucideShieldCheck, 
  lucideDroplets, lucideTrash2, lucidePlus, lucideX 
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';

@Component({
  selector: 'app-exp-prescriptions',
  standalone: true, 
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideFileText, lucideUser, lucideCalendar, lucideShieldCheck, 
    lucideDroplets, lucideTrash2, lucidePlus, lucideX 
  })],
  template: `
<div class="prescriptions-wrap">
  <div class="page-header">
    <div>
      <h2>Ordonnances & Traitements</h2>
      <p>Historique des prescriptions agronomiques délivrées aux agriculteurs.</p>
    </div>
    <button class="action-btn" (click)="isDrawerOpen.set(true)">
      <ng-icon name="lucidePlus"></ng-icon> Nouvelle Prescription
    </button>
  </div>

  <div class="table-container animate-in">
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Agriculteur</th>
          <th>Maladie / Cause</th>
          <th>Produit & Dosage</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (p of prescriptions(); track p.id) {
          <tr>
            <td>
              <div class="cell-flex">
                <ng-icon name="lucideCalendar"></ng-icon>
                {{ p.created_at | date:'dd/MM/yyyy' }}
              </div>
            </td>
            <td>
              <div class="cell-flex">
                <ng-icon name="lucideUser"></ng-icon>
                <strong>{{ formatName(p) }}</strong>
              </div>
            </td>
            <td>
              <div class="disease-tag">{{ p.disease_name ?? 'Observation terrain' }}</div>
            </td>
            <td>
              <div class="treatment-info">
                <strong>{{ p.product_name }}</strong>
                <span class="dosage"><ng-icon name="lucideDroplets"></ng-icon> {{ p.dosage }} - {{ p.application_method }}</span>
              </div>
            </td>
            <td>
              <span class="status-badge active"><ng-icon name="lucideShieldCheck"></ng-icon> Délivrée</span>
            </td>
            <td>
              <button class="delete-btn" (click)="deletePrescription(p.id)" title="Supprimer la prescription">
                <ng-icon name="lucideTrash2"></ng-icon>
              </button>
            </td>
          </tr>
        }
        @if (!prescriptions().length) {
          <tr>
            <td colspan="6" class="empty-state">
              <ng-icon name="lucideFileText"></ng-icon>
              <p>Aucune ordonnance n'a été délivrée pour le moment.</p>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>
</div>

<!-- Slide-in Drawer Backdrop -->
<div class="drawer-backdrop" *ngIf="isDrawerOpen()" (click)="closeDrawer()"></div>

<!-- Slide-in Drawer -->
<div class="drawer" *ngIf="isDrawerOpen()">
  <div class="drawer-header">
    <h3>🔬 Nouvelle Prescription</h3>
    <button class="close-btn" (click)="closeDrawer()">
      <ng-icon name="lucideX"></ng-icon>
    </button>
  </div>

  <div class="drawer-body">
    <div class="form-group">
      <label>Agriculteur ciblé</label>
      <select class="form-control" [(ngModel)]="formModel.farmer_id">
        <option value="" disabled selected>Choisir un agriculteur...</option>
        <option *ngFor="let f of farmers()" [value]="f.id">{{ f.name }}</option>
      </select>
    </div>

    <div class="form-group">
      <label>Maladie / Pathogène</label>
      <input type="text" 
             class="form-control" 
             placeholder="Ex: Mildiou, Oïdium..." 
             [(ngModel)]="formModel.diseaseName"
             (input)="onDiseaseSearchChange()">
      
      <div class="suggestions-box" *ngIf="suggestions().length > 0">
        <div class="suggestion-item" 
             *ngFor="let s of suggestions()" 
             (click)="selectSuggestion(s)">
          <strong>{{ s.disease_name }}</strong> - Référence: {{ s.allowed_product }}
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Produit recommandé</label>
      <input type="text" class="form-control" placeholder="Nom du produit commercial" [(ngModel)]="formModel.product_name">
    </div>

    <div class="form-group">
      <label>Dosage</label>
      <input type="text" class="form-control" placeholder="Ex: 200 ml/ha, 10g/L..." [(ngModel)]="formModel.dosage">
    </div>

    <div class="form-group">
      <label>Méthode d'application</label>
      <select class="form-control" [(ngModel)]="formModel.application_method">
        <option value="SPRAY">Pulvérisation (SPRAY)</option>
        <option value="IRRIGATION">Irrigation (IRRIGATION)</option>
        <option value="SOIL">Apport au sol (SOIL)</option>
      </select>
    </div>

    <div class="form-group">
      <label>Délai avant Récolte (DAR en jours)</label>
      <input type="number" class="form-control" [(ngModel)]="formModel.pre_harvest_days">
    </div>

    <div class="form-group">
      <label>Notes et recommandations</label>
      <textarea class="form-control" rows="3" placeholder="Fréquence, conditions météo requises..." [(ngModel)]="formModel.notes"></textarea>
    </div>
  </div>

  <div class="drawer-footer">
    <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
    <button class="btn-primary" 
            (click)="submitPrescription()" 
            [disabled]="!formModel.farmer_id || !formModel.product_name || !formModel.dosage">
      Enregistrer
    </button>
  </div>
</div>
`,
  styles: [`
.prescriptions-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.page-header h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }

.action-btn { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s; }
.action-btn:hover { background: var(--zir-emerald-hover, #0d9668); }

.table-container { background: var(--bg-card); border-radius: 12px; box-shadow: var(--shadow-sm); overflow: hidden; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th { padding: 16px 20px; background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid var(--border); letter-spacing: 0.5px; }
.data-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); font-size: 0.9rem; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-card-hover); }

.cell-flex { display: flex; align-items: center; gap: 8px; }
.cell-flex ng-icon { color: var(--text-muted); font-size: 16px; }
.cell-flex strong { color: var(--text-primary); }

.disease-tag { background: var(--error-bg); color: var(--error); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
.treatment-info { display: flex; flex-direction: column; gap: 4px; }
.treatment-info strong { color: var(--text-primary); }
.treatment-info .dosage { display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 0.8rem; }
.treatment-info .dosage ng-icon { color: var(--info); }

.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
.status-badge.active { background: var(--success-bg); color: var(--success); }

.delete-btn { background: none; border: none; color: var(--error); cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; transition: background 0.2s; }
.delete-btn:hover { background: rgba(239, 68, 68, 0.1); }

.empty-state { text-align: center; padding: 48px !important; color: var(--text-muted); }
.empty-state ng-icon { font-size: 48px; color: var(--border-accent); margin-bottom: 16px; }
.empty-state p { margin: 0; font-size: 1rem; }

/* Drawer Drawer Drawer */
.drawer-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 450px; height: 100vh; background: var(--bg-card); box-shadow: var(--shadow-lg); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.drawer-header h3 { margin: 0; color: var(--text-primary); }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.form-control { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; }
.form-control:focus { border-color: var(--zir-emerald); }
.suggestions-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-top: 4px; max-height: 150px; overflow-y: auto; }
.suggestion-item { padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-bottom: 1px solid var(--border-light); }
.suggestion-item:last-child { border-bottom: none; }
.suggestion-item:hover { background: var(--bg-primary); color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 16px; display: flex; gap: 12px; }
.btn-primary { background: var(--zir-emerald); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
  `]
})
export class ExpPrescriptionsComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  prescriptions = signal<any[]>([]);
  farmers = signal<any[]>([]);
  suggestions = signal<any[]>([]);
  isDrawerOpen = signal<boolean>(false);

  formModel = {
    farmer_id: '',
    diseaseName: '',
    product_name: '',
    dosage: '',
    application_method: 'SPRAY',
    pre_harvest_days: 7,
    notes: ''
  };

  ngOnInit() {
    this.loadPrescriptions();
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  loadPrescriptions() {
    this.api.getPrescriptions().subscribe(res => {
      this.prescriptions.set(res);
      this.cdr.markForCheck();
    });
  }

  formatName(p: any): string {
    if (p.privacy_level === 'ANONYMOUS') return `Agriculteur #${p.farmer_id.slice(-4)}`;
    if (p.privacy_level === 'SEMI_PUBLIC' && p.farmer_name) {
      const parts = p.farmer_name.split(' ');
      return `${parts[0]} ${parts[1] ? parts[1][0] + '.' : ''}`;
    }
    return p.farmer_name || 'Inconnu';
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '',
      diseaseName: '',
      product_name: '',
      dosage: '',
      application_method: 'SPRAY',
      pre_harvest_days: 7,
      notes: ''
    };
    this.suggestions.set([]);
  }

  onDiseaseSearchChange() {
    if (this.formModel.diseaseName.length < 3) {
      this.suggestions.set([]);
      return;
    }
    this.api.getPrescriptionSuggestions(this.formModel.diseaseName).subscribe(res => {
      this.suggestions.set(res);
      this.cdr.markForCheck();
    });
  }

  selectSuggestion(sug: any) {
    this.formModel.diseaseName = sug.disease_name;
    this.formModel.product_name = sug.allowed_product;
    this.formModel.dosage = sug.default_dosage;
    this.formModel.application_method = sug.default_application_method;
    this.formModel.pre_harvest_days = sug.pre_harvest_days;
    this.suggestions.set([]);
  }

  submitPrescription() {
    this.api.createPrescription(this.formModel).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadPrescriptions();
      }
    });
  }

  deletePrescription(id: string) {
    if (confirm('Voulez-vous vraiment supprimer cette prescription ?')) {
      this.api.deletePrescription(id).subscribe({
        next: () => {
          this.loadPrescriptions();
        }
      });
    }
  }
}
