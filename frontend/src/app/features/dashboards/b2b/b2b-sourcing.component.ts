import {
  Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideFilter, lucideStar, lucideMapPin, lucidePackage,
  lucideTrendingUp, lucideLoader, lucideXCircle, lucideSend, lucideWeight, lucideBanknote,
  lucideHandshake, lucideCalendar,
} from '@ng-icons/lucide';

interface MarketplaceListing {
  id: string;
  crop_type: string;
  quantity_tonnes: number;
  price_per_kg: number;
  governorate: string;
  seller_name?: string;
  seller_rating?: number;
  harvest_date?: string;
  gdd_days_remaining?: number;
  description?: string;
}

interface InterestForm {
  listing: MarketplaceListing | null;
  proposed_price_per_kg: number;
  quantity_tonnes: number;
  delivery_deadline: string;
  message: string;
}

const CROPS = ['Tomate','Pomme de terre','Blé dur','Orge','Olive','Agrumes','Piment','Melon','Pastèque','Courgette','Pêche','Amande'];
const GOVERNORATES = ['Tunis','Sfax','Sousse','Kairouan','Gafsa','Gabès','Béja','Jendouba','Nabeul','Bizerte','Kasserine','Sidi Bouzid','Médenine','Monastir','Mahdia','Kef','Siliana','Tozeur','Kébili','Tataouine','Ariana','Manouba','Ben Arous','Zaghouan'];

@Component({
  selector: 'app-b2b-sourcing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideSearch, lucideFilter, lucideStar, lucideMapPin, lucidePackage, 
    lucideTrendingUp, lucideLoader, lucideXCircle, lucideSend, lucideWeight, lucideBanknote,
    lucideHandshake, lucideCalendar
  })],
  templateUrl: './b2b-sourcing.component.html',
  styleUrl: './b2b-sourcing.component.scss',
})
export class B2bSourcingComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private debounceTimer: any;

  listings = signal<MarketplaceListing[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showInterestModal = false;

  filterCrop = '';
  filterGovernorate = '';
  filterMinQty = 0;
  filterMaxPrice = 0;

  interest: InterestForm = { listing: null, proposed_price_per_kg: 0, quantity_tonnes: 0, delivery_deadline: '', message: '' };

  readonly crops = CROPS;
  readonly governorates = GOVERNORATES;

  ngOnInit() { this.loadListings(); }
  ngOnDestroy() { if (this.debounceTimer) clearTimeout(this.debounceTimer); }

  onFilterChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.loadListings(), 400);
  }

  loadListings() {
    this.isLoading.set(true);
    const params = new URLSearchParams({ limit: '40' });
    if (this.filterCrop) params.set('crop_type', this.filterCrop);
    if (this.filterGovernorate) params.set('governorate', this.filterGovernorate);
    if (this.filterMinQty > 0) params.set('min_qty', String(this.filterMinQty));
    if (this.filterMaxPrice > 0) params.set('max_price', String(this.filterMaxPrice));
    this.http.get<MarketplaceListing[]>(`${environment.apiUrl}/marketplace/listings/search?${params}`).subscribe({
      next: (data) => {
        // Handle both array and paginated response shapes
        const list = Array.isArray(data) ? data : ((data as any)?.items || []);
        this.listings.set(Array.isArray(list) ? list : []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openInterestModal(listing: MarketplaceListing) {
    this.interest = {
      listing,
      proposed_price_per_kg: listing.price_per_kg,
      quantity_tonnes: Math.min(1, listing.quantity_tonnes),
      delivery_deadline: '',
      message: '',
    };
    this.showInterestModal = true;
  }

  submitInterest() {
    if (!this.interest.listing) return;
    this.isSubmitting.set(true);
    // Use the correct endpoint: POST /marketplace/:id/interest
    this.http.post(`${environment.apiUrl}/marketplace/${this.interest.listing.id}/interest`, {
      proposed_price_per_kg: this.interest.proposed_price_per_kg,
      quantity_tonnes: this.interest.quantity_tonnes,
      delivery_deadline: this.interest.delivery_deadline,
      message: this.interest.message,
    }).subscribe({
      next: () => {
        this.showInterestModal = false;
        this.isSubmitting.set(false);
        this.listings.update(l => l.filter(x => x.id !== this.interest.listing!.id));
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  getRatingStars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
