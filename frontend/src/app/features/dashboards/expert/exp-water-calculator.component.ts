import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCalculator, lucideDroplets, lucideHistory, lucideSave,
  lucideUser, lucideLeaf, lucidePrinter, lucideX, lucideCheck
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';

const CROPS = ['Blé','Orge','Maïs','Tomate','Pomme de terre','Olivier','Grenadier','Agrume','Luzerne','Piment','Courgette','Pastèque'];
const STAGES: Record<string, string> = { INITIAL: 'Initial (Germination)', MI_SAISON: 'Mi-saison (Croissance)', FIN: 'Fin de saison (Maturité)' };
const TUNISIAN_GOV = ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tunis','Zaghouan','Tozeur'];

@Component({
  selector: 'app-exp-water-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideCalculator, lucideDroplets, lucideHistory, lucideSave, lucideUser, lucideLeaf, lucidePrinter, lucideX, lucideCheck })],
  template: `
<div class="calc-wrap">
  <div class="page-header">
    <div>
      <h2>Calculateur ETc — Besoins en Eau</h2>
      <p>Calculez les besoins en eau d'irrigation par culture, stade et gouvernorat. Sauvegardez et associez à un agriculteur.</p>
    </div>
    <button class="action-btn print-btn" (click)="printResult()" [disabled]="!result()">
      <ng-icon name="lucidePrinter"></ng-icon> Imprimer
    </button>
  </div>

  <div class="calc-layout">
    <!-- Calculator Form -->
    <div class="calc-form card glass">
      <h3 class="card-title"><ng-icon name="lucideCalculator"></ng-icon> Paramètres du Calcul</h3>

      <div class="form-group">
        <label>Culture</label>
        <select class="form-control" [(ngModel)]="form.crop">
          <option value="">-- Choisir une culture --</option>
          @for (c of crops; track c) { <option [value]="c">{{ c }}</option> }
        </select>
      </div>

      <div class="form-group">
        <label>Stade végétatif</label>
        <div class="stage-cards">
          @for (s of stageKeys; track s) {
            <button class="stage-card" [class.selected]="form.stage === s" (click)="form.stage = s">
              <span class="stage-key">{{ s }}</span>
              <span class="stage-label">{{ stageLabels[s] }}</span>
            </button>
          }
        </div>
      </div>

      <div class="form-group">
        <label>Gouvernorat</label>
        <select class="form-control" [(ngModel)]="form.governorate">
          @for (g of govs; track g) { <option [value]="g">{{ g }}</option> }
        </select>
      </div>

      <div class="form-group">
        <label>Surface (ha)</label>
        <input type="number" class="form-control" [(ngModel)]="form.area_ha" min="0.1" step="0.1" placeholder="1.0">
      </div>

      <div class="form-group">
        <label>Associer à un agriculteur (optionnel)</label>
        <select class="form-control" [(ngModel)]="form.farmer_id">
          <option value="">-- Aucun --</option>
          @for (f of farmers(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
        </select>
      </div>

      <button class="btn-calculate" (click)="calculate()" [disabled]="!form.crop || !form.stage || calculating()">
        @if (calculating()) { <div class="mini-spinner"></div> Calcul en cours... }
        @else { <ng-icon name="lucideDroplets"></ng-icon> Calculer ETc }
      </button>
    </div>

    <!-- Result Panel -->
    @if (result()) {
      <div class="result-card card glass animate-in" id="print-section">
        <div class="result-header">
          <h3><ng-icon name="lucideLeaf"></ng-icon> Résultats</h3>
          <div class="result-badges">
            <span class="rbadge">{{ result().crop }}</span>
            <span class="rbadge">{{ result().stage }}</span>
            <span class="rbadge">{{ result().governorate }}</span>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-icon">🌡️</span>
            <span class="metric-val">{{ result().eto }}</span>
            <span class="metric-unit">mm/jour</span>
            <span class="metric-label">ETo (Réf.)</span>
          </div>
          <div class="metric-card accent">
            <span class="metric-icon">💧</span>
            <span class="metric-val">{{ result().kc }}</span>
            <span class="metric-unit">Kc</span>
            <span class="metric-label">Coeff. culture</span>
          </div>
          <div class="metric-card primary">
            <span class="metric-icon">🚿</span>
            <span class="metric-val">{{ result().etc_mm_day }}</span>
            <span class="metric-unit">mm/jour</span>
            <span class="metric-label">ETc calculé</span>
          </div>
          <div class="metric-card">
            <span class="metric-icon">🪣</span>
            <span class="metric-val">{{ result().m3_per_ha_day }}</span>
            <span class="metric-unit">m³/ha/j</span>
            <span class="metric-label">Volume/ha</span>
          </div>
          @if (form.area_ha > 0) {
            <div class="metric-card total">
              <span class="metric-icon">📊</span>
              <span class="metric-val">{{ totalM3() }}</span>
              <span class="metric-unit">m³/jour</span>
              <span class="metric-label">Total ({{ form.area_ha }} ha)</span>
            </div>
          }
        </div>

        <div class="recommendation-box">
          <ng-icon name="lucideCheck"></ng-icon>
          {{ result().recommendation }}
        </div>

        <div class="result-actions">
          <button class="btn-save" (click)="saveCalc()" [disabled]="saved()">
            <ng-icon name="lucideSave"></ng-icon>
            {{ saved() ? 'Sauvegardé ✓' : 'Sauvegarder' }}
          </button>
        </div>
      </div>
    }
  </div>

  <!-- History -->
  <div class="history-section">
    <h3 class="section-title"><ng-icon name="lucideHistory"></ng-icon> Historique des Calculs</h3>
    @if (history().length === 0) {
      <div class="empty-history">Aucun calcul sauvegardé.</div>
    } @else {
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th><th>Culture</th><th>Stade</th><th>Gouvernorat</th>
              <th>ETc (mm/j)</th><th>Vol. total/j</th><th>Agriculteur</th>
            </tr>
          </thead>
          <tbody>
            @for (h of history(); track h.id) {
              <tr>
                <td>{{ h.created_at | date:'dd/MM/yyyy' }}</td>
                <td><strong>{{ h.crop_type }}</strong></td>
                <td>{{ h.stage }}</td>
                <td>{{ h.governorate }}</td>
                <td class="val-cell">{{ h.etc_mm_day }}</td>
                <td class="val-cell">{{ h.total_m3_day }} m³</td>
                <td>{{ h.farmer_name || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>
  `,
  styles: [`
.calc-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.action-btn { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.calc-layout { display: grid; grid-template-columns: 380px 1fr; gap: 24px; margin-bottom: 32px; }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.card-title { font-size: 1rem; font-weight: 700; margin: 0 0 20px; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
.form-group { margin-bottom: 18px; display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.form-control { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); }
.stage-cards { display: flex; flex-direction: column; gap: 8px; }
.stage-card { display: flex; flex-direction: column; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; text-align: left; background: var(--bg-primary); color: var(--text-primary); transition: all 0.15s; }
.stage-card.selected { border-color: var(--zir-emerald); background: rgba(16,185,129,0.06); }
.stage-key { font-size: 0.7rem; font-weight: 800; color: var(--zir-emerald); text-transform: uppercase; }
.stage-label { font-size: 0.85rem; color: var(--text-primary); }
.btn-calculate { width: 100%; padding: 12px; background: var(--zir-emerald); color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
.btn-calculate:disabled { opacity: 0.5; cursor: not-allowed; }
.mini-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-card { }
.result-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.result-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
.result-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.rbadge { padding: 4px 10px; border-radius: 20px; background: var(--zir-emerald-alpha-10, rgba(16,185,129,0.1)); color: var(--zir-emerald); font-size: 0.75rem; font-weight: 700; }
.metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px; margin-bottom: 20px; }
.metric-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px 12px; text-align: center; display: flex; flex-direction: column; gap: 4px; }
.metric-card.accent { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
.metric-card.primary { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.07); }
.metric-card.total { border-color: rgba(212,175,55,0.3); background: rgba(212,175,55,0.06); }
.metric-icon { font-size: 1.3rem; }
.metric-val { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
.metric-unit { font-size: 0.72rem; color: var(--text-muted); }
.metric-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
.recommendation-box { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 14px 16px; color: var(--zir-emerald); font-size: 0.9rem; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
.result-actions { display: flex; gap: 10px; }
.btn-save { background: var(--zir-emerald); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-save:disabled { background: var(--bg-secondary); color: var(--text-muted); cursor: default; }
.section-title { font-size: 1rem; font-weight: 700; margin: 0 0 16px; display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
.empty-history { text-align: center; padding: 32px; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; }
.history-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
.history-table { width: 100%; border-collapse: collapse; background: var(--bg-card); }
.history-table th { padding: 10px 14px; text-align: left; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); background: var(--bg-secondary); border-bottom: 1px solid var(--border); text-transform: uppercase; }
.history-table td { padding: 12px 14px; font-size: 0.88rem; border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06)); color: var(--text-primary); }
.history-table tr:last-child td { border-bottom: none; }
.val-cell { font-weight: 700; color: var(--zir-emerald); }
.animate-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) { .calc-layout { grid-template-columns: 1fr; } }
@media print { .page-header, .calc-form, .history-section, .result-actions { display: none; } }
  `]
})
export class ExpWaterCalculatorComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  calculating = signal(false);
  result = signal<any>(null);
  history = signal<any[]>([]);
  farmers = signal<any[]>([]);
  saved = signal(false);

  readonly crops = CROPS;
  readonly govs = TUNISIAN_GOV;
  readonly stageKeys = Object.keys(STAGES);
  readonly stageLabels = STAGES;

  form = { crop: '', stage: 'MI_SAISON', governorate: 'Kasserine', area_ha: 1.0, farmer_id: '' };

  ngOnInit() {
    this.api.getMyFarmers().subscribe(f => { this.farmers.set(f); this.cdr.markForCheck(); });
    this.loadHistory();
  }

  loadHistory() {
    this.api.getWaterCalculationHistory().subscribe(h => { this.history.set(h); this.cdr.markForCheck(); });
  }

  totalM3() {
    const r = this.result();
    if (!r || !this.form.area_ha) return 0;
    return Math.round(r.m3_per_ha_day * this.form.area_ha * 10) / 10;
  }

  calculate() {
    if (!this.form.crop || !this.form.stage) return;
    this.calculating.set(true);
    this.saved.set(false);
    this.result.set(null);
    this.api.getEtcCalculation(this.form.crop, this.form.stage, this.form.governorate).subscribe({
      next: (res) => {
        this.result.set(res);
        this.calculating.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur de calcul');
        this.calculating.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  saveCalc() {
    const r = this.result();
    if (!r) return;
    const total = this.totalM3();
    const dto = {
      crop_type: r.crop, stage: r.stage, governorate: r.governorate,
      area_ha: this.form.area_ha, kc: r.kc, eto: r.eto,
      etc_mm_day: r.etc_mm_day, m3_per_ha_day: r.m3_per_ha_day,
      total_m3_day: total, recommendation: r.recommendation,
      farmer_id: this.form.farmer_id || undefined
    };
    this.api.saveWaterCalculation(dto).subscribe({
      next: () => {
        this.saved.set(true);
        this.toast.success('Calcul sauvegardé');
        this.loadHistory();
        this.cdr.markForCheck();
      },
      error: () => { this.toast.error('Erreur lors de la sauvegarde'); }
    });
  }

  printResult() {
    window.print();
  }
}
