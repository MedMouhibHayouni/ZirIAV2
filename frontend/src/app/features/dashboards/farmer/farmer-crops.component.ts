import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, PLATFORM_ID, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMap, lucideList, lucideMapPin, lucidePlus, lucideTrash2,
  lucideCamera, lucideCloud, lucideDroplets, lucideThermometer, lucideX,
  lucideSprout, lucideTriangleAlert, lucideCalendarDays, lucideTrendingUp,
  lucideWallet, lucideActivity, lucideSun, lucideWind, lucideEye,
  lucideBarChart3, lucideClock, lucideCheckCircle2, lucideAlertTriangle,
  lucideLeaf, lucideZap, lucideDollarSign, lucideArrowUpRight, lucideArrowDownRight,
  lucideRefreshCcw, lucideInfo, lucideBell, lucideUsers
} from '@ng-icons/lucide';
import * as L from 'leaflet';
import { FarmerApiService, FarmerParcel, CropZone, FinanceSummary } from '../../../core/services/farmer-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface WeatherData {
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  weather_code: number;
  description?: string;
  precipitation_mm?: number;
}

interface MapParcel extends FarmerParcel {
  boundary_geojson?: any;
  weather_3days?: any[];
  last_detection?: any;
  worst_alert?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-crops',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    lucideMap, lucideList, lucideMapPin, lucidePlus, lucideTrash2,
    lucideCamera, lucideCloud, lucideDroplets, lucideThermometer, lucideX,
    lucideSprout, lucideTriangleAlert, lucideCalendarDays, lucideTrendingUp,
    lucideWallet, lucideActivity, lucideSun, lucideWind, lucideEye,
    lucideBarChart3, lucideClock, lucideCheckCircle2, lucideAlertTriangle,
    lucideLeaf, lucideZap, lucideDollarSign, lucideArrowUpRight, lucideArrowDownRight,
    lucideRefreshCcw, lucideInfo, lucideBell, lucideUsers
  })],
  templateUrl: './farmer-crops.component.html',
  styleUrl: './farmer-crops.component.scss'
})
export class FarmerCropsComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private platformId = inject(PLATFORM_ID);
  public farmerApi = inject(FarmerApiService);
  private notifs = inject(NotificationStore);
  public router = inject(Router);
  private http = inject(HttpClient);

  viewMode: 'LIST' | 'MAP' = 'MAP';
  map!: L.Map;
  private mapInitialized = false;

  // Data signals
  weather = signal<WeatherData | null>(null);
  finance = signal<FinanceSummary | null>(null);
  detections = signal<any[]>([]);
  mapParcels = signal<MapParcel[]>([]);
  loadingWeather = signal(true);
  loadingFinance = signal(true);
  loadingDetections = signal(true);
  loadingMapData = signal(true);

  // Zone modal
  showZoneModal = false;
  selectedParcelId: string | null = null;
  newZone = {
    name: '',
    crop_type: 'Tomate',
    surface_ha: 0,
    planted_at: new Date().toISOString().split('T')[0],
    plant_count: 0
  };

  cropTypes = ['Tomate', 'Ble Dur', 'Olive', 'Pomme de terre', 'Piment', 'Oignon', 'Melon', 'Amandier'];

  // Computed KPIs
  totalParcels = computed(() => this.farmerApi.parcels().length);
  totalZones = computed(() => this.farmerApi.parcels().reduce((sum, p) => sum + (p.zones?.length || 0), 0));
  totalSurface = computed(() =>
    this.farmerApi.parcels().reduce((sum, p) => sum + (p.area_ha ?? p.surface_ha ?? 0), 0)
  );
  alertCount = computed(() =>
    this.farmerApi.parcels().filter(p => p.status === 'disease_alert' || p.alert_level === 'CRITICAL').length
  );
  avgGdd = computed(() => {
    const zones = this.farmerApi.parcels().flatMap(p => p.zones || []);
    if (!zones.length) return 0;
    return Math.round(zones.reduce((s, z) => s + (z.gdd_accumulated / z.gdd_target) * 100, 0) / zones.length);
  });
  harvestReadyCount = computed(() =>
    this.farmerApi.parcels().flatMap(p => p.zones || []).filter(z => {
      const pct = z.gdd_target > 0 ? (z.gdd_accumulated / z.gdd_target) * 100 : 0;
      return pct >= 85;
    }).length
  );

  constructor() {}

  ngOnInit() {
    this.loadAll();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  loadAll() {
    this.farmerApi.fetchParcels().subscribe();
    this.loadWeather();
    this.loadFinance();
    this.loadDetections();
    this.loadMapData();
  }

  loadWeather() {
    this.loadingWeather.set(true);
    this.http.get<WeatherData>(`${environment.apiUrl}/weather?days=1`).subscribe({
      next: (data) => { this.weather.set(data); this.loadingWeather.set(false); },
      error: () => this.loadingWeather.set(false)
    });
  }

  loadFinance() {
    this.loadingFinance.set(true);
    this.farmerApi.fetchFinanceSummary('month').subscribe({
      next: () => this.loadingFinance.set(false),
      error: () => this.loadingFinance.set(false)
    });
  }

  loadDetections() {
    this.loadingDetections.set(true);
    this.farmerApi.fetchMyDetections().subscribe({
      next: (res: any) => { this.detections.set(res?.data || res || []); this.loadingDetections.set(false); },
      error: () => this.loadingDetections.set(false)
    });
  }

  loadMapData() {
    this.loadingMapData.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/parcels/map-data`).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        const mapped: MapParcel[] = list.map((p: any) => ({
          ...p,
          zones: (p.crop_zones || p.zones || []).map((z: any) => ({
            id: z.id,
            parcel_id: p.id,
            name: z.name,
            crop_type: z.crop_type,
            surface_ha: Number(z.surface_ha) || 0,
            planted_at: z.planted_at,
            harvest_prediction_date: z.harvest_prediction_date,
            gdd_accumulated: Number(z.gdd_accumulated) || 0,
            gdd_target: Number(z.harvest_threshold || z.gdd_target) || 1500,
            plant_count: Number(z.plant_count) || 0,
          }))
        }));
        this.mapParcels.set(mapped);
        this.loadingMapData.set(false);
        if (this.viewMode === 'MAP') {
          setTimeout(() => this.initMap(), 200);
        }
      },
      error: () => {
        this.loadingMapData.set(false);
        if (this.viewMode === 'MAP') {
          setTimeout(() => this.initMap(), 200);
        }
      }
    });
  }

  toggleView(mode: 'LIST' | 'MAP') {
    this.viewMode = mode;
    if (mode === 'MAP') {
      if (this.map) {
        setTimeout(() => this.map.invalidateSize(), 100);
      } else {
        setTimeout(() => this.initMap(), 200);
      }
    }
  }

  openZoneModal(parcelId: string) {
    this.selectedParcelId = parcelId;
    this.newZone = { name: '', crop_type: 'Tomate', surface_ha: 0, planted_at: new Date().toISOString().split('T')[0], plant_count: 0 };
    this.showZoneModal = true;
  }

  submitZone() {
    if (!this.selectedParcelId) return;
    this.farmerApi.addCropZone(this.selectedParcelId, this.newZone).subscribe({
      next: () => {
        this.notifs.showSuccess('Zone de culture ajoutée !');
        this.showZoneModal = false;
        this.farmerApi.fetchParcels().subscribe();
        this.loadMapData();
      },
      error: () => this.notifs.showError("Erreur lors de l'ajout.")
    });
  }

  goToDiagnostic(parcelId: string) {
    this.router.navigate(['/dashboard/farmer/diagnostic'], { queryParams: { parcel_id: parcelId } });
  }

  refresh() {
    this.loadAll();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getCropColor(crop: string): string {
    const c = crop.toLowerCase();
    if (c.includes('tomate') || c.includes('piment')) return '#ef4444';
    if (c.includes('ble') || c.includes('oignon')) return '#eab308';
    if (c.includes('olive')) return '#22c55e';
    if (c.includes('pomme')) return '#a78bfa';
    if (c.includes('melon')) return '#f97316';
    if (c.includes('amandier')) return '#ec4899';
    return '#3b82f6';
  }

  getGddProgress(cz: CropZone): number {
    return Math.min(100, Math.round((cz.gdd_accumulated / cz.gdd_target) * 100)) || 0;
  }

  getGddColor(pct: number): string {
    if (pct < 50) return 'var(--zir-emerald)';
    if (pct < 85) return 'var(--warning)';
    return 'var(--error)';
  }

  getGddLabel(pct: number): string {
    if (pct < 25) return 'Début de croissance';
    if (pct < 50) return 'Croissance active';
    if (pct < 75) return 'Maturation';
    if (pct < 85) return 'Presque mûr';
    return 'Prêt à récolter';
  }

  getHarvestDays(cz: CropZone): string {
    if (!cz.harvest_prediction_date) return 'N/A';
    const diff = (new Date(cz.harvest_prediction_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    if (diff < 0) return 'Récolte dépassée';
    return `dans ${Math.ceil(diff)}j`;
  }

  getWeatherIcon(code: number): string {
    if (code <= 1) return 'lucideSun';
    if (code <= 3) return 'lucideCloud';
    if (code <= 49) return 'lucideCloud';
    if (code <= 69) return 'lucideDroplets';
    if (code <= 79) return 'lucideCloud';
    if (code <= 82) return 'lucideDroplets';
    if (code <= 99) return 'lucideZap';
    return 'lucideCloud';
  }

  getWeatherDesc(code: number): string {
    if (code <= 1) return 'Dégagé';
    if (code <= 3) return 'Variable';
    if (code <= 49) return 'Brouillard';
    if (code <= 69) return 'Pluie';
    if (code <= 79) return 'Neige';
    if (code <= 82) return 'Averses';
    if (code <= 99) return 'Orages';
    return 'Variable';
  }

  formatMoney(n: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
  }

  getAlertColor(level: string): string {
    if (level === 'CRITICAL') return 'var(--error)';
    if (level === 'WARNING') return 'var(--warning)';
    return 'var(--zir-emerald)';
  }

  // ── Map ────────────────────────────────────────────────────────────────────

  private initMap() {
    if (this.map || !this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [35.1676, 8.8365],
      zoom: 10,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // ALWAYS use map-data endpoint — same as the map page, never fall back to farmerApi.parcels()
    const parcels = this.mapParcels();
    if (!parcels.length) return;
    const bounds = L.latLngBounds([]);

    parcels.forEach((p: any) => {
      const lat = parseFloat(p.center_lat ?? p.lat);
      const lng = parseFloat(p.center_lng ?? p.lng);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const color = p.status === 'disease_alert' ? '#ef4444'
        : p.status === 'weather_risk' ? '#f59e0b'
        : p.worst_alert === 'CRITICAL' ? '#ef4444'
        : p.worst_alert === 'WARNING' ? '#f59e0b'
        : (p.color_hex || '#22c55e');

      let polygon!: L.Polygon;
      let hasBoundary = false;

      // Try to parse boundary_geojson (might be string from PostGIS)
      let boundary = p.boundary_geojson;
      if (typeof boundary === 'string') {
        try { boundary = JSON.parse(boundary); } catch { boundary = null; }
      }

      if (boundary && boundary.coordinates && boundary.coordinates[0]) {
        try {
          const coords = boundary.coordinates[0].map((c: any[]) => [parseFloat(c[1]), parseFloat(c[0])] as L.LatLngExpression);
          if (coords.length >= 3) {
            polygon = L.polygon(coords, { color, fillColor: color, fillOpacity: 0.35, weight: 2 });
            coords.forEach((c: L.LatLngExpression) => bounds.extend(c));
            hasBoundary = true;
          }
        } catch { /* fall through to mock */ }
      }

      if (!hasBoundary) {
        const latLngs = this.mockPolygon(lat, lng, Number(p.area_ha ?? p.surface_ha ?? 0));
        polygon = L.polygon(latLngs, { color, fillColor: color, fillOpacity: 0.35, weight: 2 });
        latLngs.forEach(ll => bounds.extend(ll));
      }

      const zones = (p.zones || []) as CropZone[];
      const zoneHtml = zones.map(z => {
        const pct = this.getGddProgress(z);
        return `<div style="margin-top:6px;">
          <span style="font-size:11px;color:#8ba3c7;">${z.crop_type}</span>
          <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:2px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${this.getGddColor(pct)};border-radius:2px;"></div>
          </div>
          <span style="font-size:10px;color:#4d6a8e;">${z.gdd_accumulated}/${z.gdd_target} GDD</span>
        </div>`;
      }).join('');

      const popupHtml = `
        <div style="font-family:Inter,sans-serif;min-width:180px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.name || 'Parcelle'}</div>
          <div style="font-size:12px;color:#8ba3c7;margin-bottom:8px;">
            ${Number(p.area_ha ?? p.surface_ha ?? 0).toFixed(1)} ha · ${zones.length} zone(s)
          </div>
          ${zoneHtml}
          ${p.last_detection ? `<div style="margin-top:8px;padding:6px 8px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:11px;color:#ef4444;">
            Dernière détection: ${p.last_detection.disease_name || 'N/A'}
          </div>` : ''}
        </div>`;

      polygon.bindPopup(popupHtml, { className: 'zir-map-popup' });
      polygon.addTo(this.map);
    });

    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [60, 60] });
    }
    this.mapInitialized = true;
  }

  private mockPolygon(lat: number, lng: number, areaHa: number = 10): L.LatLngExpression[] {
    const radiusDeg = Math.sqrt(areaHa) * 0.00316;
    const sides = 6;
    const angleStep = (2 * Math.PI) / sides;
    const seed = Math.abs(lat * 1000 + lng * 100) % 1;
    const points: L.LatLngExpression[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const jitter = 0.7 + 0.6 * Math.abs(Math.sin(seed * (i + 1) * 3.7));
      const r = radiusDeg * jitter;
      points.push([lat + r * Math.cos(angle), lng + r * Math.sin(angle)]);
    }
    return points;
  }
}
