import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideMapPin, lucidePhone, lucideMail, lucideGlobe, 
  lucideFacebook, lucideStar, lucideMessageCircle, lucideShoppingCart
} from '@ng-icons/lucide';
import { environment } from '../../../environments/environment';
import * as L from 'leaflet';

@Component({
  selector: 'app-supplier-vitrine-public',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideMapPin, lucidePhone, lucideMail, lucideGlobe, lucideFacebook, lucideStar, lucideMessageCircle, lucideShoppingCart })],
  templateUrl: './supplier-vitrine.component.html',
  styleUrls: ['./supplier-vitrine.component.scss']
})
export class SupplierVitrinePublicComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  
  @ViewChild('vitrineMap', { static: false }) vitrineMapContainer!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;

  supplierId: string = '';
  data: any = null;
  loading = true;
  error = false;

  activeTab: 'products' | 'about' | 'reviews' = 'products';

  // Review Form
  showReviewModal = false;
  newReview = { rating: 5, comment: '' };
  reviewSubmitting = false;

  ngOnInit() {
    this.supplierId = this.route.snapshot.paramMap.get('id') || '';
    if (this.supplierId) {
      this.loadVitrine();
    }
  }

  loadVitrine() {
    this.loading = true;
    this.cdr.markForCheck();
    
    const isPreview = this.route.snapshot.queryParamMap.get('preview') === 'true';
    const url = isPreview 
      ? `${environment.apiUrl}/supplier/vitrine/${this.supplierId}?preview=true`
      : `${environment.apiUrl}/supplier/vitrine/${this.supplierId}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.applyThemeColor();
        this.cdr.markForCheck();
        if (this.activeTab === 'about') {
          setTimeout(() => this.initAboutMap(), 100);
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      }
    });
  }

  applyThemeColor() {
    if (this.data?.supplier?.vitrine_theme_color) {
      // Set a CSS variable on the body or component for this specific vitrine
      document.documentElement.style.setProperty('--supplier-accent', this.data.supplier.vitrine_theme_color);
    } else {
      document.documentElement.style.setProperty('--supplier-accent', '#10B981'); // Fallback emerald
    }
  }

  submitReview() {
    if (!this.newReview.rating) return;
    this.reviewSubmitting = true;
    this.cdr.markForCheck();
    
    this.http.post(`${environment.apiUrl}/supplier/vitrine/${this.supplierId}/review`, this.newReview).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.showReviewModal = false;
        this.loadVitrine(); // reload to show new review and updated rating
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.reviewSubmitting = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Erreur lors de la soumission de l\'avis.');
      }
    });
  }
  
  switchTab(tab: 'products' | 'about' | 'reviews') {
    this.activeTab = tab;
    this.cdr.markForCheck();
    if (tab === 'about') {
      setTimeout(() => this.initAboutMap(), 100);
    }
  }

  initAboutMap() {
    if (!isPlatformBrowser(this.platformId) || !this.vitrineMapContainer) return;

    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 50);
      return;
    }

    const latLng = this.getCoordinates();
    
    L.Marker.prototype.options.icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    this.map = L.map(this.vitrineMapContainer.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView(latLng, 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const businessName = this.data?.supplier?.business_name || this.data?.supplier?.name || 'Vitrine';
    L.marker(latLng)
      .addTo(this.map)
      .bindPopup(`<b>${businessName}</b><br>${this.data?.supplier?.delegation ? this.data?.supplier?.delegation + ', ' : ''}${this.data?.supplier?.governorate}`)
      .openPopup();
  }

  getCoordinates(): [number, number] {
    const delegation = (this.data?.supplier?.delegation || '').toLowerCase().trim();
    const governorate = (this.data?.supplier?.governorate || '').toLowerCase().trim();

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

    if (coordinatesMap[delegation]) return coordinatesMap[delegation];
    if (coordinatesMap[governorate]) return coordinatesMap[governorate];
    return [35.1676, 8.8306];
  }

  toggleReviewModal(show: boolean) {
    this.showReviewModal = show;
    this.cdr.markForCheck();
  }
}
