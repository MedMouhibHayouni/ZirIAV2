import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideCalendar, lucideInfo, lucideTrendingDown, lucideX, lucideAlertTriangle } from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-exp-piezometry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideActivity, lucideCalendar, lucideInfo, lucideTrendingDown, lucideX, lucideAlertTriangle })],
  template: `
<div class="piezo-wrap">
  <div class="page-header">
    <div>
      <h2>Courbes Piézométriques</h2>
      <p>Suivi de l'évolution du niveau d'eau de la nappe phréatique et de la salinité sur la durée.</p>
    </div>
  </div>

  <div class="piezo-layout">
    <!-- LEFT: Wells Selector -->
    <div class="wells-sidebar">
      <h3 class="sidebar-title">Puits sous supervision</h3>
      @if (loading()) {
        <div class="sidebar-loading"><div class="spinner"></div></div>
      } @else if (wells().length === 0) {
        <div class="empty-sidebar">Aucun puits disponible.</div>
      } @else {
        <div class="wells-list">
          @for (w of wells(); track w.id) {
            <button class="well-item" [class.selected]="selectedWell()?.id === w.id" (click)="selectWell(w)">
              <div class="well-item-header">
                <strong>{{ w.well_name }}</strong>
                <span class="sal-badge" [class.sal-high]="w.anomaly_salinity">
                  {{ w.salinity_g_l }} g/L
                </span>
              </div>
              <p class="well-item-meta">Niveau actuel: {{ w.water_level_m }}m / Profondeur: {{ w.depth_m }}m</p>
            </button>
          }
        </div>
      }
    </div>

    <!-- RIGHT: Curves and Charts -->
    <div class="charts-content">
      @if (!selectedWell()) {
        <div class="no-well-selected">
          <ng-icon name="lucideActivity"></ng-icon>
          <p>Veuillez sélectionner un puits dans la liste pour visualiser ses courbes d'évolution.</p>
        </div>
      } @else {
        <div class="well-detail-card card glass animate-in">
          <div class="detail-header">
            <div>
              <h3>{{ selectedWell().well_name }}</h3>
              <p class="text-sm text-muted">Exploité par : {{ selectedWell().farmer_name || '—' }}</p>
            </div>
            <div class="alert-status">
              @if (selectedWell().anomaly_salinity) {
                <span class="warning-alert">
                  <ng-icon name="lucideAlertTriangle"></ng-icon> Salinité élevée !
                </span>
              }
            </div>
          </div>

          <div class="charts-grid mt-4">
            <div class="chart-box">
              <h4>Niveau d'eau (Profondeur de la nappe en mètres)</h4>
              <div class="canvas-container">
                <canvas #levelChart></canvas>
              </div>
            </div>
            <div class="chart-box">
              <h4>Salinité (g/L)</h4>
              <div class="canvas-container">
                <canvas #salChart></canvas>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  </div>
</div>
  `,
  styles: [`
.piezo-wrap { padding: 32px; max-width: 1300px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.piezo-layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
.wells-sidebar { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 600px; overflow-y: auto; }
.sidebar-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; text-transform: uppercase; }
.sidebar-loading { display: flex; justify-content: center; padding: 40px 0; }
.spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-sidebar { text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 0.9rem; }
.wells-list { display: flex; flex-direction: column; gap: 10px; }
.well-item { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: pointer; text-align: left; transition: all 0.15s; display: flex; flex-direction: column; gap: 6px; }
.well-item:hover { border-color: var(--border-accent); }
.well-item.selected { border-color: var(--zir-emerald); background: rgba(16,185,129,0.06); }
.well-item-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.well-item-header strong { font-size: 0.9rem; color: var(--text-primary); }
.sal-badge { font-size: 0.72rem; font-weight: 700; color: var(--zir-emerald); background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; }
.sal-badge.sal-high { color: #ef4444; background: rgba(239,68,68,0.1); }
.well-item-meta { font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
.charts-content { min-height: 400px; display: flex; flex-direction: column; }
.no-well-selected { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px; padding: 48px; color: var(--text-muted); text-align: center; }
.no-well-selected ng-icon { font-size: 40px; margin-bottom: 12px; color: var(--border-accent); }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
.detail-header h3 { margin: 0 0 4px; font-size: 1.2rem; color: var(--text-primary); }
.warning-alert { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #ef4444; background: rgba(239,68,68,0.1); padding: 6px 12px; border-radius: 8px; }
.charts-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
.chart-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
.chart-box h4 { margin: 0 0 16px; font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; }
.canvas-container { position: relative; width: 100%; height: 260px; }
.animate-in { animation: fadeIn 0.25s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ExpPiezometryComponent implements OnInit, OnDestroy {
  @ViewChild('levelChart') levelChartRef!: ElementRef;
  @ViewChild('salChart') salChartRef!: ElementRef;

  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  wells = signal<any[]>([]);
  selectedWell = signal<any | null>(null);

  private levelChart: Chart | null = null;
  private salChart: Chart | null = null;

  ngOnInit() {
    this.api.getWells().subscribe({
      next: (res) => {
        this.wells.set(res || []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  destroyCharts() {
    if (this.levelChart) { this.levelChart.destroy(); this.levelChart = null; }
    if (this.salChart) { this.salChart.destroy(); this.salChart = null; }
  }

  selectWell(well: any) {
    this.selectedWell.set(well);
    this.destroyCharts();
    this.cdr.markForCheck();

    this.api.getWellMeasurements(well.id).subscribe(meas => {
      // Sort measurements by measured_at ascending for charts
      const sorted = [...meas].sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
      
      // If no measurements exist, add at least current values as fallback point
      if (sorted.length === 0) {
        sorted.push({
          measured_at: new Date().toISOString(),
          water_level_m: well.water_level_m,
          salinity_g_l: well.salinity_g_l
        });
      }

      setTimeout(() => this.renderCharts(sorted), 50);
    });
  }

  renderCharts(data: any[]) {
    const labels = data.map(d => new Date(d.measured_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    const levels = data.map(d => d.water_level_m);
    const salinities = data.map(d => d.salinity_g_l);

    if (this.levelChartRef?.nativeElement) {
      this.levelChart = new Chart(this.levelChartRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Niveau d\'eau (m)',
            data: levels,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              reverse: true, // typical for piezometry (depth from surface is greater down)
              grid: { color: 'rgba(255,255,255,0.06)' },
              ticks: { color: '#9ca3af' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    if (this.salChartRef?.nativeElement) {
      this.salChart = new Chart(this.salChartRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Salinité (g/L)',
            data: salinities,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              grid: { color: 'rgba(255,255,255,0.06)' },
              ticks: { color: '#9ca3af' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
    this.cdr.markForCheck();
  }
}
