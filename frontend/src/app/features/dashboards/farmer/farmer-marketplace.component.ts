import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShoppingCart, lucideTag, lucideClock, lucideCheckCircle,
  lucidePlusCircle, lucideArrowRight, lucideXCircle, lucideLoader, lucideHandshake,
  lucideSearch, lucideMapPin, lucidePackage, lucideSend, lucideX,
  lucideTrendingUp, lucideFilter, lucideRefreshCw, lucideLeaf, lucideMic,
  lucideSparkles, lucideImage, lucideTrash2, lucideInfo, lucideCheck,
  lucideMessageCircle, lucideUser, lucidePhone, lucideMail,
  lucideStar, lucideArrowUp, lucideArrowDown, lucideVideo, lucidePlay
} from '@ng-icons/lucide';
import { MarketplaceService, ListingCategory } from '../../../core/services/marketplace.service';
import { FarmerApiService, FarmerParcel } from '../../../core/services/farmer-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { environment } from '../../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideShoppingCart, lucideTag, lucideClock, lucideCheckCircle,
    lucidePlusCircle, lucideArrowRight, lucideXCircle, lucideLoader, lucideHandshake,
    lucideSearch, lucideMapPin, lucidePackage, lucideSend, lucideX,
    lucideTrendingUp, lucideFilter, lucideRefreshCw, lucideLeaf, lucideMic,
    lucideSparkles, lucideImage, lucideTrash2, lucideInfo, lucideCheck,
    lucideMessageCircle, lucideUser, lucidePhone, lucideMail,
    lucideStar, lucideArrowUp, lucideArrowDown, lucideVideo, lucidePlay
  })],
  templateUrl: './farmer-marketplace.component.html',
  styleUrl: './farmer-marketplace.component.scss'
})
export class FarmerMarketplaceComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  private farmerApi = inject(FarmerApiService);
  public auth = inject(AuthService);
  private notifs = inject(NotificationStore);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'BROWSE' | 'MY_LISTINGS' | 'B2B_REQUESTS' | 'CREATE'>('BROWSE');

  // Browse state
  browseListings = signal<any[]>([]);
  isBrowseLoading = signal(true);
  browseSearch = signal('');
  private _searchDebounce: any = null;
  activeGovernorate = signal<string>('');
  sentRequests = signal<Set<string>>(new Set());

  // B2B Contact drawer
  drawerOpen = signal(false);
  drawerListing = signal<any | null>(null);
  drawerMessage = signal('');
  drawerQuantity = signal(1);
  isSendingRequest = signal(false);
  showSuccessToast = signal(false);

  // My listings & connections state
  myListings = signal<any[]>([]);
  connections = signal<any[]>([]);
  parcels = signal<FarmerParcel[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);

  // ZirPulse Autofill sources
  zirpulsePosts = signal<any[]>([]);
  isLoadingPulse = signal(false);
  showPulseAutofillModal = signal(false);

  // Edit modal state
  editModalOpen = signal(false);
  editingListing = signal<any | null>(null);
  isSavingEdit = signal(false);
  // Edit form fields (separate from create form)
  editTitle = '';
  editDescription = '';
  editQuantityValue = 0;
  editQuantityUnit = '';
  editPriceTnd = 0;
  editPriceOnRequest = false;
  editContactPhone = '';
  editContactEmail = '';
  editLocationLabel = '';
  editFloralOrigin = '';
  editSanitaryCert = false;
  editBreedingMethod = '';
  editTraceabilityRefId = '';

  // Overhauled Form State
  formCategory = signal<ListingCategory>('FRESH_PRODUCE');
  formTitle = '';
  formDescription = '';
  formCropType = '';
  formQuantityValue = 1;
  formQuantityUnit = 'tonnes';
  formPriceTnd = 0;
  formPriceOnRequest = false;
  formLocationLabel = '';
  formContactPhone = '';
  formContactEmail = '';

  // Category specific fields
  formLivestockType = '';
  formEquipmentCondition: 'NEW' | 'USED' = 'USED';
  formLandSizeHa = 0;
  formLandWaterAccess = false;
  formLandSoilType = '';
  formLandOpenForBidding = false;
  formLinkedToStock = false;
  formParcelId = '';
  formFloralOrigin = '';
  formSanitaryCert = false;
  formBreedingMethod = '';
  formTraceabilityRefId = '';

  // Sprint 6 Media Management & Quality Score
  selectedMedia = signal<{ file: File; preview: string; type: 'photo' | 'video'; position: number }[]>([]);

  formQualityScore = computed(() => {
    let score = 0;
    const media = this.selectedMedia();
    const photos = media.filter((m) => m.type === 'photo');
    const videos = media.filter((m) => m.type === 'video');

    if (photos.length >= 1) score += 20;
    if (photos.length >= 3) score += 15;
    if (videos.length >= 1) score += 10;
    if (this.formDescription && this.formDescription.length > 100) score += 20;
    if (this.formPriceTnd > 0 || this.formPriceOnRequest) score += 10;
    if (this.formParcelId) score += 10;
    if (this.formCategory() === 'FRESH_PRODUCE') score += 10;
    if (this.formContactPhone) score += 5;

    return Math.min(100, score);
  });

  formQualityTier = computed(() => {
    const s = this.formQualityScore();
    if (s < 40) return { label: 'Insuffisant', color: '#ef4444' };
    if (s < 70) return { label: 'Basique', color: '#f97316' };
    if (s < 90) return { label: 'Bon', color: '#3b82f6' };
    return { label: 'Excellent', color: '#22c55e' };
  });

  formChecklist = computed(() => {
    const media = this.selectedMedia();
    const photos = media.filter((m) => m.type === 'photo');
    const videos = media.filter((m) => m.type === 'video');
    return [
      { text: 'Au moins 1 photo (+20)', met: photos.length >= 1, points: 20 },
      { text: 'Au moins 3 photos (+15)', met: photos.length >= 3, points: 15 },
      { text: 'Une vidéo de présentation (+10)', met: videos.length >= 1, points: 10 },
      { text: 'Description > 100 caractères (+20)', met: !!(this.formDescription && this.formDescription.length > 100), points: 20 },
      { text: 'Prix défini ou sur demande (+10)', met: this.formPriceTnd > 0 || this.formPriceOnRequest, points: 10 },
      { text: 'Parcelle liée pour traçabilité (+10)', met: !!this.formParcelId, points: 10 },
      { text: 'Date de récolte/disponibilité (+10)', met: this.formCategory() === 'FRESH_PRODUCE', points: 10 },
      { text: 'Téléphone de contact valide (+5)', met: !!this.formContactPhone, points: 5 }
    ];
  });

  // Edit Modal Media State
  editMedia = signal<any[]>([]);
  isUploadingEditMedia = signal(false);

  // Filter listings — uses pre-computed lowercase search key from enrichListing
  filteredBrowseListings = computed(() => {
    const q = this.browseSearch().trim().toLowerCase();
    if (!q) return this.browseListings();
    return this.browseListings().filter(l =>
      (l._displayTitle?.toLowerCase() || '').includes(q) ||
      (l.crop_type?.toLowerCase() || '').includes(q) ||
      (l.description?.toLowerCase() || '').includes(q) ||
      (l.seller_name?.toLowerCase() || '').includes(q) ||
      (l.location_label?.toLowerCase() || '').includes(q)
    );
  });

  onSearchInput(value: string) {
    clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => this.browseSearch.set(value), 200);
  }

  ngOnInit(): void {
    const user = this.auth.currentUser() as any;
    if (user) {
      const gov = user.governorate || '';
      this.activeGovernorate.set(gov);
      this.formContactPhone = user.phone || '';
      this.formContactEmail = user.email || '';
      this.formLocationLabel = gov ? `${gov}, Tunisie` : 'Tunisie';
    }
    this.loadBrowseListings();
    this.loadMyData();
    this.loadZirpulsePosts();
  }

  enrichListing(listing: any): any {
    if (!listing) return listing;
    return {
      ...listing,
      _displayTitle: this.displayTitle(listing),
      _photoUrls: this.getPhotoUrls(listing),
      _hasVideo: this.hasVideo(listing),
      _formattedPrice: this.formatPrice(listing),
      _formattedQuantity: this.formatQuantity(listing),
      _categoryLabel: this.getCategoryLabel(listing.category),
      _statusLabel: this.getStatusLabel(listing.status)
    };
  }

  loadBrowseListings(governorate?: string) {
    this.isBrowseLoading.set(true);
    const gov = governorate !== undefined ? governorate : this.activeGovernorate();
    
    // We load from public marketplace endpoint to ensure anyone (even internal dashboard) uses standard fetch
    this.marketplaceService.fetchPublicListings({
      location: gov || undefined,
      limit: 50
    }).subscribe({
      next: (res) => {
        const enriched = (res.items || []).map((l: any) => this.enrichListing(l));
        this.browseListings.set(enriched);
        this.isBrowseLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isBrowseLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  changeRegion(governorate: string) {
    this.activeGovernorate.set(governorate);
    this.loadBrowseListings(governorate);
  }

  clearRegionFilter() {
    this.activeGovernorate.set('');
    this.loadBrowseListings('');
  }

  isMyListing(listing: any): boolean {
    return listing.seller_id === this.auth.currentUser()?.id;
  }

  hasSentRequest(listingId: string): boolean {
    return this.sentRequests().has(listingId);
  }

  // B2B Contact drawer
  openContactDrawer(listing: any) {
    this.drawerListing.set(listing);
    this.drawerMessage.set(
      `Bonjour, je suis intéressé par votre annonce de "${listing.title || listing.crop_type}". Pouvez-vous confirmer la disponibilité ?`
    );
    this.drawerQuantity.set(listing.quantity_value || 1);
    this.drawerOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.drawerListing.set(null);
    document.body.style.overflow = '';
  }

  sendB2BRequest() {
    const listing = this.drawerListing();
    if (!listing || this.isSendingRequest()) return;

    this.isSendingRequest.set(true);
    this.marketplaceService.expressInterest(listing.id, {
      message: this.drawerMessage(),
      quantity_tonnes: this.drawerQuantity()
    }).subscribe({
      next: () => {
        this.isSendingRequest.set(false);
        const current = new Set(this.sentRequests());
        current.add(listing.id);
        this.sentRequests.set(current);
        this.showSuccessToast.set(true);
        setTimeout(() => this.showSuccessToast.set(false), 4000);
        this.closeDrawer();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSendingRequest.set(false);
        const msg = err?.error?.message || 'Erreur lors de l\'envoi de la demande.';
        this.notifs.showError(msg);
        this.cdr.markForCheck();
      }
    });
  }

  loadMyData() {
    this.isLoading.set(true);
    this.farmerApi.fetchParcels().subscribe(() => {
      this.parcels.set(this.farmerApi.parcels());
    });
    this.marketplaceService.getConnections().subscribe({
      next: (conns) => {
        const enriched = (conns || []).map((c: any) => ({
          ...c,
          listing: this.enrichListing(c.listing)
        }));
        this.connections.set(enriched);
        this.cdr.markForCheck();
      }
    });

    this.marketplaceService.fetchMyListings().subscribe({
      next: (items) => {
        const enriched = (items || []).map((l: any) => this.enrichListing(l));
        this.myListings.set(enriched);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.myListings.set([]);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  readonly categoryLabels: Record<ListingCategory, string> = {
    FRESH_PRODUCE: 'Produits frais',
    LIVESTOCK: 'Élevage & Bétail',
    FORAGE_FEED: 'Fourrage & Aliment',
    EQUIPMENT: 'Équipements',
    LAND: 'Terres agricoles',
    PROCESSED: 'Produits transformés',
    SEEDS: 'Semences & Bulbes',
    GENERAL: 'Divers / Général',
  };

  displayTitle(listing: any): string {
    return listing.title?.trim() || listing.crop_type?.trim() || 'Annonce agricole';
  }

  getPhotoUrls(listing: any): string[] {
    if (listing?.media_items && Array.isArray(listing.media_items)) {
      return listing.media_items.filter((m: any) => m.type === 'photo').map((m: any) => m.url);
    }
    const raw = listing?.photo_urls as string[] | string | null | undefined;
    if (!raw) return [];
    const urls = typeof raw === 'string' ? raw.split(',').map((u: string) => u.trim()) : raw;
    return urls.filter((u: string) => u.length > 0 && /^https?:\/\//i.test(u));
  }

  hasVideo(listing: any): boolean {
    if (listing?.media_items && Array.isArray(listing.media_items)) {
      return listing.media_items.some((m: any) => m.type === 'video');
    }
    return false;
  }

  formatPrice(listing: any): string {
    if (listing.price_on_request) return 'Sur demande';
    if (listing.price_tnd == null) return 'Sur demande';
    const amount = Number(listing.price_tnd).toLocaleString('fr-TN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const unit = listing.quantity_unit?.trim();
    return unit ? `${amount} TND / ${unit}` : `${amount} TND`;
  }

  formatQuantity(listing: any): string {
    if (listing.quantity_value == null) return '';
    return `${Number(listing.quantity_value).toLocaleString('fr-TN')} ${listing.quantity_unit || ''}`.trim();
  }

  getCategoryLabel(cat: ListingCategory): string {
    return this.categoryLabels[cat] || cat;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'En ligne';
      case 'SOLD': return 'Vendu';
      case 'INACTIVE':
      case 'CANCELLED': return 'Inactif';
      default: return status;
    }
  }

  onListingImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.closest('.fm-listing-card__photo')?.classList.add('fm-listing-card__photo--fallback');
  }

  // Load analyzed ZirPulse voice posts
  loadZirpulsePosts() {
    this.isLoadingPulse.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/zirpulse/posts/me`).subscribe({
      next: (posts) => {
        // Filter those with VENDRE intent
        const sellPosts = posts.filter(p => p.intent_json?.intent === 'VENDRE' || p.pre_filled_listing_dto);
        this.zirpulsePosts.set(sellPosts);
        this.isLoadingPulse.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingPulse.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  autofillFromPulse(post: any) {
    const dto = post.pre_filled_listing_dto || post.intent_json;
    if (!dto) return;

    this.formCategory.set('FRESH_PRODUCE');
    this.formTitle = `Lot de ${dto.crop_type || 'produit'} - Extrait par ZirPulse`;
    this.formCropType = dto.crop_type || '';
    this.formQuantityValue = dto.quantity_tonnes || dto.qty || 1;
    this.formQuantityUnit = 'tonnes';
    this.formPriceTnd = (dto.price_per_kg || 0) * (this.formQuantityValue * 1000);
    this.formPriceOnRequest = !dto.price_per_kg;
    this.formDescription = post.transcript ? `Annonce créée à partir de mon message vocal : "${post.transcript}"` : '';
    
    this.showPulseAutofillModal.set(false);
    this.notifs.showSuccess('Formulaire pré-rempli avec succès ! Révisez les détails et ajoutez des photos.');
    this.cdr.markForCheck();
  }

  // Sprint 6 Media Management
  onFileSelected(event: any) {
    const files = event.target.files;
    if (!files) return;

    const currentMedia = this.selectedMedia();
    let photosCount = currentMedia.filter(m => m.type === 'photo').length;
    let videosCount = currentMedia.filter(m => m.type === 'video').length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        if (videosCount >= 1) {
          this.notifs.showError('Maximum 1 vidéo autorisée.');
          continue;
        }
        videosCount++;
      } else {
        if (photosCount >= 5) {
          this.notifs.showError('Maximum 5 photos autorisées.');
          continue;
        }
        photosCount++;
      }

      if (currentMedia.length >= 8) {
        this.notifs.showError('Maximum 8 médias autorisés.');
        break;
      }

      const previewUrl = URL.createObjectURL(file);
      currentMedia.push({
        file,
        preview: previewUrl,
        type: isVideo ? 'video' : 'photo',
        position: currentMedia.length
      });
    }

    this.selectedMedia.set([...currentMedia]);
    this.cdr.markForCheck();
  }

  removePhoto(index: number) {
    const media = this.selectedMedia();
    media.splice(index, 1);
    // Normalize positions
    const updated = media.map((m, idx) => ({ ...m, position: idx }));
    this.selectedMedia.set(updated);
    this.cdr.markForCheck();
  }

  moveFormMediaUp(index: number) {
    if (index === 0) return;
    this.swapFormMedia(index, index - 1);
  }

  moveFormMediaDown(index: number) {
    const media = this.selectedMedia();
    if (index === media.length - 1) return;
    this.swapFormMedia(index, index + 1);
  }

  private swapFormMedia(idxA: number, idxB: number) {
    const media = [...this.selectedMedia()];
    const temp = media[idxA];
    media[idxA] = media[idxB];
    media[idxB] = temp;

    const updated = media.map((m, idx) => ({ ...m, position: idx }));
    this.selectedMedia.set(updated);
    this.cdr.markForCheck();
  }

  setFormPrimary(index: number) {
    if (index === 0) return;
    const media = [...this.selectedMedia()];
    const target = media.splice(index, 1)[0];
    media.unshift(target); // Move to position 0

    const updated = media.map((m, idx) => ({ ...m, position: idx }));
    this.selectedMedia.set(updated);
    this.cdr.markForCheck();
  }

  createListing() {
    if (!this.formTitle) {
      this.notifs.showError('Le titre est obligatoire.');
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('category', this.formCategory());
    formData.append('title', this.formTitle);
    formData.append('quantity_value', String(this.formQuantityValue));
    formData.append('quantity_unit', this.formQuantityUnit);
    formData.append('price_tnd', String(this.formPriceTnd));
    formData.append('price_on_request', String(this.formPriceOnRequest));
    formData.append('location_label', this.formLocationLabel);
    if (this.formContactPhone) {
      formData.append('contact_phone', this.formContactPhone);
    }
    if (this.formContactEmail) {
      formData.append('contact_email', this.formContactEmail);
    }
    formData.append('linked_to_stock', String(this.formLinkedToStock));
    if (this.formParcelId) {
      formData.append('parcel_id', this.formParcelId);
    }
    if (this.formCropType) {
      formData.append('crop_type', this.formCropType);
    }
    if (this.formDescription) {
      formData.append('description', this.formDescription);
    }

    // Livestock specific
    if (this.formCategory() === 'LIVESTOCK') {
      formData.append('livestock_type', this.formLivestockType);
    }
    // Equipment specific
    if (this.formCategory() === 'EQUIPMENT') {
      formData.append('equipment_condition', this.formEquipmentCondition);
    }
    // Land specific
    if (this.formCategory() === 'LAND') {
      formData.append('land_size_ha', String(this.formLandSizeHa));
      formData.append('land_water_access', String(this.formLandWaterAccess));
      formData.append('land_soil_type', this.formLandSoilType);
      formData.append('land_open_for_bidding', String(this.formLandOpenForBidding));
    }

    // Traceability specific (Sprint 5)
    if (this.formFloralOrigin) {
      formData.append('floral_origin', this.formFloralOrigin);
    }
    formData.append('sanitary_cert', String(this.formSanitaryCert));
    if (this.formBreedingMethod) {
      formData.append('breeding_method', this.formBreedingMethod);
    }
    if (this.formTraceabilityRefId) {
      formData.append('traceability_ref_id', this.formTraceabilityRefId);
    }

    // Append files in their normalized order
    this.selectedMedia().forEach((item) => {
      if (item.file) {
        formData.append('photos', item.file, item.file.name);
      }
    });

    this.marketplaceService.createListing(formData).subscribe({
      next: () => {
        this.notifs.showSuccess('Annonce publiée avec succès !');
        this.isSubmitting.set(false);
        this.resetForm();
        this.activeTab.set('MY_LISTINGS');
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Create listing error:', err);
        const errorMsg = err?.error?.message || err?.message || "Erreur lors de la publication de l'annonce.";
        this.notifs.showError(errorMsg);
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  resetForm() {
    this.formTitle = '';
    this.formDescription = '';
    this.formCropType = '';
    this.formQuantityValue = 1;
    this.formQuantityUnit = 'tonnes';
    this.formPriceTnd = 0;
    this.formPriceOnRequest = false;
    this.formFloralOrigin = '';
    this.formSanitaryCert = false;
    this.formBreedingMethod = '';
    this.formTraceabilityRefId = '';
    this.selectedMedia.set([]);
  }

  updateListingStatus(id: string, status: string) {
    this.marketplaceService.updateListingStatus(id, status).subscribe({
      next: () => {
        this.notifs.showSuccess(`Statut mis à jour : ${status}`);
        this.loadMyData();
      },
      error: (err: any) => {
        this.notifs.showError(err?.error?.message || 'Erreur de mise à jour.');
      }
    });
  }

  deleteListing(id: string) {
    if (confirm('Voulez-vous vraiment supprimer cette annonce ?')) {
      this.marketplaceService.deleteListing(id).subscribe({
        next: () => {
          this.notifs.showSuccess('Annonce supprimée.');
          this.loadMyData();
        },
        error: () => this.notifs.showError('Erreur lors de la suppression.')
      });
    }
  }

  respondConnection(connectionId: string, action: 'CONFIRM' | 'REJECT') {
    this.marketplaceService.respondToConnection(connectionId, action).subscribe({
      next: () => {
        this.notifs.showSuccess(`Demande ${action === 'CONFIRM' ? 'acceptée' : 'rejetée'}.`);
        this.loadMyData();
      },
      error: () => this.notifs.showError('Erreur lors de la réponse.')
    });
  }

  openEditModal(listing: any) {
    this.editingListing.set(listing);
    this.editTitle = listing.title || '';
    this.editDescription = listing.description || '';
    this.editQuantityValue = listing.quantity_value || 0;
    this.editQuantityUnit = listing.quantity_unit || 'tonnes';
    this.editPriceTnd = listing.price_tnd || 0;
    this.editPriceOnRequest = listing.price_on_request || false;
    this.editContactPhone = listing.contact_phone || '';
    this.editContactEmail = listing.contact_email || '';
    this.editLocationLabel = listing.location_label || '';
    this.editFloralOrigin = listing.floral_origin || '';
    this.editSanitaryCert = listing.sanitary_cert || false;
    this.editBreedingMethod = listing.breeding_method || '';
    this.editTraceabilityRefId = listing.traceability_ref_id || '';
    this.editMedia.set(listing.media_items || []);
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
    this.editingListing.set(null);
  }

  // Sprint 6: Edit Modal Media Mutators (Real-Time backend integration)
  onEditFileSelected(event: any, listingId: string) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.isUploadingEditMedia.set(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    this.marketplaceService.addMedia(listingId, formData).subscribe({
      next: (res) => {
        this.editMedia.set(res.media_items || []);
        this.isUploadingEditMedia.set(false);
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploadingEditMedia.set(false);
        this.notifs.showError(err?.error?.message || "Erreur de chargement du média.");
        this.cdr.markForCheck();
      }
    });
  }

  removeEditMedia(listingId: string, position: number) {
    this.marketplaceService.removeMedia(listingId, position).subscribe({
      next: (res) => {
        this.editMedia.set(res.media_items || []);
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || "Erreur lors de la suppression.");
      }
    });
  }

  setEditPrimary(listingId: string, position: number) {
    this.marketplaceService.setPrimary(listingId, position).subscribe({
      next: (res) => {
        this.editMedia.set(res.media_items || []);
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || "Erreur de définition de l'image principale.");
      }
    });
  }

  moveEditMediaUp(listingId: string, index: number) {
    if (index === 0) return;
    this.swapEditMedia(listingId, index, index - 1);
  }

  moveEditMediaDown(listingId: string, index: number) {
    if (index === this.editMedia().length - 1) return;
    this.swapEditMedia(listingId, index, index + 1);
  }

  private swapEditMedia(listingId: string, idxA: number, idxB: number) {
    const list = [...this.editMedia()];
    const temp = list[idxA];
    list[idxA] = list[idxB];
    list[idxB] = temp;

    const newOrder = list.map((item, idx) => ({
      url: item.url,
      position: idx
    }));

    this.marketplaceService.reorderMedia(listingId, newOrder).subscribe({
      next: (res) => {
        this.editMedia.set(res.media_items || []);
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || "Erreur de réorganisation.");
      }
    });
  }

  saveEdit() {
    const listing = this.editingListing();
    if (!listing) return;
    this.isSavingEdit.set(true);
    this.marketplaceService.updateListing(listing.id, {
      title: this.editTitle,
      description: this.editDescription,
      quantity_value: this.editQuantityValue,
      quantity_unit: this.editQuantityUnit,
      price_tnd: this.editPriceOnRequest ? null : this.editPriceTnd,
      price_on_request: this.editPriceOnRequest,
      contact_phone: this.editContactPhone,
      contact_email: this.editContactEmail,
      location_label: this.editLocationLabel,
      floral_origin: this.editFloralOrigin || null,
      sanitary_cert: this.editSanitaryCert,
      breeding_method: this.editBreedingMethod || null,
      traceability_ref_id: this.editTraceabilityRefId || null,
    }).subscribe({
      next: () => {
        this.notifs.showSuccess('Annonce mise à jour avec succès !');
        this.isSavingEdit.set(false);
        this.closeEditModal();
        this.loadMyData();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Erreur lors de la mise à jour.';
        this.notifs.showError(msg);
        this.isSavingEdit.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}
