import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUser, lucideLock, lucideMapPin, lucideAlertTriangle } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import * as L from 'leaflet';

@Component({
  selector: 'app-supplier-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideUser, lucideLock, lucideMapPin, lucideAlertTriangle })],
  templateUrl: './supplier-settings.component.html',
  styleUrls: ['./supplier-settings.component.scss']
})
export class SupplierSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  
  @ViewChild('settingsMap', { static: false }) settingsMapContainer!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  profile: any = {};
  passwords = { current: '', new: '', confirm: '' };
  loading = true;
  saving = false;

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => {
        this.profile = { ...user };
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.initSettingsMap(), 150);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  initSettingsMap() {
    if (!isPlatformBrowser(this.platformId) || !this.settingsMapContainer) return;

    const lat = this.profile.lat ? parseFloat(this.profile.lat) : 35.1676;
    const lng = this.profile.lng ? parseFloat(this.profile.lng) : 8.8306;

    L.Marker.prototype.options.icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    this.map = L.map(this.settingsMapContainer.nativeElement, {
      zoomControl: true
    }).setView([lat, lng], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const position = this.marker!.getLatLng();
      this.profile.lat = parseFloat(position.lat.toFixed(7));
      this.profile.lng = parseFloat(position.lng.toFixed(7));
      this.cdr.markForCheck();
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.profile.lat = parseFloat(lat.toFixed(7));
      this.profile.lng = parseFloat(lng.toFixed(7));
      this.marker!.setLatLng(e.latlng);
      this.cdr.markForCheck();
    });
  }

  centerMapOnLocation() {
    if (!this.map || !this.marker) return;
    const delegation = (this.profile.delegation || '').toLowerCase().trim();
    const governorate = (this.profile.governorate || '').toLowerCase().trim();

    const coordinatesMap: { [key: string]: [number, number] } = {
      'kasserine nord': [35.18, 8.83],
      'kasserine sud': [35.15, 8.80],
      'foussana': [35.34, 8.68],
      'sbeitla': [35.22, 9.12],
      'thala': [35.57, 8.68],
      'feriana': [34.95, 8.57],
      'sbiba': [35.60, 9.08],
      'jedelienne': [35.62, 8.94],
      'el ayoun': [35.40, 8.90],
      'hassi el ferid': [34.98, 8.96],
      'majel bel abbes': [34.70, 8.52],
      'tunis': [36.8065, 10.1815],
      'sousse': [35.8256, 10.6369],
      'sfax': [34.7406, 10.7603]
    };

    let latLng: [number, number] = [35.1676, 8.8306];
    if (coordinatesMap[delegation]) {
      latLng = coordinatesMap[delegation];
    } else if (coordinatesMap[governorate]) {
      latLng = coordinatesMap[governorate];
    }

    this.profile.lat = latLng[0];
    this.profile.lng = latLng[1];
    this.map.setView(latLng, 12);
    this.marker.setLatLng(latLng);
    this.cdr.markForCheck();
  }

  saveProfile() {
    this.saving = true;
    this.cdr.markForCheck();
    const dto = {
      name: this.profile.name,
      phone: this.profile.phone,
      governorate: this.profile.governorate,
      delegation: this.profile.delegation,
      lat: this.profile.lat ? parseFloat(this.profile.lat) : null,
      lng: this.profile.lng ? parseFloat(this.profile.lng) : null
    };

    this.http.patch(`${environment.apiUrl}/supplier/vitrine/profile`, dto).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();
        alert('Profil mis à jour avec succès');
      },
      error: (err) => {
        this.saving = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Erreur lors de la mise à jour du profil.');
      }
    });
  }

  changePassword() {
    if (this.passwords.new !== this.passwords.confirm) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    alert('Fonctionnalité en cours de développement.');
  }

  deleteAccount() {
    if(confirm('Ceci supprimera définitivement votre compte, votre vitrine, et vos factures. Continuer ?')) {
      alert('Fonctionnalité en cours de développement.');
    }
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        this.profile.lat = parseFloat(pos.coords.latitude.toFixed(7));
        this.profile.lng = parseFloat(pos.coords.longitude.toFixed(7));
        if (this.map && this.marker) {
          const latLng = new L.LatLng(this.profile.lat, this.profile.lng);
          this.map.setView(latLng, 13);
          this.marker.setLatLng(latLng);
        }
        this.cdr.markForCheck();
      });
    }
  }
}
