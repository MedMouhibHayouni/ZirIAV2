import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideClipboardList, lucidePlus, lucideX, lucideSave, lucideUser, lucideCheckCircle, lucideInfo, lucideAlertTriangle } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

const SPECIES_LABELS: Record<string, string> = {
  BOVINE: 'Bovin',
  OVINE: 'Ovin',
  CAPRINE: 'Caprin',
  AVIAN: 'Aviaire',
  EQUINE: 'Équin'
};

@Component({
  selector: 'app-exp-clinical-dossiers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideClipboardList, lucidePlus, lucideX, lucideSave, lucideUser, lucideCheckCircle, lucideInfo, lucideAlertTriangle })],
  template: `
<div class="dossiers-wrap">
  <div class="page-header">
    <div>
      <h2>Dossiers Cliniques Vétérinaires</h2>
      <p>Suivi de l'historique de santé des troupeaux, diagnostics, traitements prescrits et visites.</p>
    </div>
    <button class="action-btn" (click)="openCreateDrawer()">
      <ng-icon name="lucidePlus"></ng-icon> Nouveau Dossier
    </button>
  </div>

  <div class="summary-strip mb-4">
    <div class="summary-item">
      <span class="summary-val">{{ openCount() }}</span>
      <span class="summary-label">Cas ouverts</span>
    </div>
    <div class="summary-item total">
      <span class="summary-val">{{ dossiers().length }}</span>
      <span class="summary-label">Dossiers totaux</span>
    </div>
  </div>

  <!-- Dossiers List -->
  <div class="layout-grid animate-in">
    <div class="dossiers-list">
      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div></div>
      } @else if (dossiers().length === 0) {
        <div class="empty-state">Aucun dossier clinique enregistré.</div>
      } @else {
        @for (d of dossiers(); track d.id) {
          <div class="dossier-card card glass" [class.selected]="selectedDossier()?.id === d.id" (click)="selectDossier(d)">
            <div class="card-header-flex">
              <strong>{{ d.animal_tag ? 'Tag: ' + d.animal_tag : 'Troupeau ' + speciesLabels[d.species] }}</strong>
              <span class="badge" [class.badge-green]="d.status === 'RESOLVED'" [class.badge-yellow]="d.status === 'OPEN'">
                {{ d.status === 'RESOLVED' ? 'Résolu' : 'En cours' }}
              </span>
            </div>
            <p class="text-sm mt-1">Éleveur: {{ d.farmer_name || '—' }}</p>
            <div class="symptom-preview mt-2">
              <strong>Symptômes :</strong> {{ d.symptoms | slice:0:80 }}{{ d.symptoms?.length > 80 ? '...' : '' }}
            </div>
            <div class="card-meta mt-3">
              <span>📅 Visite : {{ d.visit_date | date:'dd/MM/yyyy' }}</span>
              <span>🏷️ Effectif : {{ d.animal_count || 1 }}</span>
            </div>
          </div>
        }
      }
    </div>

    <!-- RIGHT Detail Panel -->
    <div class="detail-panel">
      @if (!selectedDossier()) {
        <div class="no-dossier-selected">
          <ng-icon name="lucideClipboardList"></ng-icon>
          <p>Sélectionnez un dossier clinique pour afficher les détails, le diagnostic, le traitement et planifier un suivi.</p>
        </div>
      } @else {
        <div class="dossier-detail card glass animate-in">
          <div class="detail-header">
            <h3>Dossier Clinique</h3>
            <span class="detail-date">Visite du {{ selectedDossier().visit_date | date:'dd/MM/yyyy' }}</span>
          </div>

          <div class="detail-grid mt-4">
            <div class="detail-section">
              <h4>Informations Générales</h4>
              <p><strong>Éleveur :</strong> {{ selectedDossier().farmer_name || '—' }}</p>
              <p><strong>Espèce :</strong> {{ speciesLabels[selectedDossier().species] || selectedDossier().species }}</p>
              <p><strong>Identification :</strong> {{ selectedDossier().animal_tag || 'Troupeau complet' }}</p>
              <p><strong>Effectif malade :</strong> {{ selectedDossier().animal_count || 1 }} animal/aux</p>
            </div>

            <div class="detail-section">
              <h4>Symptômes observés</h4>
              <div class="text-box">{{ selectedDossier().symptoms }}</div>
            </div>
          </div>

          <div class="detail-full mt-4">
            <h4>Diagnostic Clinique</h4>
            @if (isEditing()) {
              <textarea class="form-control" [(ngModel)]="editForm.diagnosis" placeholder="Saisir le diagnostic..."></textarea>
            } @else {
              <div class="text-box highlight">{{ selectedDossier().diagnosis || 'Aucun diagnostic saisi pour le moment.' }}</div>
            }
          </div>

          <div class="detail-full mt-4">
            <h4>Traitement & Prescription</h4>
            @if (isEditing()) {
              <textarea class="form-control" [(ngModel)]="editForm.treatment" placeholder="Médicaments, posologie..."></textarea>
            } @else {
              <div class="text-box highlight green">{{ selectedDossier().treatment || 'Aucun traitement prescrit.' }}</div>
            }
          </div>

          <div class="detail-grid mt-4">
            <div class="detail-section">
              <h4>Date de suivi planifiée</h4>
              @if (isEditing()) {
                <input type="date" class="form-control" [(ngModel)]="editForm.follow_up_date">
              } @else {
                <p>{{ (selectedDossier().follow_up_date | date:'dd/MM/yyyy') || 'Pas de suivi planifié.' }}</p>
              }
            </div>

            <div class="detail-section">
              <h4>Statut du Cas</h4>
              @if (isEditing()) {
                <select class="form-control" [(ngModel)]="editForm.status">
                  <option value="OPEN">En cours (Ouvert)</option>
                  <option value="RESOLVED">Résolu</option>
                </select>
              } @else {
                <span class="status-badge" [class]="selectedDossier().status.toLowerCase()">
                  {{ selectedDossier().status === 'RESOLVED' ? 'Résolu' : 'En cours' }}
                </span>
              }
            </div>
          </div>

          <div class="detail-actions mt-4">
            @if (isEditing()) {
              <button class="btn-primary" (click)="saveEdit()"><ng-icon name="lucideSave"></ng-icon> Enregistrer</button>
              <button class="btn-secondary" (click)="isEditing.set(false)">Annuler</button>
            } @else {
              <button class="btn-primary" (click)="startEdit()">Modifier le Dossier</button>
            }
          </div>
        </div>
      }
    </div>
  </div>

  <!-- Create Drawer Backdrop -->
  @if (isDrawerOpen()) {
    <div class="drawer-backdrop animate-in" (click)="closeDrawer()"></div>
    <div class="drawer animate-in">
      <div class="drawer-header">
        <h3>Nouveau Dossier Clinique</h3>
        <button class="close-btn" (click)="closeDrawer()"><ng-icon name="lucideX"></ng-icon></button>
      </div>

      <div class="drawer-body">
        <div class="form-group">
          <label>Agriculteur / Éleveur</label>
          <select class="form-control" [(ngModel)]="form.farmer_id">
            <option value="">-- Choisir --</option>
            @for (f of farmers(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
          </select>
        </div>

        <div class="form-group">
          <label>Espèce</label>
          <select class="form-control" [(ngModel)]="form.species">
            <option value="BOVINE">Bovin (Vache/Veau)</option>
            <option value="OVINE">Ovin (Mouton/Brebis)</option>
            <option value="CAPRINE">Caprin (Chèvre)</option>
            <option value="AVIAN">Aviaire (Poulet/Dinde)</option>
            <option value="EQUINE">Équin (Cheval)</option>
          </select>
        </div>

        <div class="form-group">
          <label>N° d'identification / Tag (optionnel)</label>
          <input type="text" class="form-control" [(ngModel)]="form.animal_tag" placeholder="ex: TN-882-99">
        </div>

        <div class="form-group">
          <label>Nombre d'animaux atteints</label>
          <input type="number" class="form-control" [(ngModel)]="form.animal_count" min="1">
        </div>

        <div class="form-group">
          <label>Date de visite</label>
          <input type="date" class="form-control" [(ngModel)]="form.visit_date">
        </div>

        <div class="form-group">
          <label>Symptômes observés</label>
          <textarea class="form-control" rows="4" [(ngModel)]="form.symptoms" placeholder="Décrire les symptômes (fièvre, toux, léthargie, baisse de production...)"></textarea>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
        <button class="btn-primary" (click)="submit()" [disabled]="!form.farmer_id || !form.symptoms || !form.visit_date">Créer le Dossier</button>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
.dossiers-wrap { padding: 32px; max-width: 1300px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.action-btn { background: var(--zir-emerald); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.summary-strip { display: flex; gap: 16px; }
.summary-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 20px; display: flex; flex-direction: column; min-width: 140px; }
.summary-val { font-size: 1.5rem; font-weight: 800; color: #f97316; }
.summary-item.total .summary-val { color: var(--text-primary); }
.summary-label { font-size: 0.78rem; color: var(--text-secondary); }
.layout-grid { display: grid; grid-template-columns: 360px 1fr; gap: 24px; }
.dossiers-list { display: flex; flex-direction: column; gap: 12px; max-height: 700px; overflow-y: auto; }
.loading-state { display: flex; justify-content: center; padding: 40px 0; }
.spinner { width: 28px; height: 28px; border: 2.5px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; color: var(--text-muted); padding: 48px; background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px; }
.dossier-card { padding: 16px; cursor: pointer; transition: all 0.15s; border: 1px solid var(--border); background: var(--bg-card); border-radius: 12px; }
.dossier-card:hover { border-color: var(--border-accent); }
.dossier-card.selected { border-color: var(--zir-emerald); background: rgba(16,185,129,0.06); }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; }
.badge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.badge-green { background: rgba(16,185,129,0.1); color: #10b981; }
.badge-yellow { background: rgba(249,115,22,0.1); color: #f97316; }
.symptom-preview { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; }
.card-meta { display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted); }
.detail-panel { min-height: 400px; }
.no-dossier-selected { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px; padding: 48px; color: var(--text-muted); text-align: center; }
.no-dossier-selected ng-icon { font-size: 44px; margin-bottom: 12px; color: var(--border-accent); }
.dossier-detail { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; }
.detail-header h3 { margin: 0; font-size: 1.15rem; color: var(--text-primary); }
.detail-date { font-size: 0.82rem; color: var(--text-muted); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.detail-section h4, .detail-full h4 { margin: 0 0 10px; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.detail-section p { margin: 0 0 8px; font-size: 0.88rem; color: var(--text-primary); }
.text-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; }
.text-box.highlight { border-left: 3px solid #f97316; }
.text-box.highlight.green { border-left-color: #10b981; }
.status-badge { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; display: inline-block; }
.status-badge.open { background: rgba(249,115,22,0.1); color: #f97316; }
.status-badge.resolved { background: rgba(16,185,129,0.1); color: #10b981; }
.detail-actions { display: flex; gap: 10px; border-top: 1px solid var(--border); padding-top: 16px; }

/* Drawer */
.drawer-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 440px; height: 100vh; background: var(--bg-card); box-shadow: var(--shadow-lg); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.form-control { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; width: 100%; box-sizing: border-box; }
.form-control:focus { border-color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 16px; display: flex; gap: 12px; }
.btn-primary { background: var(--zir-emerald); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.animate-in { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ExpClinicalDossiersComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  dossiers = signal<any[]>([]);
  farmers = signal<any[]>([]);
  selectedDossier = signal<any | null>(null);
  isDrawerOpen = signal(false);
  isEditing = signal(false);

  readonly speciesLabels = SPECIES_LABELS;

  form = {
    farmer_id: '',
    species: 'BOVINE',
    animal_tag: '',
    animal_count: 1,
    visit_date: '',
    symptoms: ''
  };

  editForm = {
    diagnosis: '',
    treatment: '',
    follow_up_date: '',
    status: 'OPEN'
  };

  ngOnInit() {
    this.api.getMyFarmers().subscribe(f => { this.farmers.set(f); this.cdr.markForCheck(); });
    this.loadDossiers();
  }

  loadDossiers() {
    this.loading.set(true);
    this.api.getClinicalDossiers().subscribe({
      next: (res) => {
        this.dossiers.set(res || []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  openCount() { return this.dossiers().filter(d => d.status === 'OPEN').length; }

  selectDossier(d: any) {
    this.selectedDossier.set(d);
    this.isEditing.set(false);
    this.cdr.markForCheck();
  }

  startEdit() {
    const d = this.selectedDossier();
    if (!d) return;
    this.editForm = {
      diagnosis: d.diagnosis || '',
      treatment: d.treatment || '',
      follow_up_date: d.follow_up_date ? d.follow_up_date.substring(0, 10) : '',
      status: d.status || 'OPEN'
    };
    this.isEditing.set(true);
    this.cdr.markForCheck();
  }

  saveEdit() {
    const d = this.selectedDossier();
    if (!d) return;
    this.api.updateClinicalDossier(d.id, this.editForm).subscribe({
      next: (updated) => {
        this.toast.success('Dossier mis à jour !');
        this.isEditing.set(false);
        // Refresh detail view and list
        this.selectedDossier.set({ ...d, ...updated });
        this.loadDossiers();
      },
      error: () => this.toast.error('Erreur lors de la mise à jour')
    });
  }

  openCreateDrawer() {
    this.form = {
      farmer_id: '',
      species: 'BOVINE',
      animal_tag: '',
      animal_count: 1,
      visit_date: new Date().toISOString().substring(0, 10),
      symptoms: ''
    };
    this.isDrawerOpen.set(true);
  }

  closeDrawer() { this.isDrawerOpen.set(false); }

  submit() {
    this.api.createClinicalDossier(this.form).subscribe({
      next: (created) => {
        this.toast.success('Dossier clinique créé avec succès !');
        this.closeDrawer();
        this.selectedDossier.set(created);
        this.loadDossiers();
      },
      error: () => this.toast.error("Erreur de création du dossier")
    });
  }
}
