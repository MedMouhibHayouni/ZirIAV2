import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMap, lucideRefreshCw, lucideFilter, lucideAlertTriangle, lucideCheckCircle } from '@ng-icons/lucide';
import * as L from 'leaflet';
import { ExpertApiService } from '../../../core/services/expert-api.service';

@Component({
  selector: 'app-exp-heatmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideMap, lucideRefreshCw, lucideFilter, lucideAlertTriangle, lucideCheckCircle })],
  template: `
<div class="heatmap-wrap">
  <div class="page-header">
    <div>
      <h2>Carte de Chaleur des Maladies</h2>
      <p>Distribution géographique des détections IA par sévérité et maladie.</p>
    </div>
    <button class="action-btn" (click)="loadData()">
      <ng-icon name="lucideRefreshCw"></ng-icon> Actualiser
    </button>
  </div>

  <div class="controls-bar">
    <div class="filter-group">
      <label>Maladie</label>
      <select class="form-control" [(ngModel)]="filterDisease" (change)="applyFilters()">
        <option value="">Toutes les maladies</option>
        @for (d of diseases(); track d) {
          <option [value]="d">{{ d }}</option>
        }
      </select>
    </div>
    <div class="filter-group">
      <label>Confiance min.</label>
      <select class="form-control" [(ngModel)]="filterConfidence" (change)="applyFilters()">
        <option value="0">Toutes</option>
        <option value="0.5">≥ 50%</option>
        <option value="0.7">≥ 70%</option>
        <option value="0.85">≥ 85% (haute)</option>
      </select>
    </div>
    <div class="stats-chips">
      <span class="chip chip-total">{{ filteredPoints().length }} points</span>
      <span class="chip chip-high">{{ highCount() }} haute confiance</span>
    </div>
  </div>

  <div class="map-container">
    <div #mapEl id="disease-heatmap" class="leaflet-map"></div>
    @if (loading()) {
      <div class="map-loading">
        <div class="spinner"></div>
        <span>Chargement des données...</span>
      </div>
    }
    @if (!loading() && filteredPoints().length === 0) {
      <div class="map-empty">
        <ng-icon name="lucideMap"></ng-icon>
        <p>Aucune détection avec ces filtres.</p>
      </div>
    }
  </div>

  <div class="legend">
    <span class="legend-title">Confiance IA</span>
    <div class="legend-item"><span class="dot dot-critical"></span> ≥ 85% (critique)</div>
    <div class="legend-item"><span class="dot dot-high"></span> 70–84%</div>
    <div class="legend-item"><span class="dot dot-medium"></span> 50–69%</div>
    <div class="legend-item"><span class="dot dot-low"></span> &lt; 50%</div>
  </div>
</div>
  `,
  styles: [`
.heatmap-wrap { padding: 32px; max-width: 1300px; margin: 0 auto; }
.page-header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h2 { margin: 0 0 6px; font-size: 1.5rem; color: var(--text-primary); }
.page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
.action-btn { background: var(--zir-emerald); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.controls-bar { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; padding: 16px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
.form-control { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.9rem; }
.stats-chips { display: flex; gap: 8px; align-items: center; margin-left: auto; }
.chip { padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; }
.chip-total { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border); }
.chip-high { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
.map-container { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow-md); }
.leaflet-map { width: 100%; height: 540px; background: var(--bg-secondary); }
.map-loading, .map-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: rgba(var(--bg-primary-rgb, 15,20,30), 0.7); color: var(--text-secondary); }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.legend { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-top: 14px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; }
.legend-title { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-right: 4px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); }
.dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.dot-critical { background: #ef4444; }
.dot-high { background: #f97316; }
.dot-medium { background: #eab308; }
.dot-low { background: #6b7280; }
  `]
})
export class ExpHeatmapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapEl') mapEl!: ElementRef;
  private readonly api = inject(ExpertApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  allPoints = signal<any[]>([]);
  filteredPoints = signal<any[]>([]);
  diseases = signal<string[]>([]);

  filterDisease = '';
  filterConfidence = '0';

  private map: L.Map | null = null;
  private markers: L.CircleMarker[] = [];

  highCount() {
    return this.filteredPoints().filter(p => p.confidence_score >= 0.85).length;
  }

  ngOnInit() { this.loadData(); }

  ngAfterViewInit() { this.initMap(); }

  ngOnDestroy() { this.map?.remove(); this.map = null; }

  initMap() {
    if (!this.mapEl?.nativeElement) return;
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: false })
      .setView([33.8869, 9.5375], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(this.map);
  }

  loadData() {
    this.loading.set(true);
    this.api.getDiseaseHeatmapData().subscribe(data => {
      this.allPoints.set(data || []);
      const diseaseSet = new Set<string>(data.map((d: any) => d.disease_name).filter(Boolean));
      this.diseases.set(Array.from(diseaseSet).sort());
      this.applyFilters();
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  applyFilters() {
    const minConf = parseFloat(this.filterConfidence) || 0;
    const filtered = this.allPoints().filter(p => {
      if (this.filterDisease && p.disease_name !== this.filterDisease) return false;
      if (p.confidence_score < minConf) return false;
      return true;
    });
    this.filteredPoints.set(filtered);
    this.renderMarkers(filtered);
    this.cdr.markForCheck();
  }

  renderMarkers(points: any[]) {
    if (!this.map) return;
    this.markers.forEach(m => m.remove());
    this.markers = [];
    for (const p of points) {
      if (!p.lat || !p.lng) continue;
      const color = p.confidence_score >= 0.85 ? '#ef4444'
        : p.confidence_score >= 0.7 ? '#f97316'
        : p.confidence_score >= 0.5 ? '#eab308' : '#6b7280';
      const r = p.confidence_score >= 0.85 ? 10 : p.confidence_score >= 0.7 ? 8 : 6;
      const m = L.circleMarker([p.lat, p.lng], {
        radius: r, fillColor: color, color: '#fff', weight: 1.5,
        fillOpacity: 0.8, opacity: 1
      }).bindPopup(`
        <strong>${p.disease_name || 'Maladie inconnue'}</strong><br>
        Confiance: <b>${Math.round((p.confidence_score || 0) * 100)}%</b>
      `);
      m.addTo(this.map!);
      this.markers.push(m);
    }
  }
}
