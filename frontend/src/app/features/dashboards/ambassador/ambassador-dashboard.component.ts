import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle, lucideCamera, lucideSend, lucideHandshake,
  lucideMicroscope, lucideShoppingCart, lucideBell, lucideFileText, lucideWheat, lucideRss,
  lucideUsers, lucideLoader, lucideMapPin, lucideActivity
} from '@ng-icons/lucide';

interface AmbassadorStats {
  diagnostics_submitted: number;
  listings_created: number;
  reports_submitted: number;
  period: string;
}

interface NearbyFarmer {
  id: string;
  name: string;
  governorate: string;
  role: string;
  verified: boolean;
}

const PROBLEM_TYPES = [
  'Maladie de culture','Ravageur / Insecte','Stress hydrique','Dégâts climatiques',
  'Manque d\'accès eau','Problème de sol','Panne matériel','Besoin de main-d\'œuvre',
  'Conflit foncier','Autre problème',
];

const GOVERNORATES = ['Tunis','Sfax','Sousse','Kairouan','Gafsa','Gabès','Béja','Jendouba','Nabeul','Bizerte','Kasserine','Sidi Bouzid','Médenine','Monastir','Mahdia','Kef','Siliana','Tozeur','Kébili','Tataouine','Ariana','Manouba','Ben Arous','Zaghouan'];

@Component({
  selector: 'app-ambassador-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ 
    lucideUsers, lucideLoader, lucideMapPin, lucideActivity, lucideAlertTriangle, 
    lucideCamera, lucideSend, lucideHandshake, lucideMicroscope, lucideShoppingCart, 
    lucideBell, lucideFileText, lucideWheat, lucideRss
  })],
  templateUrl: './ambassador-dashboard.component.html',
  styleUrls: ['./ambassador-dashboard.component.scss'],
})
export class AmbassadorDashboardComponent implements OnInit {
  private http = inject(HttpClient);

  stats = signal<AmbassadorStats | null>(null);
  nearbyFarmers = signal<NearbyFarmer[]>([]);
  isLoadingStats = signal(true);
  isLoadingFarmers = signal(false);
  isSubmittingReport = signal(false);
  geoError = signal('');

  activeTab = signal<'activity' | 'neighbors' | 'report'>('activity');

  reportForm = {
    problem_type: '',
    description: '',
    governorate: '',
    lat: 0,
    lng: 0,
    photo_url: '',
  };

  readonly problemTypes = PROBLEM_TYPES;
  readonly governorates = GOVERNORATES;

  ngOnInit() { this.loadStats(); }

  loadStats() {
    this.isLoadingStats.set(true);
    this.http.get<AmbassadorStats>(`${environment.apiUrl}/ambassador/my-stats`).subscribe({
      next: (s) => { this.stats.set(s); this.isLoadingStats.set(false); },
      error: () => this.isLoadingStats.set(false),
    });
  }

  locateAndLoadFarmers() {
    this.isLoadingFarmers.set(true);
    this.geoError.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.reportForm.lat = lat;
        this.reportForm.lng = lng;
        this.http.get<NearbyFarmer[]>(`${environment.apiUrl}/users/nearby-farmers?lat=${lat}&lng=${lng}&radius_km=15`).subscribe({
          next: (farmers) => { this.nearbyFarmers.set(farmers); this.isLoadingFarmers.set(false); },
          error: () => this.isLoadingFarmers.set(false),
        });
      },
      (err) => {
        this.geoError.set('Localisation refusée. Veuillez activer le GPS.');
        this.isLoadingFarmers.set(false);
      }
    );
  }

  submitReport() {
    if (!this.reportForm.problem_type || !this.reportForm.description || !this.reportForm.governorate) return;
    this.isSubmittingReport.set(true);
    this.http.post(`${environment.apiUrl}/ambassador/reports`, this.reportForm).subscribe({
      next: () => {
        this.isSubmittingReport.set(false);
        this.resetReport();
        alert('Signalement soumis avec succès. Les experts ont été notifiés.');
        this.loadStats();
      },
      error: () => this.isSubmittingReport.set(false),
    });
  }

  resetReport() {
    this.reportForm = { problem_type: '', description: '', governorate: '', lat: this.reportForm.lat, lng: this.reportForm.lng, photo_url: '' };
  }
}
