import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideMapPin, lucidePhone, lucideMail, lucideMessageCircle,
  lucideX, lucideChevronLeft, lucideChevronRight, lucideTag, lucideSprout,
  lucideLeaf, lucideTractor, lucidePackage, lucideWheat, lucideFlame,
  lucideShoppingCart, lucideUser, lucideCalendar, lucideArrowRight,
  lucideCheck, lucideSend, lucideLoader, lucideFilter, lucideRefreshCw,
  lucideLandmark, lucideGrid3X3, lucideDroplets, lucideHotel,
  lucideSlidersHorizontal, lucideArrowUpDown, lucideCoins, lucideMenu
} from '@ng-icons/lucide';
import { MarketplaceService, PublicListing, ListingCategory } from '../../core/services/marketplace.service';
import { AuthService } from '../../core/services/auth.service';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import { Subscription } from 'rxjs';

interface CategoryFilter {
  key: ListingCategory | 'ALL';
  label: string;
  icon: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-public-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent, PublicNavbarComponent],
  providers: [provideIcons({
    lucideSearch, lucideMapPin, lucidePhone, lucideMail, lucideMessageCircle,
    lucideX, lucideChevronLeft, lucideChevronRight, lucideTag, lucideSprout,
    lucideLeaf, lucideTractor, lucidePackage, lucideWheat, lucideFlame,
    lucideShoppingCart, lucideUser, lucideCalendar, lucideArrowRight,
    lucideCheck, lucideSend, lucideLoader, lucideFilter, lucideRefreshCw,
    lucideLandmark, lucideGrid3X3, lucideDroplets, lucideHotel,
    lucideSlidersHorizontal, lucideArrowUpDown, lucideCoins, lucideMenu
  })],
  templateUrl: './public-marketplace.component.html',
  styleUrl: './public-marketplace.component.scss'
})
export class PublicMarketplaceComponent implements OnInit, OnDestroy {
  private marketplaceService = inject(MarketplaceService);
  public auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ─── State ────────────────────────────────────────────────────────────────
  listings = signal<PublicListing[]>([]);
  isLoading = signal(true);
  totalListings = signal(0);
  currentPage = signal(1);
  hasNext = signal(false);
  // Filters State (reactive and linked to URL query parameters)
  searchQuery = signal('');
  locationQuery = signal('');
  activeCategory = signal<ListingCategory | 'ALL'>('ALL');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  priceOnRequest = signal<boolean | null>(null);
  sortBy = signal<string>('date_desc');
  showMobileFilters = signal<boolean>(false);

  selectedListing = signal<PublicListing | null>(null);
  selectedPhotoIndex = signal(0);

  // Inquiry form state
  inquiryMode = signal<'NONE' | 'FORM' | 'CHAT'>('NONE');
  inquiryName = signal('');
  inquiryEmail = signal('');
  inquiryPhone = signal('');
  inquiryMessage = signal('');
  inquiryLoading = signal(false);
  inquirySuccess = signal(false);

  // Chat state (authenticated)
  chatMessages = signal<any[]>([]);
  chatInput = signal('');
  chatLoading = signal(false);

  // ─── Category Config (Emoji-free) ───────────────────────────────────────────
  readonly categories: CategoryFilter[] = [
    { key: 'ALL',          label: 'Tout les produits', icon: 'lucideGrid3X3' },
    { key: 'FRESH_PRODUCE',label: 'Produits frais',    icon: 'lucideLeaf' },
    { key: 'LIVESTOCK',    label: 'Élevage & Bétail',  icon: 'lucideSprout' },
    { key: 'FORAGE_FEED',  label: 'Fourrage & Aliment',icon: 'lucideWheat' },
    { key: 'EQUIPMENT',    label: 'Équipements',       icon: 'lucideTractor' },
    { key: 'LAND',         label: 'Terres Agricoles',  icon: 'lucideLandmark' },
    { key: 'PROCESSED',    label: 'Produits transformés',icon: 'lucideFlame' },
    { key: 'SEEDS',        label: 'Semences & Bulbes', icon: 'lucidePackage' },
    { key: 'GENERAL',      label: 'Divers / Général',  icon: 'lucideShoppingCart' },
  ];

  private querySub?: Subscription;
  private searchDebounce: any;

  ngOnInit(): void {
    // Pre-fill from auth if available
    const user = this.auth.currentUser() as any;
    if (user) {
      this.inquiryName.set(user.name || '');
      this.inquiryEmail.set(user.email || '');
    }

    // Subscribe to URL query parameters for inside routing / bookmarks
    this.querySub = this.route.queryParams.subscribe(params => {
      if (params['category']) this.activeCategory.set(params['category'] as any);
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['location']) this.locationQuery.set(params['location']);
      if (params['minPrice']) this.minPrice.set(+params['minPrice']);
      if (params['maxPrice']) this.maxPrice.set(+params['maxPrice']);
      if (params['priceOnRequest'] !== undefined) {
        if (params['priceOnRequest'] === 'true') this.priceOnRequest.set(true);
        else if (params['priceOnRequest'] === 'false') this.priceOnRequest.set(false);
      }
      if (params['sortBy']) this.sortBy.set(params['sortBy']);
      if (params['page']) this.currentPage.set(+params['page']);

      this.loadListings();
    });
  }

  ngOnDestroy(): void {
    if (this.querySub) this.querySub.unsubscribe();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  updateUrlParams(): void {
    const queryParams: any = {};
    if (this.activeCategory() !== 'ALL') queryParams.category = this.activeCategory();
    if (this.searchQuery()) queryParams.search = this.searchQuery();
    if (this.locationQuery()) queryParams.location = this.locationQuery();
    if (this.minPrice() !== null) queryParams.minPrice = this.minPrice();
    if (this.maxPrice() !== null) queryParams.maxPrice = this.maxPrice();
    if (this.priceOnRequest() !== null) queryParams.priceOnRequest = String(this.priceOnRequest());
    if (this.sortBy() !== 'date_desc') queryParams.sortBy = this.sortBy();
    if (this.currentPage() > 1) queryParams.page = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  loadListings(): void {
    this.isLoading.set(true);

    const cat = this.activeCategory();
    this.marketplaceService.fetchPublicListings({
      category: cat === 'ALL' ? undefined : cat,
      search: this.searchQuery() || undefined,
      location: this.locationQuery() || undefined,
      minPrice: this.minPrice() ?? undefined,
      maxPrice: this.maxPrice() ?? undefined,
      priceOnRequest: this.priceOnRequest() ?? undefined,
      sortBy: this.sortBy(),
      page: this.currentPage(),
      limit: 15, // standard e-commerce grid size
    }).subscribe({
      next: (res) => {
        this.listings.set(res.items);
        this.totalListings.set(res.total);
        this.hasNext.set(res.hasNext);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange(resetPage = true): void {
    if (resetPage) this.currentPage.set(1);
    this.updateUrlParams();
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.onFilterChange(true), 400);
  }

  setCategory(cat: ListingCategory | 'ALL'): void {
    this.activeCategory.set(cat);
    this.onFilterChange(true);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.locationQuery.set('');
    this.activeCategory.set('ALL');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.priceOnRequest.set(null);
    this.sortBy.set('date_desc');
    this.currentPage.set(1);
    this.updateUrlParams();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.updateUrlParams();
  }

  prevPage(): void {
    this.currentPage.update(p => Math.max(1, p - 1));
    this.updateUrlParams();
  }

  openListing(listing: PublicListing): void {
    this.selectedListing.set(listing);
    this.selectedPhotoIndex.set(0);
    this.inquiryMode.set('NONE');
    this.inquirySuccess.set(false);
    document.body.style.overflow = 'hidden';
  }

  closeListing(): void {
    this.selectedListing.set(null);
    this.inquiryMode.set('NONE');
    document.body.style.overflow = '';
  }

  nextPhoto(): void {
    const listing = this.selectedListing();
    if (!listing) return;
    const len = this.getPhotoUrls(listing).length;
    if (!len) return;
    this.selectedPhotoIndex.update(i => (i + 1) % len);
  }

  prevPhoto(): void {
    const listing = this.selectedListing();
    if (!listing) return;
    const len = this.getPhotoUrls(listing).length;
    if (!len) return;
    this.selectedPhotoIndex.update(i => (i - 1 + len) % len);
  }

  openContact(): void {
    if (this.auth.isAuthenticated()) {
      this.inquiryMode.set('CHAT');
      this.loadChatThread();
    } else {
      this.inquiryMode.set('FORM');
    }
  }

  loadChatThread(): void {
    const listing = this.selectedListing();
    if (!listing) return;
    this.chatLoading.set(true);
    this.marketplaceService.getThread(listing.seller_id).subscribe({
      next: (msgs: any[]) => {
        this.chatMessages.set(msgs);
        this.chatLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.chatLoading.set(false)
    });
  }

  sendChatMessage(): void {
    const listing = this.selectedListing();
    const content = this.chatInput().trim();
    if (!listing || !content) return;

    this.marketplaceService.sendMessage(listing.seller_id, content).subscribe({
      next: (msg: any) => {
        this.chatMessages.update(msgs => [...msgs, msg]);
        this.chatInput.set('');
        this.cdr.markForCheck();
      }
    });
  }

  submitInquiry(): void {
    const listing = this.selectedListing();
    if (!listing || !this.inquiryName() || !this.inquiryEmail() || !this.inquiryMessage()) return;

    this.inquiryLoading.set(true);
    this.marketplaceService.submitInquiry({
      listing_id: listing.id,
      inquirer_name: this.inquiryName(),
      inquirer_email: this.inquiryEmail(),
      inquirer_phone: this.inquiryPhone() || undefined,
      message: this.inquiryMessage(),
    }).subscribe({
      next: () => {
        this.inquiryLoading.set(false);
        this.inquirySuccess.set(true);
        this.inquiryMessage.set('');
        this.cdr.markForCheck();
      },
      error: () => {
        this.inquiryLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  getCategoryLabel(cat: ListingCategory): string {
    return this.categories.find(c => c.key === cat)?.label ?? cat;
  }

  getCategoryIcon(cat: ListingCategory): string {
    return this.categories.find(c => c.key === cat)?.icon ?? 'lucidePackage';
  }

  displayTitle(listing: PublicListing): string {
    const title = listing.title?.trim();
    if (title) return title;
    const crop = listing.crop_type?.trim();
    if (crop) return crop;
    return 'Annonce agricole';
  }

  formatPrice(listing: PublicListing): string {
    if (listing.price_on_request) return 'Sur demande';
    if (listing.price_tnd == null) return 'Sur demande';
    const amount = Number(listing.price_tnd).toLocaleString('fr-TN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const unit = listing.quantity_unit?.trim();
    return unit ? `${amount} TND / ${unit}` : `${amount} TND`;
  }

  formatQuantity(listing: PublicListing): string {
    if (listing.quantity_value == null) return '';
    return `${Number(listing.quantity_value).toLocaleString('fr-TN')} ${listing.quantity_unit || ''}`.trim();
  }

  getPhotoUrls(listing: PublicListing): string[] {
    const raw = listing.photo_urls as string[] | string | null | undefined;
    if (!raw) return [];
    const urls = typeof raw === 'string'
      ? raw.split(',').map((u) => u.trim())
      : raw;
    return urls.filter((u) => u.length > 0 && /^https?:\/\//i.test(u));
  }

  onCardImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const wrap = img.closest('.card-photo');
    wrap?.classList.add('card-photo--fallback');
  }

  get currentUser(): any {
    return this.auth.currentUser();
  }
}
