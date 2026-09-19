import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMap, lucideDroplets, lucideSprout,
  lucideAlertTriangle, lucideActivity
} from '@ng-icons/lucide';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

interface MapPin {
  lat: number;
  lng: number;
  title: string;
  category: 'PPI' | 'WATER_POINT' | 'CAMPAIGN' | 'ALERT';
  delegation: string;
  status: string;
}

const CATEGORY_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  PPI:         { color: '#10b981', icon: 'lucideSprout',      label: 'Périmètres Irrigués (PPI)' },
  WATER_POINT: { color: '#06b6d4', icon: 'lucideDroplets',    label: 'Puits & Forages Contrôlés' },
  CAMPAIGN:    { color: '#f59e0b', icon: 'lucideActivity',    label: 'Campagnes Actives' },
  ALERT:       { color: '#ef4444', icon: 'lucideAlertTriangle', label: 'Alerte Sanitaire / Phytosanitaire' },
};

@Component({
  selector: 'app-crda-territory-map',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideMap, lucideDroplets, lucideSprout,
    lucideAlertTriangle, lucideActivity
  })],
  styles: [`
    :host { --zir-violet: #8b5cf6; }
    .crda-map-shell { display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 48px); }
    .crda-map-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .crda-map-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .crda-map-filter-btn {
      padding: 6px 14px; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary);
      cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .crda-map-filter-btn:hover { border-color: var(--zir-violet); color: var(--zir-violet); }
    .crda-map-filter-btn--active { background: var(--zir-violet); border-color: var(--zir-violet); color: #fff; }
    .crda-map-body { display: grid; grid-template-columns: 1fr 320px; gap: 20px; flex: 1; }
    .crda-map-canvas {
      border-radius: 16px; border: 1px solid var(--border); overflow: hidden;
      background: var(--bg-card); min-height: 540px; position: relative;
    }
    .crda-map-canvas .w-full { width: 100%; height: 100%; min-height: 540px; }
    .crda-sidebar {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
      padding: 20px; display: flex; flex-direction: column; gap: 18px;
    }
    .crda-sidebar__title {
      margin: 0; font-size: 0.88rem; font-weight: 700; color: var(--text-primary);
      display: flex; align-items: center; gap: 8px;
    }
    .crda-legend { display: flex; flex-direction: column; gap: 12px; }
    .crda-legend-item { display: flex; align-items: center; gap: 10px; font-size: 0.78rem; color: var(--text-secondary); }
    .crda-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .crda-legend-item ng-icon { width: 14px; height: 14px; flex-shrink: 0; }
    .crda-sidebar__stat {
      padding-top: 14px; border-top: 1px solid var(--border);
    }
    .crda-sidebar__stat-label { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px; }
    .crda-sidebar__stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); }
    .crda-sidebar__stat-sub { font-size: 0.68rem; color: var(--text-muted); margin-top: 4px; }
    @media (max-width: 1100px) { .crda-map-body { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="inst-page crda-map-shell">

      <!-- Header -->
      <header class="crda-map-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--violet">
            <ng-icon name="lucideMap"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Cartographie Territoriale CRDA</h1>
            <p class="inst-header__sub">Périmètres irrigués, points d'eau et campagnes</p>
          </div>
        </div>

        <div class="crda-map-filters">
          <button class="crda-map-filter-btn"
            [class.crda-map-filter-btn--active]="activeFilter() === 'ALL'"
            (click)="setFilter('ALL')">Tous</button>
          <button class="crda-map-filter-btn"
            [class.crda-map-filter-btn--active]="activeFilter() === 'PPI'"
            (click)="setFilter('PPI')">
            <ng-icon name="lucideSprout" style="width:12px;height:12px;vertical-align:-2px"></ng-icon>
            Périmètres PPI
          </button>
          <button class="crda-map-filter-btn"
            [class.crda-map-filter-btn--active]="activeFilter() === 'WATER_POINT'"
            (click)="setFilter('WATER_POINT')">
            <ng-icon name="lucideDroplets" style="width:12px;height:12px;vertical-align:-2px"></ng-icon>
            Points d'eau
          </button>
          <button class="crda-map-filter-btn"
            [class.crda-map-filter-btn--active]="activeFilter() === 'CAMPAIGN'"
            (click)="setFilter('CAMPAIGN')">
            <ng-icon name="lucideActivity" style="width:12px;height:12px;vertical-align:-2px"></ng-icon>
            Campagnes
          </button>
          <button class="crda-map-filter-btn"
            [class.crda-map-filter-btn--active]="activeFilter() === 'ALERT'"
            (click)="setFilter('ALERT')">
            <ng-icon name="lucideAlertTriangle" style="width:12px;height:12px;vertical-align:-2px"></ng-icon>
            Alertes Phyto
          </button>
        </div>
      </header>

      <!-- Map & Sidebar -->
      <div class="crda-map-body">
        <div class="crda-map-canvas">
          <div #mapContainer class="w-full"></div>
        </div>

        <aside class="crda-sidebar">
          <h3 class="crda-sidebar__title">
            <ng-icon name="lucideMap" style="width:16px;height:16px;color:var(--zir-violet)"></ng-icon>
            Légende & Indicateurs
          </h3>

          <div class="crda-legend">
            @for (cat of categoryKeys; track cat) {
              <div class="crda-legend-item">
                <span class="crda-legend-dot" [style.background]="categories[cat].color"></span>
                <ng-icon [name]="categories[cat].icon"></ng-icon>
                <span>{{ categories[cat].label }}</span>
              </div>
            }
          </div>

          <div class="crda-sidebar__stat">
            <p class="crda-sidebar__stat-label">Total sites surveillés</p>
            <p class="crda-sidebar__stat-value">{{ pins().length }}</p>
            <p class="crda-sidebar__stat-sub">Coordonnées cartographiques WGS84</p>
          </div>
        </aside>
      </div>
    </div>
  `
})
export class CrdaTerritoryMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  activeFilter = signal<string>('ALL');
  categories = CATEGORY_CONFIG;
  categoryKeys = Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>;

  pins = signal<MapPin[]>([
    { lat: 35.1676, lng: 8.8365, title: 'PPI Kasserine Nord — Secteur 1', category: 'PPI', delegation: 'Kasserine Nord', status: 'Actif' },
    { lat: 35.2500, lng: 9.1200, title: 'Forage Profond F-42 Sbeïtla', category: 'WATER_POINT', delegation: 'Sbeïtla', status: 'En service' },
    { lat: 35.0382, lng: 9.4849, title: 'Campagne Vaccin Brebis Sidi Bouzid', category: 'CAMPAIGN', delegation: 'Sidi Bouzid Ouest', status: 'En cours' },
    { lat: 35.3400, lng: 8.7800, title: 'Foyer Charançon Rouge Fériana', category: 'ALERT', delegation: 'Fériana', status: 'Quarantaine' },
    { lat: 36.0849, lng: 9.3708, title: 'PPI Siliana Sud — Céréaliculture', category: 'PPI', delegation: 'Siliana Sud', status: 'Actif' },
    { lat: 36.1742, lng: 8.7049, title: 'Centre de Collecte Lait Le Kef', category: 'CAMPAIGN', delegation: 'Le Kef Ouest', status: 'Planifié' },
  ]);

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  setFilter(filter: string) {
    this.activeFilter.set(filter);
    this.renderMarkers();
  }

  private initMap() {
    if (!this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([35.3, 9.1], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(this.map);

    this.renderMarkers();
  }

  private renderMarkers() {
    if (!this.map) return;

    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        this.map!.removeLayer(layer);
      }
    });

    const filter = this.activeFilter();
    const items = filter === 'ALL' ? this.pins() : this.pins().filter(p => p.category === filter);

    items.forEach(item => {
      const color = CATEGORY_CONFIG[item.category]?.color || '#10b981';
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(this.map!);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #111;">
          <strong>${item.title}</strong><br/>
          <span style="color: #666;">Délégation :</span> ${item.delegation}<br/>
          <span style="color: #666;">Statut :</span> <strong>${item.status}</strong>
        </div>
      `);
    });
  }
}
