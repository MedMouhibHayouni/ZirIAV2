import {
  Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef, inject, signal, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GpsTrackingService, DriverPosition } from '../../../core/services/gps-tracking.service';

@Component({
  selector: 'app-gps-tracking-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="tracking-map-wrapper">
      <div class="map-header">
        <div class="map-title">
          <span class="live-dot"></span>
          <strong>Suivi GPS en direct</strong> — Mission {{ missionId.substring(0, 8) }}
        </div>
        @if (position()) {
          <div class="map-meta">
            <span>🚛 {{ position()!.lat | number:'1.4-6' }}, {{ position()!.lng | number:'1.4-6' }}</span>
            @if (position()!.speed_kmh) {
              <span>{{ position()!.speed_kmh | number:'1.0-0' }} km/h</span>
            }
            <span class="ts">{{ position()!.timestamp | date:'HH:mm:ss' }}</span>
          </div>
        }
      </div>

      <!-- Leaflet map container -->
      <div class="leaflet-map-container" id="gps-tracking-map-{{ missionId }}"></div>

      @if (!position()) {
        <div class="waiting-overlay">
          <div class="waiting-inner">
            <div class="spinner-ring"></div>
            <p>En attente de la position du chauffeur...</p>
            <small>Le chauffeur doit activer le suivi GPS dans son application.</small>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tracking-map-wrapper {
      background: var(--bg-card);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      margin-top: 24px;
    }

    .map-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.08), rgba(59, 130, 246, 0.05));
      border-bottom: 1px solid rgba(59, 130, 246, 0.15);
      gap: 12px;
      flex-wrap: wrap;
    }

    .map-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .live-dot {
      width: 10px; height: 10px;
      background: #3b82f6;
      border-radius: 50%;
      position: relative;
      flex-shrink: 0;
      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.3);
        animation: pulse 1.5s ease-out infinite;
      }
    }

    .map-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: monospace;
      .ts { color: #3b82f6; font-weight: 700; }
    }

    .leaflet-map-container {
      height: 360px;
      width: 100%;
    }

    .waiting-overlay {
      position: absolute;
      inset: 52px 0 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
    }

    .waiting-inner {
      text-align: center;
      color: #fff;
      p { font-weight: 700; font-size: 1rem; margin: 12px 0 4px; }
      small { font-size: 0.8rem; opacity: 0.75; }
    }

    .spinner-ring {
      width: 44px; height: 44px;
      border: 4px solid rgba(255,255,255,0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto;
    }

    @keyframes pulse {
      0%   { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class GpsTrackingMapComponent implements OnInit, OnDestroy, OnChanges {
  @Input() missionId!: string;
  @Input() originLat?: number;
  @Input() originLng?: number;
  @Input() destLat?: number;
  @Input() destLng?: number;

  private gps = inject(GpsTrackingService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  position = this.gps.driverPosition;

  private map: any = null;
  private driverMarker: any = null;
  private positionSub: any = null;

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.gps.watchMission(this.missionId);
    await this.initMap();
    this.watchPosition();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['missionId'] && !changes['missionId'].firstChange) {
      this.gps.stopWatching();
      this.destroyMap();
      this.ngOnInit();
    }
  }

  ngOnDestroy() {
    this.gps.stopWatching();
    this.destroyMap();
  }

  private async initMap() {
    // Dynamically import Leaflet to avoid SSR issues
    const L = await import('leaflet');
    const mapId = `gps-tracking-map-${this.missionId}`;
    const container = document.getElementById(mapId);
    if (!container || this.map) return;

    // Default center: Tunisia centroid
    const defaultLat = this.originLat ?? 36.8;
    const defaultLng = this.originLng ?? 10.18;

    this.map = L.map(container, { zoomControl: true, attributionControl: false }).setView(
      [defaultLat, defaultLng], 9
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Origin marker
    if (this.originLat && this.originLng) {
      L.circleMarker([this.originLat, this.originLng], {
        radius: 10, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8,
      }).addTo(this.map).bindPopup('Point de départ');
    }

    // Destination marker
    if (this.destLat && this.destLng) {
      L.circleMarker([this.destLat, this.destLng], {
        radius: 10, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8,
      }).addTo(this.map).bindPopup('Destination');
    }

    // If we already have a position, place marker immediately
    const pos = this.position();
    if (pos) {
      this.updateDriverMarker(L, pos);
    }
  }

  private watchPosition() {
    // Use an effect-like pattern: poll the signal every 2s for map updates
    const check = () => {
      const pos = this.position();
      if (pos && this.map) {
        import('leaflet').then((L) => this.updateDriverMarker(L, pos));
        this.cdr.markForCheck();
      }
    };
    this.positionSub = setInterval(check, 2000);
  }

  private updateDriverMarker(L: any, pos: DriverPosition) {
    if (!this.map) return;

    const latLng: [number, number] = [Number(pos.lat), Number(pos.lng)];

    if (this.driverMarker) {
      this.driverMarker.setLatLng(latLng);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#1e40af;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(30,64,175,0.5);border:3px solid white;">🚛</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      this.driverMarker = L.marker(latLng, { icon }).addTo(this.map);
      this.driverMarker.bindPopup('Chauffeur en transit');
    }

    // Smoothly pan map to keep driver in view
    this.map.panTo(latLng, { animate: true, duration: 1.5 });
  }

  private destroyMap() {
    if (this.positionSub) clearInterval(this.positionSub);
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.driverMarker = null;
    }
  }
}
