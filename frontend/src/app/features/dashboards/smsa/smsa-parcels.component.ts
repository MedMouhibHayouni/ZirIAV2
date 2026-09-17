import {  Component, OnInit, inject, ViewChild, ElementRef, signal, effect, PLATFORM_ID , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMap, lucideMapPin, lucideSprout, lucidePlus, lucideList, lucideChevronRight, lucideX } from '@ng-icons/lucide';
import * as L from 'leaflet';
import { SmsaApiService, SmsaParcel } from '../../../core/services/smsa-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-smsa-parcels',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucideMap, lucideMapPin, lucideSprout, lucidePlus, lucideList, lucideChevronRight, lucideX 
})],
  templateUrl: './smsa-parcels.component.html',
  styleUrl: './smsa-parcels.component.scss'
})
export class SmsaParcelsComponent implements OnInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('miniMapContainer', { static: false }) miniMapContainer!: ElementRef;

  private smsaApi = inject(SmsaApiService);
  private notificationStore = inject(NotificationStore);
  private platformId = inject(PLATFORM_ID);

  readonly parcels = this.smsaApi.parcels;
  readonly isLoading = this.smsaApi.isLoading;
  readonly hasError = this.smsaApi.hasError;

  viewMode: 'MAP' | 'LIST' = 'LIST';
  map!: L.Map;
  miniMap!: L.Map;

  // Wizard
  showWizard = false;
  wizardStep = 1;
  newParcel = { name: '', crop_type: '', surface_ha: 0, governorate: 'Kasserine', lat: 35.1676, lng: 8.8365 };

  // Details Modal
  showDetailsModal = false;
  selectedParcelDetails = signal<any>(null);
  selectedCropZones = signal<any[]>([]);

  constructor() {
    effect(() => {
      if (this.viewMode === 'MAP' && this.parcels().length > 0 && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initOrUpdateMap(), 100);
      }
    });
  }

  ngOnInit() {
    this.smsaApi.fetchParcels();
  }

  toggleView(mode: 'MAP' | 'LIST') {
    this.viewMode = mode;
  }

  initOrUpdateMap() {
    if (!this.mapContainer) return;
    
    if (!this.map) {
      L.Marker.prototype.options.icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41]
      });
      this.map = L.map(this.mapContainer.nativeElement).setView([35.1676, 8.8365], 10);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      }).addTo(this.map);
    }

    // Clear layers
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Polygon) {
        this.map.removeLayer(layer);
      }
    });

    const colors: Record<string, string> = { ok: '#22c55e', weather_risk: '#f97316', disease_alert: '#ef4444' };

    this.parcels().forEach(p => {
      const color = colors[p.status] || '#22c55e';
      if (p.lat && p.lng) {
        L.circleMarker([p.lat, p.lng], {
          radius: 10, color, fillColor: color, fillOpacity: 0.7, weight: 2
        })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align:center;">
            <b>${p.crop_type}</b><br/>${p.surface_ha} ha<br/>
            <button onclick="window.dispatchEvent(new CustomEvent('openParcel', {detail: '${p.id}'}))" 
                    style="margin-top:8px; padding:4px 8px; background:#22c55e; color:white; border:none; border-radius:4px; cursor:pointer;">
              Voir détails
            </button>
          </div>
        `);
      }
    });

    // Listen to popup click
    window.addEventListener('openParcel', (e: any) => this.openDetails(e.detail));
  }

  openDetails(parcelId: string) {
    this.showDetailsModal = true;
    this.selectedParcelDetails.set(null);
    this.selectedCropZones.set([]);

    this.smsaApi.getParcelDetails(parcelId).subscribe(data => {
      this.selectedParcelDetails.set(data);
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initMiniMap(data), 100);
      }
    });
    this.smsaApi.getParcelCropZones(parcelId).subscribe(data => {
      this.selectedCropZones.set(data);
    });
  }

  initMiniMap(parcel: any) {
    if (!this.miniMapContainer || !parcel.lat || !parcel.lng) return;
    if (this.miniMap) {
      this.miniMap.remove();
    }
    this.miniMap = L.map(this.miniMapContainer.nativeElement).setView([parcel.lat, parcel.lng], 14);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(this.miniMap);
    L.marker([parcel.lat, parcel.lng]).addTo(this.miniMap);
  }

  submitParcel() {
    this.smsaApi.createParcel(this.newParcel).subscribe({
      next: () => {
        this.notificationStore.showSuccess('Parcelle déclarée avec succès');
        this.showWizard = false;
        this.smsaApi.fetchParcels();
      },
      error: () => this.notificationStore.showError('Erreur lors de la déclaration')
    });
  }
}
