import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef,
  signal, computed, inject, PLATFORM_ID, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMap, lucideList, lucidePlus, lucideSearch, lucideX, lucideAlertTriangle,
  lucideCheckCircle, lucideAlertCircle, lucideHexagon, lucideZap, lucideDroplets,
  lucideLayers, lucideEdit3, lucideChevronRight, lucideMaximize2, lucideMinimize2,
  lucideNavigation, lucideSatellite, lucideRefreshCw, lucideFilter, lucideSettings,
  lucideCrop, lucideRuler, lucideCalendar, lucideActivity, lucideBell, lucideTrendingUp, lucidePhone
} from '@ng-icons/lucide';
import { environment } from '../../../environments/environment';

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface MapCropZone {
  id: string;
  crop_type: string;
  color_hex: string;
  surface_ha: number;
  gdd_accumulated: number;
  gdd_percentage: number;
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL';
  planted_at: string | null;
  harvest_eta_days: number;
  boundary_geojson: GeoJSON.Polygon | null;
}

export interface MapParcel {
  id: string;
  name: string | null;
  color_hex: string;
  area_ha: number;
  center_lat: number | null;
  center_lng: number | null;
  boundary_geojson: GeoJSON.Polygon | null;
  alert_level: 'NORMAL' | 'WARNING' | 'CRITICAL';
  crop_zones: MapCropZone[];
  weather: any | null;
  user_id?: string;
  user_name?: string;
  user_phone?: string;
}

type DrawMode = 'idle' | 'parcel' | 'zone';
type PanelTab = 'zones' | 'weather' | 'actions';
type LayerMode = 'street' | 'satellite';

declare const L: any;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-parcel-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideMap, lucideList, lucidePlus, lucideSearch, lucideX, lucideAlertTriangle,
    lucideCheckCircle, lucideAlertCircle, lucideHexagon, lucideZap, lucideDroplets,
    lucideLayers, lucideEdit3, lucideChevronRight, lucideMaximize2, lucideMinimize2,
    lucideNavigation, lucideSatellite, lucideRefreshCw, lucideFilter, lucideSettings,
    lucideCrop, lucideRuler, lucideCalendar, lucideActivity, lucideBell, lucideTrendingUp, lucidePhone
  })],
  templateUrl: './parcel-map.component.html',
  styleUrl: './parcel-map.component.scss',
})
export class ParcelMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public auth = inject(AuthService);

  // ── State ──────────────────────────────────────────────────────────────────
  parcels = signal<MapParcel[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  selectedParcel = signal<MapParcel | null>(null);
  searchQuery = signal('');
  drawMode = signal<DrawMode>('idle');
  layerMode = signal<LayerMode>('street');
  sidebarCollapsed = signal(false);
  mobileExpanded = signal(false);
  activeTab = signal<PanelTab>('zones');
  
  // Coop President view
  selectedMemberId = signal<string>('all');
  members = computed(() => {
    const mems = new Map<string, any>();
    this.parcels().forEach(p => {
      if (p.user_id && p.user_name) mems.set(p.user_id, { id: p.user_id, name: p.user_name, phone: p.user_phone });
    });
    return Array.from(mems.values());
  });

  // Draw state
  drawnPoints: [number, number][] = [];
  realTimeArea = signal(0);
  newParcelName = signal('');
  newParcelColor = signal('#2D6A4F');
  showNewParcelModal = signal(false);
  pendingPolygon: any = null;

  // Zone draw state
  zoneDrawParcel = signal<MapParcel | null>(null);
  showNewZoneModal = signal(false);
  newZoneCropType = signal('tomate');
  newZoneNotes = signal('');

  readonly CROP_TYPES = [
    { value: 'tomate',          label: 'Tomate',          color: '#E63946' },
    { value: 'piment',          label: 'Piment',          color: '#F4A261' },
    { value: 'oignon',          label: 'Oignon',          color: '#E9C46A' },
    { value: 'pomme de terre',  label: 'Pomme de terre',  color: '#A7C957' },
    { value: 'blé',             label: 'Blé',             color: '#F3D5A0' },
    { value: 'orge',            label: 'Orge',            color: '#D4A373' },
    { value: 'olive',           label: 'Olive',           color: '#6D9B3A' },
    { value: 'melon',           label: 'Melon',           color: '#FFBE0B' },
  ];

  // ── Computed ───────────────────────────────────────────────────────────────
  filteredParcels = computed(() => {
    let result = this.parcels();
    
    // Coop member filter
    const member = this.selectedMemberId();
    if (member !== 'all') {
      result = result.filter(p => p.user_id === member);
    }
    
    // Text search
    const q = this.searchQuery().toLowerCase();
    if (q) {
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.user_name || '').toLowerCase().includes(q) ||
        p.crop_zones.some(z => z.crop_type.toLowerCase().includes(q))
      );
    }
    return result;
  });

  totalArea = computed(() =>
    this.filteredParcels().reduce((s, p) => s + Number(p.area_ha || 0), 0)
  );

  criticalCount = computed(() =>
    this.filteredParcels().filter(p => p.alert_level === 'CRITICAL').length
  );

  warningCount = computed(() =>
    this.filteredParcels().filter(p => p.alert_level === 'WARNING').length
  );

  readonly PALETTE = ['#2D6A4F','#40916C','#52B788','#74C69D','#1B4332','#95D5B2','#B7E4C7','#D8F3DC'];

  // ── Leaflet internals ──────────────────────────────────────────────────────
  private map: any = null;
  private streetLayer: any = null;
  private satelliteLayer: any = null;
  private parcelLayers: Map<string, any> = new Map();
  private zoneLayers: Map<string, any> = new Map();
  private markerLayers: Map<string, any> = new Map();
  private alertLayers: Map<string, any> = new Map();
  private drawItems: any = null;
  private currentDrawer: any = null;

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMapData();
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 150);
      // Extra invalidate after layout settles (full-bleed flex)
      setTimeout(() => this.map?.invalidateSize?.(), 600);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // ─── Map Initialization ───────────────────────────────────────────────────

  private async initMap() {
    if (!isPlatformBrowser(this.platformId) || !this.mapContainer) return;

    // Dynamically import Leaflet
    const leaflet = await import('leaflet');
    const Leaflet = (leaflet as any).default || leaflet;
    (window as any).L = Leaflet;

    this.map = Leaflet.map(this.mapContainer.nativeElement, {
      center: [35.1674, 8.8362],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Initialize leaflet-draw FeatureGroup
    this.drawItems = new Leaflet.FeatureGroup();
    this.map.addLayer(this.drawItems);

    // Setup Draw event listeners
    this.setupDrawEvents(Leaflet);

    // Base layers
    this.streetLayer = Leaflet.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '© OpenStreetMap' }
    );

    this.satelliteLayer = Leaflet.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 19, maxZoom: 22, attribution: '© Esri' }
    );

    this.streetLayer.addTo(this.map);

    // Custom zoom control bottom-right
    Leaflet.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Attribution bottom-left tiny
    Leaflet.control.attribution({ position: 'bottomleft', prefix: '' }).addTo(this.map);

    // Force size recalc (fixes white map on first load in full-bleed)
    setTimeout(() => this.map?.invalidateSize?.(), 100);
    setTimeout(() => this.map?.invalidateSize?.(), 400);

    // If data already loaded, render it
    if (this.parcels().length > 0) {
      this.renderAllParcels();
    }
  }

  private setupDrawEvents(L: any) {
    this.map.on('draw:created', (e: any) => {
      const layer = e.layer;
      
      const geojson = layer.toGeoJSON().geometry;
      this.pendingPolygon = geojson;
      
      if (this.drawMode() === 'zone') {
        this.showNewZoneModal.set(true);
      } else {
        this.showNewParcelModal.set(true);
      }
      this.cdr.markForCheck();
    });

    this.map.on('draw:drawvertex', (e: any) => {
      // Calculate real-time area (Leaflet Draw doesn't expose it easily during draw, so we do it roughly)
      if (e.layers && e.layers.getLayers().length > 0) {
        const currentPoints = e.layers.getLayers().map((l:any) => [l.getLatLng().lat, l.getLatLng().lng]);
        if (currentPoints.length >= 3) {
           this.realTimeArea.set(this.calculatePolygonArea(currentPoints));
           this.cdr.markForCheck();
        }
      }
      
      // Point-in-polygon validation for zones
      if (this.drawMode() === 'zone') {
        const parcel = this.zoneDrawParcel();
        if (parcel && parcel.boundary_geojson?.coordinates) {
          const parcelPoly = L.polygon(this.geoJsonToLatLng(parcel.boundary_geojson.coordinates[0] as [number, number][]));
          
          // Basic bounds check to prevent simple outside clicks
          // In a real app we'd use Turf.js or ray-casting, but this is a quick client-side check
          const latestVertex = e.layers.getLayers()[e.layers.getLayers().length - 1].getLatLng();
          if (!parcelPoly.getBounds().contains(latestVertex)) {
             // Flash red
             const polyLayer = this.parcelLayers.get(parcel.id);
             if (polyLayer) {
               polyLayer.setStyle({ color: '#ef4444' });
               setTimeout(() => polyLayer.setStyle({ color: '#ffffff' }), 500);
             }
          }
        }
      }
    });
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────

  loadMapData() {
    this.isLoading.set(true);
    this.error.set(null);

    const isCoop = this.auth.currentUser()?.role === 'COOP_PRESIDENT';
    const endpoint = isCoop ? '/cooperatives/my/map-data' : '/parcels/map-data';

    this.http.get<any>(`${environment.apiUrl}${endpoint}`).subscribe({
      next: (data) => {
        // Backend returns flat array — same as analytics page
        const arr: any[] = Array.isArray(data) ? data : (data?.parcels || data?.items || []);
        this.parcels.set(arr);
        this.isLoading.set(false);
        if (this.map) {
          this.renderAllParcels();
          setTimeout(() => this.map?.invalidateSize?.(), 100);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set('Impossible de charger les données cartographiques.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Map Rendering ────────────────────────────────────────────────────────

  private renderAllParcels() {
    if (!this.map) return;
    const L = (window as any).L;

    this.clearAllLayers();

    for (const parcel of this.parcels()) {
      this.renderParcel(parcel, L);
    }

    // Fit bounds — same as analytics
    const bounds = L.latLngBounds([]);
    this.parcels().forEach((p: any) => {
      const lat = parseFloat(p.center_lat ?? p.lat);
      const lng = parseFloat(p.center_lng ?? p.lng);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      let boundary = p.boundary_geojson;
      if (typeof boundary === 'string') {
        try { boundary = JSON.parse(boundary); } catch { boundary = null; }
      }
      if (boundary?.coordinates?.[0]) {
        try {
          boundary.coordinates[0].forEach((c: any[]) => bounds.extend([parseFloat(c[1]), parseFloat(c[0])]));
        } catch { bounds.extend([lat, lng]); }
      } else {
        bounds.extend([lat, lng]);
      }
    });
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    }
  }

  private renderParcel(parcel: any, L: any) {
    const isSelected = this.selectedParcel()?.id === parcel.id;
    const lat = parseFloat(parcel.center_lat ?? parcel.lat);
    const lng = parseFloat(parcel.center_lng ?? parcel.lng);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const color = parcel.alert_level === 'CRITICAL' ? '#ef4444'
      : parcel.alert_level === 'WARNING' ? '#f97316'
      : (parcel.color_hex || '#2D6A4F');

    // Parse boundary_geojson — exact same logic as analytics initMap
    let boundary = parcel.boundary_geojson;
    if (typeof boundary === 'string') {
      try { boundary = JSON.parse(boundary); } catch { boundary = null; }
    }

    let latlngs: [number, number][] = [];

    if (boundary && boundary.coordinates && boundary.coordinates[0]) {
      try {
        const coords = boundary.coordinates[0].map((c: any[]) => [parseFloat(c[1]), parseFloat(c[0])] as [number, number]);
        if (coords.length >= 3) {
          latlngs = coords;
        }
      } catch { /* fall through to mock */ }
    }

    // Fallback: generate polygon from center + area (like analytics mockPolygon)
    if (latlngs.length < 3) {
      latlngs = this.generateMockPolygon(lat, lng, Number(parcel.area_ha ?? parcel.surface_ha ?? 0));
    }

    const polygon = L.polygon(latlngs, {
      color,
      weight: isSelected ? 3 : 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: isSelected ? 0.40 : 0.28,
      lineCap: 'round',
      lineJoin: 'round',
    });

    polygon.on('click', () => this.onParcelClick(parcel));
    polygon.addTo(this.map);
    this.parcelLayers.set(parcel.id, polygon);

    this.renderPolygonDetails(parcel, L, latlngs, isSelected);
  }

  private renderPolygonDetails(parcel: any, L: any, latlngs: any, isSelected: boolean) {
    // Alert pulse overlay
    if (parcel.alert_level !== 'NORMAL') {
      const alertColor = parcel.alert_level === 'CRITICAL' ? '#ef4444' : '#f97316';
      const alertPoly = L.polygon(latlngs, {
        color: alertColor,
        weight: 2,
        opacity: 0.8,
        fill: false,
        className: `alert-pulse alert-pulse--${parcel.alert_level.toLowerCase()}`,
      });
      alertPoly.addTo(this.map);
      this.alertLayers.set(parcel.id, alertPoly);
    }

    // Centroid marker/tooltip
    const center = this.getCentroid(latlngs);
    const markerEl = this.buildParcelMarker(parcel, isSelected);
    const icon = L.divIcon({
      html: markerEl,
      className: '',
      iconSize: [160, 70],
      iconAnchor: [80, 35],
    });

    const marker = L.marker(center, { icon }).on('click', () => this.onParcelClick(parcel));
    marker.addTo(this.map);
    this.markerLayers.set(parcel.id, marker);

    // Crop zones
    const zones = parcel.crop_zones || parcel.zones || [];
    for (const zone of zones) {
      this.renderZone(zone, parcel, L);
    }
  }

  private renderZone(zone: any, parcel: any, L: any) {
    let zBoundary = zone.boundary_geojson;
    if (typeof zBoundary === 'string') {
      try { zBoundary = JSON.parse(zBoundary); } catch { zBoundary = null; }
    }
    if (!zBoundary?.coordinates?.[0]) return;

    let latlngs: [number, number][] = [];
    try {
      latlngs = zBoundary.coordinates[0].map((c: any[]) => [parseFloat(c[1]), parseFloat(c[0])] as [number, number]);
    } catch { return; }
    if (latlngs.length < 3) return;

    const zonePoly = L.polygon(latlngs, {
      color: zone.color_hex,
      weight: 1.5,
      dashArray: '6 4',
      opacity: 0.9,
      fillColor: zone.color_hex,
      fillOpacity: 0.45,
      className: 'zone-poly',
    });

    zonePoly.on('click', () => this.onParcelClick(parcel));
    zonePoly.addTo(this.map);
    this.zoneLayers.set(zone.id, zonePoly);

    // Zone centroid marker (GDD progress)
    const center = this.getCentroid(latlngs);
    const pct = Math.min(Math.round(zone.gdd_percentage || 0), 100);
    const progressColor = pct < 60 ? '#22c55e' : pct < 85 ? '#f97316' : '#ef4444';
    const zoneMarkerEl = `
      <div class="zone-marker">
        <div class="zone-marker__ring" style="--pct:${pct};--color:${progressColor}">
          <span>${pct}%</span>
        </div>
        <div class="zone-marker__crop">${this.getCropLabel(zone.crop_type)}</div>
      </div>`;

    const zoneIcon = L.divIcon({
      html: zoneMarkerEl,
      className: '',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });

    const zoneMarker = L.marker(center, { icon: zoneIcon }).on('click', () => this.onParcelClick(parcel));
    zoneMarker.addTo(this.map);
    this.markerLayers.set(`zone-${zone.id}`, zoneMarker);
  }

  private buildParcelMarker(parcel: any, selected: boolean): string {
    const alertDot = parcel.alert_level === 'CRITICAL'
      ? `<span class="pm__alert pm__alert--critical"></span>`
      : parcel.alert_level === 'WARNING'
      ? `<span class="pm__alert pm__alert--warning"></span>`
      : `<span class="pm__alert pm__alert--normal"></span>`;

    const area = Number(parcel.area_ha ?? parcel.surface_ha ?? 0).toFixed(2);
    const zones = parcel.crop_zones || parcel.zones || [];
    const name = parcel.name || this.getCropLabel(zones[0]?.crop_type || '');

    return `
      <div class="parcel-marker ${selected ? 'parcel-marker--selected' : ''}" style="--color:${parcel.color_hex}">
        <div class="parcel-marker__dot" style="background:${parcel.color_hex}"></div>
        <div class="parcel-marker__body">
          <span class="parcel-marker__name">${name}</span>
          <span class="parcel-marker__area">${area} ha</span>
        </div>
        ${alertDot}
      </div>`;
  }

  private clearAllLayers() {
    if (!this.map) return;
    this.parcelLayers.forEach(l => this.map.removeLayer(l));
    this.zoneLayers.forEach(l => this.map.removeLayer(l));
    this.markerLayers.forEach(l => this.map.removeLayer(l));
    this.alertLayers.forEach(l => this.map.removeLayer(l));
    this.parcelLayers.clear();
    this.zoneLayers.clear();
    this.markerLayers.clear();
    this.alertLayers.clear();
  }

  // ─── Interactions ─────────────────────────────────────────────────────────

  onParcelClick(parcel: any) {
    this.selectedParcel.set(parcel);
    this.activeTab.set('zones');

    // Re-render to update selected state
    const L = (window as any).L;
    if (L && this.parcelLayers.size > 0) {
      for (const [id, poly] of this.parcelLayers.entries()) {
        const p = this.parcels().find(p => p.id === id);
        if (p) {
          poly.setStyle({
            weight: id === parcel.id ? 3 : 2,
            fillOpacity: id === parcel.id ? 0.40 : 0.28,
          });
        }
      }
    }

    // Fly to parcel
    const lat = parseFloat(parcel.center_lat ?? parcel.lat);
    const lng = parseFloat(parcel.center_lng ?? parcel.lng);
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      this.map?.flyTo([lat, lng], 15, { duration: 0.8 });
    }

    this.cdr.markForCheck();
  }

  flyToParcel(parcel: MapParcel) {
    this.onParcelClick(parcel);
    if (this.sidebarCollapsed()) this.sidebarCollapsed.set(false);
  }

  closeDetail() {
    this.selectedParcel.set(null);
    // Reset polygon styles
    for (const [id, poly] of this.parcelLayers.entries()) {
      poly.setStyle({ weight: 2, fillOpacity: 0.3 });
    }
    this.cdr.markForCheck();
  }

  toggleMobileDrawer() {
    this.mobileExpanded.update(v => !v);
  }

  toggleLayer() {
    const L = (window as any).L;
    if (!this.map || !L) return;

    if (this.layerMode() === 'street') {
      this.layerMode.set('satellite');
      this.map.removeLayer(this.streetLayer);
      this.satelliteLayer.addTo(this.map);
    } else {
      this.layerMode.set('street');
      this.map.removeLayer(this.satelliteLayer);
      this.streetLayer.addTo(this.map);
    }
    this.cdr.markForCheck();
  }

  // ─── Drawing Mode ─────────────────────────────────────────────────────────

  startDrawParcel() {
    if (!this.map) return;
    const L = (window as any).L;
    
    // Wait for leaflet-draw to be loaded
    import('leaflet-draw').then(() => {
      this.drawMode.set('parcel');
      this.realTimeArea.set(0);
      
      this.currentDrawer = new L.Draw.Polygon(this.map, {
        showArea: true,
        shapeOptions: {
          color: this.newParcelColor(),
          weight: 2,
          fillOpacity: 0.3
        }
      });
      
      this.currentDrawer.enable();
      this.cdr.markForCheck();
    });
  }

  finishDraw() {
    if (this.currentDrawer) {
      this.currentDrawer.completeShape();
    }
  }

  cancelDraw() {
    this.drawMode.set('idle');
    if (this.currentDrawer) {
      this.currentDrawer.disable();
      this.currentDrawer = null;
    }
    
    // Restore parcel highlight if cancelling zone draw
    const zoneParcel = this.zoneDrawParcel();
    if (zoneParcel) {
      const poly = this.parcelLayers.get(zoneParcel.id);
      if (poly) poly.setStyle({ color: zoneParcel.color_hex, weight: 2 });
      this.zoneDrawParcel.set(null);
    }
    
    this.showNewParcelModal.set(false);
    this.showNewZoneModal.set(false);
    this.pendingPolygon = null;
    this.realTimeArea.set(0);
    this.cdr.markForCheck();
  }

  confirmNewParcel() {
    if (!this.pendingPolygon || !this.newParcelName().trim()) return;
    this.http.post<MapParcel>(`${environment.apiUrl}/parcels`, {
      name: this.newParcelName().trim(),
      color_hex: this.newParcelColor(),
      boundary_geojson: this.pendingPolygon,
    }).subscribe({
      next: () => { this.cancelDraw(); this.loadMapData(); },
      error: () => this.cancelDraw()
    });
  }

  confirmNewZone() {
    const parcel = this.zoneDrawParcel();
    if (!this.pendingPolygon || !parcel) return;
    this.http.post(`${environment.apiUrl}/parcels/${parcel.id}/crop-zones`, {
      crop_type: this.newZoneCropType(),
      notes: this.newZoneNotes().trim() || undefined,
      boundary_geojson: this.pendingPolygon,
    }).subscribe({
      next: () => { this.cancelDraw(); this.loadMapData(); },
      error: () => this.cancelDraw()
    });
  }

  startDrawZone(parcel: MapParcel) {
    if (!this.map) return;
    const L = (window as any).L;
    
    import('leaflet-draw').then(() => {
      this.zoneDrawParcel.set(parcel);
      this.selectedParcel.set(null); // close detail panel while drawing
      
      // Highlight parent parcel boundary in white
      const poly = this.parcelLayers.get(parcel.id);
      if (poly) poly.setStyle({ color: '#ffffff', weight: 3 });
      
      // Init draw state
      this.drawMode.set('zone');
      this.realTimeArea.set(0);
      
      this.currentDrawer = new L.Draw.Polygon(this.map, {
        showArea: true,
        shapeOptions: {
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.3,
          dashArray: '6 4'
        }
      });
      
      this.currentDrawer.enable();
      this.cdr.markForCheck();
    });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  goToDiagnostic(parcel: MapParcel) {
    this.router.navigate(['/dashboard/farmer/diagnostic'], {
      queryParams: { parcel_id: parcel.id }
    });
  }

  goToMarketplace(parcel: MapParcel) {
    this.router.navigate(['/dashboard/farmer/marketplace'], {
      queryParams: { parcel_id: parcel.id }
    });
  }

  callMember(phone: string) {
    if (typeof window !== 'undefined') {
      window.open(`tel:${phone}`, '_self');
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private geoJsonToLatLng(coords: any[]): [number, number][] {
    return coords.map((c: any) => [parseFloat(c[1]), parseFloat(c[0])] as [number, number]);
  }

  private generateMockPolygon(lat: number, lng: number, areaHa: number): [number, number][] {
    // Approximate radius in degrees from area (1 ha ≈ 0.00316° at lat 35)
    const radiusDeg = Math.sqrt(areaHa) * 0.00316;
    // Generate an irregular 6-vertex polygon (looks like a real parcel)
    const sides = 6;
    const angleStep = (2 * Math.PI) / sides;
    const seed = Math.abs(lat * 1000 + lng * 100) % 1;
    const points: [number, number][] = [];
    for (let i = 0; i < sides; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const jitter = 0.7 + 0.6 * Math.abs(Math.sin(seed * (i + 1) * 3.7));
      const r = radiusDeg * jitter;
      points.push([lat + r * Math.cos(angle), lng + r * Math.sin(angle)] as [number, number]);
    }
    return points;
  }

  private getCentroid(latlngs: [number, number][]): [number, number] {
    const lat = latlngs.reduce((s, p) => s + p[0], 0) / latlngs.length;
    const lng = latlngs.reduce((s, p) => s + p[1], 0) / latlngs.length;
    return [lat, lng];
  }

  private calculatePolygonArea(points: [number, number][]): number {
    // Shoelace formula approximation in ha (rough)
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const [lat1, lng1] = points[i];
      const [lat2, lng2] = points[(i + 1) % n];
      area += (lng1 * lat2 - lng2 * lat1);
    }
    // Convert to approximate hectares (1 deg² ≈ 12,391 km² at lat 35)
    return Math.abs(area / 2) * 12391 * 100;
  }

  getCropLabel(type: string): string {
    const map: Record<string, string> = {
      'tomate': 'Tomate', 'piment': 'Piment', 'oignon': 'Oignon',
      'blé': 'Blé', 'orge': 'Orge', 'pomme de terre': 'P. de terre',
    };
    return map[type?.toLowerCase()] || (type || '—');
  }

  getAlertBadge(level: 'NORMAL' | 'WARNING' | 'CRITICAL') {
    const map = {
      NORMAL: { label: 'Normal', cls: 'success' },
      WARNING: { label: 'Alerte', cls: 'warning' },
      CRITICAL: { label: 'Critique', cls: 'error' },
    };
    return map[level] || map.NORMAL;
  }

  getGddColor(pct: number): string {
    if (pct < 60) return '#22c55e';
    if (pct < 85) return '#f97316';
    return '#ef4444';
  }

  getWeatherIcon(code: number): string {
    if (code === 0) return 'lucideSun';
    if (code <= 3) return 'lucideCloud';
    if (code <= 67) return 'lucideDroplets';
    return 'lucideZap';
  }

  formatEta(days: number): string {
    if (!days || days <= 0) return 'Prête à récolter';
    if (days < 7) return `${days}j`;
    if (days < 30) return `${Math.round(days / 7)} sem.`;
    return `${Math.round(days / 30)} mois`;
  }
}
