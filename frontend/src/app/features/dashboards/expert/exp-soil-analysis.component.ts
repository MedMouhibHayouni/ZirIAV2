import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideFlaskConical, lucidePlus, lucideX, lucideSave, lucideCalendar,
  lucideUser, lucideCheckCircle, lucideAlertTriangle, lucideInfo
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { SlideInPanelComponent } from './shared/slide-in-panel.component';

@Component({
  selector: 'app-exp-soil-analysis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent, SkeletonLoaderComponent, SlideInPanelComponent],
  providers: [provideIcons({
    lucideFlaskConical, lucidePlus, lucideX, lucideSave, lucideCalendar,
    lucideUser, lucideCheckCircle, lucideAlertTriangle, lucideInfo
  })],
  template: `
    <div class="analysis-wrap">
      <div class="page-header">
        <div>
          <h2>Analyses de Sol</h2>
          <p>Suivi des propriétés physico-chimiques et recommandations de fertilisation.</p>
        </div>
        <button class="action-btn" (click)="isDrawerOpen.set(true)">
          <ng-icon name="lucidePlus"></ng-icon> Nouvelle Analyse
        </button>
      </div>

      <!-- Summary KPIs -->
      @if (analyses().length > 0) {
        <div class="summary-strip">
          <div class="summary-item">
            <span class="summary-val">{{ analyses().length }}</span>
            <span class="summary-label">Analyses totales</span>
          </div>
          <div class="summary-item">
            <span class="summary-val good">{{ getGoodPhCount() }}</span>
            <span class="summary-label">pH optimal (6.5-7.5)</span>
          </div>
          <div class="summary-item">
            <span class="summary-val warn">{{ getWarningCount() }}</span>
            <span class="summary-label">À surveiller</span>
          </div>
          <div class="summary-item">
            <span class="summary-val danger">{{ getCriticalCount() }}</span>
            <span class="summary-label">Critiques</span>
          </div>
        </div>
      }

      <div class="grid-layout animate-in">
        <div class="analysis-list">
          @if (loading()) {
            @for (i of [1,2,3]; track i) {
              <app-skeleton-loader width="100%" height="200px" borderRadius="16px"></app-skeleton-loader>
            }
          } @else if (!analyses().length) {
            <div class="empty-state">
              <ng-icon name="lucideFlaskConical"></ng-icon>
              <p>Aucune analyse de sol enregistrée.</p>
            </div>
          } @else {
            @for (s of analyses(); track s.id) {
              <div class="card glass" [class.border-warning]="getPhStatus(s.ph) === 'warning'" [class.border-critical]="getPhStatus(s.ph) === 'critical'">
                <div class="card-header-flex">
                  <strong>Parcelle (Fermier: {{ s.farmer_name }})</strong>
                  <div class="badges-row">
                    <span class="badge" [class.badge-green]="getPhStatus(s.ph) === 'optimal'" [class.badge-orange]="getPhStatus(s.ph) === 'warning'" [class.badge-red]="getPhStatus(s.ph) === 'critical'">
                      pH: {{ s.ph }}
                    </span>
                    @if (getNpkStatus(s) === 'low') {
                      <span class="badge badge-orange">NPK Faible</span>
                    }
                  </div>
                </div>
                <div class="metrics-grid">
                  <div class="metric">
                    <span class="lbl">M.O (%)</span>
                    <span class="val">{{ s.organic_matter_pct }}%</span>
                    <div class="metric-bar">
                      <div class="metric-fill" [style.width.%]="getMatterBar(s.organic_matter_pct)" [class.good]="s.organic_matter_pct >= 2" [class.low]="s.organic_matter_pct < 2"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span class="lbl">Azote (ppm)</span>
                    <span class="val">{{ s.nitrogen_ppm }}</span>
                    <div class="metric-bar">
                      <div class="metric-fill" [style.width.%]="getNitrogenBar(s.nitrogen_ppm)" [class.good]="s.nitrogen_ppm >= 40" [class.low]="s.nitrogen_ppm < 40"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span class="lbl">Phosphore (ppm)</span>
                    <span class="val">{{ s.phosphorus_ppm }}</span>
                    <div class="metric-bar">
                      <div class="metric-fill" [style.width.%]="getPhosphorusBar(s.phosphorus_ppm)" [class.good]="s.phosphorus_ppm >= 20" [class.low]="s.phosphorus_ppm < 20"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span class="lbl">Potassium (ppm)</span>
                    <span class="val">{{ s.potassium_ppm }}</span>
                    <div class="metric-bar">
                      <div class="metric-fill" [style.width.%]="getPotassiumBar(s.potassium_ppm)" [class.good]="s.potassium_ppm >= 120" [class.low]="s.potassium_ppm < 120"></div>
                    </div>
                  </div>
                </div>
                @if (s.notes) {
                  <div class="notes-section">
                    <ng-icon name="lucideInfo" class="notes-icon"></ng-icon>
                    <span class="notes-text">{{ s.notes }}</span>
                  </div>
                }
                <div class="card-footer">
                  <span class="date-label"><ng-icon name="lucideCalendar"></ng-icon> {{ s.analysis_date | date:'dd/MM/yyyy' }}</span>
                  <span class="conductivity-label">Conductivité: {{ s.conductivity_ms }} mS/cm</span>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>

    <!-- Add Analysis Drawer -->
    <app-slide-in-panel
      [isOpen]="isDrawerOpen()"
      [width]="'450px'"
      [title]="'Nouvelle Analyse de Sol'"
      (close)="closeDrawer()"
    >
      <div class="drawer-form">
        <div class="form-group">
          <label>Agriculteur</label>
          <select class="form-control" [(ngModel)]="formModel.farmer_id">
            <option value="" disabled selected>Choisir un agriculteur...</option>
            @for (f of farmers(); track f.id) {
              <option [value]="f.id">{{ f.name }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Date de l'analyse</label>
          <input type="date" class="form-control" [(ngModel)]="formModel.analysis_date">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>pH</label>
            <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.ph">
            <span class="form-hint" [class.warning]="formModel.ph < 6.5 || formModel.ph > 7.5">
              {{ getPhLabel(formModel.ph) }}
            </span>
          </div>
          <div class="form-group">
            <label>Matière Organique (%)</label>
            <input type="number" step="0.1" class="form-control" [(ngModel)]="formModel.organic_matter_pct">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Azote (N ppm)</label>
            <input type="number" class="form-control" [(ngModel)]="formModel.nitrogen_ppm">
          </div>
          <div class="form-group">
            <label>Phosphore (P ppm)</label>
            <input type="number" class="form-control" [(ngModel)]="formModel.phosphorus_ppm">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Potassium (K ppm)</label>
            <input type="number" class="form-control" [(ngModel)]="formModel.potassium_ppm">
          </div>
          <div class="form-group">
            <label>Conductivité (mS/cm)</label>
            <input type="number" step="0.01" class="form-control" [(ngModel)]="formModel.conductivity_ms">
          </div>
        </div>

        <div class="form-group">
          <label>Notes & Recommandations</label>
          <textarea class="form-control" rows="3" [(ngModel)]="formModel.notes"></textarea>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn-secondary" (click)="closeDrawer()">Annuler</button>
        <button class="btn-primary" (click)="saveAnalysis()" [disabled]="!formModel.farmer_id || !formModel.analysis_date">
          <ng-icon name="lucideSave"></ng-icon>
          Enregistrer
        </button>
      </div>
    </app-slide-in-panel>
  `,
  styles: [`
    .analysis-wrap { padding: 32px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-primary); }
    .page-header p { margin: 0; color: var(--text-secondary); font-size: 0.95rem; }

    .action-btn {
      background: var(--zir-emerald); color: white; border: none;
      padding: 10px 18px; border-radius: 8px; font-weight: 700;
      cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      transition: all 0.2s;
    }
    .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--zir-emerald-alpha-20); }

    /* Summary Strip */
    .summary-strip {
      display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .summary-item {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 12px; padding: 14px 20px; display: flex; flex-direction: column;
      align-items: center; min-width: 100px;
    }
    .summary-val { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    .summary-val.good { color: var(--zir-emerald); }
    .summary-val.warn { color: var(--warning); }
    .summary-val.danger { color: var(--danger); }
    .summary-label { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }

    .card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 16px; padding: 20px; margin-bottom: 16px;
      transition: all 0.2s;
    }
    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .card.border-warning { border-left: 4px solid var(--warning); }
    .card.border-critical { border-left: 4px solid var(--danger); }

    .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .badges-row { display: flex; gap: 6px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge-green { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .badge-orange { background: var(--warning-alpha); color: var(--warning); }
    .badge-red { background: var(--danger-alpha); color: var(--danger); }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .metric {
      background: var(--bg-secondary); padding: 12px; border-radius: 10px;
      text-align: center; border: 1px solid var(--border-color);
    }
    .metric .lbl { font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 4px; }
    .metric .val { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }

    .metric-bar {
      width: 100%; height: 4px; background: var(--border-color);
      border-radius: 2px; margin-top: 6px; overflow: hidden;
    }
    .metric-fill {
      height: 100%; border-radius: 2px; transition: width 0.3s;
      background: var(--text-secondary);
    }
    .metric-fill.good { background: var(--zir-emerald); }
    .metric-fill.low { background: var(--warning); }

    .notes-section {
      display: flex; align-items: flex-start; gap: 8px;
      margin-top: 12px; padding: 10px; border-radius: 8px;
      background: var(--info-alpha);
    }
    .notes-icon { color: var(--info); font-size: 16px; flex-shrink: 0; margin-top: 2px; }
    .notes-text { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }

    .card-footer {
      display: flex; justify-content: space-between; font-size: 0.8rem;
      color: var(--text-secondary); margin-top: 12px; padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }
    .date-label { display: flex; align-items: center; gap: 4px; }

    .empty-state {
      text-align: center; padding: 48px; color: var(--text-secondary);
      background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);
    }
    .empty-state ng-icon { font-size: 48px; color: var(--text-secondary); margin-bottom: 16px; opacity: 0.4; }

    /* Drawer Form */
    .drawer-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
    .form-control {
      padding: 10px 12px; border: 1px solid var(--border-color);
      border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary);
      outline: none; transition: border-color 0.2s;
    }
    .form-control:focus { border-color: var(--zir-emerald); }
    .form-hint { font-size: 0.75rem; color: var(--text-secondary); }
    .form-hint.warning { color: var(--warning); }
    .drawer-footer { display: flex; gap: 12px; margin-top: 16px; }
    .btn-primary {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      background: var(--zir-emerald); color: white; border: none;
      padding: 10px 16px; border-radius: 8px; font-weight: 700;
      cursor: pointer; flex: 1; transition: opacity 0.2s;
    }
    .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: var(--bg-secondary); color: var(--text-primary);
      border: 1px solid var(--border-color); padding: 10px 16px;
      border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1;
    }
  `]
})
export class ExpSoilAnalysisComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  analyses = signal<any[]>([]);
  farmers = signal<any[]>([]);
  isDrawerOpen = signal<boolean>(false);
  loading = signal(true);

  formModel = {
    farmer_id: '',
    analysis_date: new Date().toISOString().substring(0, 10),
    ph: 7.0,
    organic_matter_pct: 2.0,
    nitrogen_ppm: 50,
    phosphorus_ppm: 25,
    potassium_ppm: 150,
    conductivity_ms: 1.2,
    notes: ''
  };

  ngOnInit() {
    this.loadAnalyses();
    this.api.getMyFarmers().subscribe(res => {
      this.farmers.set(res);
      this.cdr.markForCheck();
    });
  }

  loadAnalyses() {
    this.loading.set(true);
    this.api.getSoilAnalyses().subscribe(res => {
      this.analyses.set(res);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  getPhStatus(ph: number): string {
    if (ph >= 6.5 && ph <= 7.5) return 'optimal';
    if (ph >= 6.0 && ph <= 8.0) return 'warning';
    return 'critical';
  }

  getPhLabel(ph: number): string {
    if (ph >= 6.5 && ph <= 7.5) return 'pH optimal';
    if (ph < 6.5) return 'pH acide';
    return 'pH alcalin';
  }

  getNpkStatus(s: any): string {
    if (s.nitrogen_ppm < 40 || s.phosphorus_ppm < 20 || s.potassium_ppm < 120) return 'low';
    return 'normal';
  }

  getMatterBar(val: number): number { return Math.min((val / 5) * 100, 100); }
  getNitrogenBar(val: number): number { return Math.min((val / 80) * 100, 100); }
  getPhosphorusBar(val: number): number { return Math.min((val / 50) * 100, 100); }
  getPotassiumBar(val: number): number { return Math.min((val / 200) * 100, 100); }

  getGoodPhCount(): number {
    return this.analyses().filter(a => this.getPhStatus(a.ph) === 'optimal').length;
  }
  getWarningCount(): number {
    return this.analyses().filter(a => this.getPhStatus(a.ph) === 'warning').length;
  }
  getCriticalCount(): number {
    return this.analyses().filter(a => this.getPhStatus(a.ph) === 'critical').length;
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.formModel = {
      farmer_id: '',
      analysis_date: new Date().toISOString().substring(0, 10),
      ph: 7.0,
      organic_matter_pct: 2.0,
      nitrogen_ppm: 50,
      phosphorus_ppm: 25,
      potassium_ppm: 150,
      conductivity_ms: 1.2,
      notes: ''
    };
  }

  saveAnalysis() {
    this.api.createSoilAnalysis(this.formModel).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadAnalyses();
        this.toast.success('Analyse enregistrée');
      },
      error: () => {
        this.toast.error('Erreur lors de l\'enregistrement');
      }
    });
  }
}
