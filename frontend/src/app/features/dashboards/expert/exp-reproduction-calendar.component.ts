import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucidePlus, lucideX, lucideSave, lucideUser, lucideCheckCircle, lucideInfo, lucideAlertTriangle } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

const GESTATION_DAYS: Record<string, number> = {
  COW: 283, // Bovin
  SHEEP: 152, // Ovin
  GOAT: 150, // Caprin
  MARE: 335 // Équin
};

const SPECIES_LABELS: Record<string, string> = {
  COW: 'Vache',
  SHEEP: 'Brebis',
  GOAT: 'Chèvre',
  MARE: 'Jument'
};

@Component({
  selector: 'app-exp-reproduction-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideCalendar, lucidePlus, lucideX, lucideSave, lucideUser, lucideCheckCircle, lucideInfo, lucideAlertTriangle })],
  template: `
<div class="repro-wrap">
  <div class="page-header">
    <div>
      <h2>Calendrier de Reproduction</h2>
      <p>Planifiez et suivez les inséminations, gestations et prévisions de mise bas du troupeau.</p>
    </div>
    <button class="action-btn" (click)="openCreateDrawer()">
      <ng-icon name="lucidePlus"></ng-icon> Planifier Insémination
    </button>
  </div>

  <!-- Summary Cards -->
  <div class="summary-strip mb-4">
    <div class="summary-item">
      <span class="summary-val">{{ plannedCount() }}</span>
      <span class="summary-label">Planifiées</span>
    </div>
    <div class="summary-item active">
      <span class="summary-val">{{ activeGestationCount() }}</span>
      <span class="summary-label">Gestations en cours</span>
    </div>
    <div class="summary-item expected">
      <span class="summary-val">{{ birthSoonCount() }}</span>
      <span class="summary-label">Mises bas imminentes (30j)</span>
    </div>
  </div>

  <!-- Records Table -->
  <div class="table-card card glass">
    @if (loading()) {
      <div class="table-loading"><div class="spinner"></div></div>
    } @else if (records().length === 0) {
      <div class="empty-table">Aucune insémination planifiée ou enregistrée.</div>
    } @else {
      <div class="table-wrap">
        <table class="repro-table">
          <thead>
            <tr>
              <th>Animal</th><th>Espèce</th><th>Date Insém.</th>
              <th>Gestation</th><th>Mise Bas Prévue</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of records(); track r.id) {
              <tr [class.birth-imminent]="isBirthImminent(r.expected_birth_date)">
                <td>
                  <strong>{{ r.animal_tag }}</strong>
                  <div class="text-xs text-muted">Eleveur: {{ r.farmer_name || '—' }}</div>
                </td>
                <td>{{ speciesLabels[r.species] || r.species }}</td>
                <td>{{ r.insemination_date | date:'dd/MM/yyyy' }}</td>
                <td class="gest-cell">
                  @if (r.gestation_confirmed) {
                    <span class="g-badge active">Confirmée</span>
                  } @else {
                    <span class="g-badge pending">À confirmer</span>
                  }
                </td>
                <td>
                  <strong>{{ r.expected_birth_date | date:'dd/MM/yyyy' }}</strong>
                  @if (isBirthImminent(r.expected_birth_date)) {
                    <div class="alert-imminent"><ng-icon name="lucideAlertTriangle"></ng-icon> Imminent !</div>
                  }
                </td>
                <td>
                  <span class="status-badge" [class]="r.status.toLowerCase()">{{ getStatusLabel(r.status) }}</span>
                </td>
                <td>
                  <div class="row-actions">
                    @if (!r.gestation_confirmed && r.status === 'PLANNED') {
                      <button class="btn-action-sm success" (click)="confirmGestation(r)">Confirmer Gestation</button>
                    }
                    @if (r.status === 'GESTATION') {
                      <button class="btn-action-sm primary" (click)="markBirth(r)">Mise Bas Effectuée</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  <!-- Create Drawer Backdrop -->
  @if (isDrawerOpen()) {
    <div class="drawer-backdrop animate-in" (click)="closeDrawer()"></div>
    <div class="drawer animate-in">
      <div class="drawer-header">
        <h3>Planifier une Insémination</h3>
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
          <select class="form-control" [(ngModel)]="form.species" (change)="onSpeciesChange()">
            <option value="COW">Bovin (Vache)</option>
            <option value="SHEEP">Ovin (Brebis)</option>
            <option value="GOAT">Caprin (Chèvre)</option>
            <option value="MARE">Équin (Jument)</option>
          </select>
        </div>

        <div class="form-group">
          <label>N° d'identification / Tag Animal</label>
          <input type="text" class="form-control" [(ngModel)]="form.animal_tag" placeholder="ex: TN-123-45">
        </div>

        <div class="form-group">
          <label>Date de l'Insémination / Saillie</label>
          <input type="date" class="form-control" [(ngModel)]="form.insemination_date" (change)="recalculateExpectedBirth()">
        </div>

        <div class="form-group">
          <label>Durée de gestation par défaut (jours)</label>
          <input type="number" class="form-control" [(ngModel)]="form.gestation_days" readonly disabled>
        </div>

        <div class="form-group">
          <label>Mise Bas Estimée</label>
          <input type="date" class="form-control" [(ngModel)]="form.expected_birth_date" readonly disabled>
        </div>

        <div class="form-group">
          <label>Notes & Observations</label>
          <textarea class="form-control" rows="3" [(ngModel)]="form.notes" placeholder="Détails du taureau / bélier, observations..."></textarea>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
        <button class="btn-primary" (click)="submit()" [disabled]="!form.farmer_id || !form.animal_tag || !form.insemination_date">Enregistrer</button>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
.repro-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.action-btn { background: var(--zir-emerald); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.summary-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.summary-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; }
.summary-val { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); }
.summary-item.active .summary-val { color: #3b82f6; }
.summary-item.expected .summary-val { color: #f97316; }
.summary-label { font-size: 0.8rem; color: var(--text-secondary); }
.table-card { padding: 0; overflow: hidden; }
.table-loading { padding: 60px 0; display: flex; justify-content: center; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-table { padding: 48px; text-align: center; color: var(--text-muted); }
.table-wrap { overflow-x: auto; }
.repro-table { width: 100%; border-collapse: collapse; }
.repro-table th { padding: 12px 16px; text-align: left; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); background: var(--bg-secondary); border-bottom: 1px solid var(--border); text-transform: uppercase; }
.repro-table td { padding: 14px 16px; font-size: 0.88rem; border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06)); color: var(--text-primary); }
.repro-table tr:last-child td { border-bottom: none; }
.repro-table tr.birth-imminent { background: rgba(249,115,22,0.04); }
.alert-imminent { display: flex; align-items: center; gap: 4px; color: #f97316; font-size: 0.75rem; font-weight: 700; margin-top: 2px; }
.g-badge { font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; display: inline-block; }
.g-badge.active { background: rgba(59,130,246,0.1); color: #3b82f6; }
.g-badge.pending { background: rgba(107,114,128,0.1); color: #6b7280; }
.status-badge { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; display: inline-block; }
.status-badge.planned { background: rgba(107,114,128,0.1); color: #6b7280; }
.status-badge.gestation { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge.born { background: rgba(16,185,129,0.12); color: #10b981; }
.status-badge.failed { background: rgba(239,68,68,0.12); color: #ef4444; }
.row-actions { display: flex; gap: 6px; }
.btn-action-sm { border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; }
.btn-action-sm.success { background: rgba(16,185,129,0.12); color: #10b981; }
.btn-action-sm.success:hover { background: rgba(16,185,129,0.2); }
.btn-action-sm.primary { background: rgba(59,130,246,0.12); color: #3b82f6; }
.btn-action-sm.primary:hover { background: rgba(59,130,246,0.2); }

/* Drawer */
.drawer-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000; }
.drawer { position: fixed; top: 0; right: 0; width: 420px; height: 100vh; background: var(--bg-card); box-shadow: var(--shadow-lg); z-index: 1001; padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; border-left: 1px solid var(--border); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.close-btn { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; }
.drawer-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.form-control { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); outline: none; }
.form-control:focus { border-color: var(--zir-emerald); }
.drawer-footer { border-top: 1px solid var(--border); padding-top: 16px; display: flex; gap: 12px; }
.btn-primary { background: var(--zir-emerald); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
.animate-in { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ExpReproductionCalendarComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  records = signal<any[]>([]);
  farmers = signal<any[]>([]);
  isDrawerOpen = signal(false);

  readonly speciesLabels = SPECIES_LABELS;

  form = {
    farmer_id: '',
    species: 'COW',
    animal_tag: '',
    insemination_date: '',
    gestation_days: GESTATION_DAYS['COW'],
    expected_birth_date: '',
    notes: ''
  };

  ngOnInit() {
    this.api.getMyFarmers().subscribe(f => { this.farmers.set(f); this.cdr.markForCheck(); });
    this.loadRecords();
  }

  loadRecords() {
    this.loading.set(true);
    this.api.getReproductionRecords().subscribe({
      next: (res) => {
        this.records.set(res || []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  plannedCount() { return this.records().filter(r => r.status === 'PLANNED').length; }
  activeGestationCount() { return this.records().filter(r => r.status === 'GESTATION').length; }
  birthSoonCount() {
    return this.records().filter(r => r.status === 'GESTATION' && this.isBirthImminent(r.expected_birth_date)).length;
  }

  isBirthImminent(dateStr: string): boolean {
    if (!dateStr) return false;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }

  getStatusLabel(status: string): string {
    const l: Record<string, string> = { PLANNED: 'Planifié', GESTATION: 'Gestation', BORN: 'Mise Bas', FAILED: 'Échec' };
    return l[status] || status;
  }

  openCreateDrawer() {
    this.form = {
      farmer_id: '',
      species: 'COW',
      animal_tag: '',
      insemination_date: new Date().toISOString().substring(0, 10),
      gestation_days: GESTATION_DAYS['COW'],
      expected_birth_date: '',
      notes: ''
    };
    this.recalculateExpectedBirth();
    this.isDrawerOpen.set(true);
  }

  closeDrawer() { this.isDrawerOpen.set(false); }

  onSpeciesChange() {
    this.form.gestation_days = GESTATION_DAYS[this.form.species] || 280;
    this.recalculateExpectedBirth();
  }

  recalculateExpectedBirth() {
    if (!this.form.insemination_date) return;
    const date = new Date(this.form.insemination_date);
    date.setDate(date.getDate() + this.form.gestation_days);
    this.form.expected_birth_date = date.toISOString().substring(0, 10);
  }

  confirmGestation(r: any) {
    this.api.updateReproductionRecord(r.id, { gestation_confirmed: true, status: 'GESTATION' }).subscribe({
      next: () => {
        this.toast.success('Gestation confirmée !');
        this.loadRecords();
      },
      error: () => this.toast.error('Erreur lors de la confirmation')
    });
  }

  markBirth(r: any) {
    this.api.updateReproductionRecord(r.id, { status: 'BORN', actual_birth_date: new Date().toISOString().substring(0, 10) }).subscribe({
      next: () => {
        this.toast.success('Mise bas enregistrée avec succès !');
        this.loadRecords();
      },
      error: () => this.toast.error("Erreur d'enregistrement")
    });
  }

  submit() {
    this.api.createReproductionRecord(this.form).subscribe({
      next: () => {
        this.toast.success('Insémination planifiée !');
        this.closeDrawer();
        this.loadRecords();
      },
      error: () => this.toast.error("Erreur lors de l'enregistrement")
    });
  }
}
