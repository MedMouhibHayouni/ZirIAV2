import {  Component, inject, OnInit, OnDestroy, signal, computed, effect , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMapPin, lucideCalendar, lucideDollarSign, lucideDroplets,
  lucideChevronRight, lucidePlus, lucideTrash2, lucideCheckCircle,
  lucideGavel, lucideClock, lucideActivity, lucideArrowUp,
  lucideEye, lucideRefreshCw, lucideFlame, lucideLeaf,
} from '@ng-icons/lucide';
import { LandApiService, LandListing, LandAuction, CreateListingDto, CreateAuctionDto } from '../../../core/services/land-api.service';
import { SocketService, NewBidPayload } from '../../../core/services/socket.service';

type WizardStep = 1 | 2 | 3 | 4 | 5;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-land-owner-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideMapPin, lucideCalendar, lucideDollarSign, lucideDroplets,
    lucideChevronRight, lucidePlus, lucideTrash2, lucideCheckCircle,
    lucideGavel, lucideClock, lucideActivity, lucideArrowUp,
    lucideEye, lucideRefreshCw, lucideFlame, lucideLeaf,
  
})],
  templateUrl: './land-owner-dashboard.component.html',
})
export class LandOwnerDashboardComponent implements OnInit, OnDestroy {
  public readonly api    = inject(LandApiService);
  public readonly socket = inject(SocketService);
  private readonly fb    = inject(FormBuilder);

  // ── State ──────────────────────────────────────────────────────────────
  readonly listings    = signal<LandListing[]>([]);
  readonly auctions    = signal<LandAuction[]>([]);
  readonly isLoading   = signal(false);
  readonly activeView  = signal<'listings' | 'auction-wizard' | 'auction-live'>('listings');

  // ── Auction wizard ──────────────────────────────────────────────────────
  wizardStep = signal<WizardStep>(1);
  wizardData = {
    parcel_id:            '',
    reserve_price_secret: 0,
    min_increment:        50,
    end_at:               '',
    auto_extend_minutes:  5,
    aiEstimate:           0,    // fetched in step 2
    documentsUploaded:    false,
  };

  // ── Live auction tracking ───────────────────────────────────────────────
  watchedAuction = signal<LandAuction | null>(null);
  /** Bid history for the sparkline chart */
  bidHistory = signal<{ amount: number; time: string }[]>([]);

  // ── Computed ───────────────────────────────────────────────────────────
  readonly activeAuctions = computed(() => this.auctions().filter(a => a.status === 'ACTIVE'));
  readonly totalListingValue = computed(() =>
    this.listings().reduce((sum, l) => sum + (l.price_per_ha * l.surface_ha), 0)
  );

  // Bid sparkline SVG path (simplified polyline from bidHistory)
  readonly sparklinePath = computed(() => {
    const bids = this.bidHistory();
    if (bids.length < 2) return '';
    const w = 240, h = 60;
    const min = Math.min(...bids.map(b => b.amount));
    const max = Math.max(...bids.map(b => b.amount)) + 1;
    return bids.map((b, i) => {
      const x = (i / (bids.length - 1)) * w;
      const y = h - ((b.amount - min) / (max - min)) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  private _lastBidSeen: unknown = null;

  constructor() {
    // Reactive: only runs when latestBid signal actually changes (no 1s polling)
    effect(() => {
      const bid = this.socket.latestBid() as any;
      if (!bid || bid === this._lastBidSeen) return;
      this._lastBidSeen = bid;
      const watched = this.watchedAuction();
      if (!watched || bid.auction_id !== watched.id) return;

      this.bidHistory.update(list => [
        ...list,
        { amount: bid.amount, time: new Date().toLocaleTimeString() }
      ].slice(-30)); // keep last 30 bids

      this.watchedAuction.update(a => a ? { ...a, current_bid: bid.amount, bid_count: bid.bid_count } : a);
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    // effect() auto-disposes with component; nothing to clear (no interval leak)
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.api.getMyListings().subscribe({
      next: l => this.listings.set(l),
      complete: () => this.isLoading.set(false),
    });
    this.api.getAuctions().subscribe({
      next: a => this.auctions.set(a),
    });
  }

  // ── Wizard navigation ──────────────────────────────────────────────────
  goWizardStep(step: WizardStep): void {
    // Simulate AI valuation in step 2
    if (step === 2 && this.wizardData.parcel_id) {
      this.wizardData.aiEstimate = Math.round(3800 + Math.random() * 2200);
    }
    this.wizardStep.set(step);
  }

  submitAuction(): void {
    const dto: CreateAuctionDto = {
      parcel_id:            this.wizardData.parcel_id,
      reserve_price_secret: this.wizardData.reserve_price_secret,
      min_increment:        this.wizardData.min_increment,
      end_at:               this.wizardData.end_at,
      auto_extend_minutes:  this.wizardData.auto_extend_minutes,
    };
    this.api.createAuction(dto).subscribe({
      next: auction => {
        this.auctions.update(list => [auction, ...list]);
        this.activeView.set('listings');
        this.wizardStep.set(1);
      },
    });
  }

  watchAuction(auction: LandAuction): void {
    this.watchedAuction.set(auction);
    this.bidHistory.set([]);
    this.api.getAuctionBids(auction.id).subscribe({
      next: bids => {
        this.bidHistory.set(bids.map(b => ({
          amount: b.amount,
          time: new Date(b.created_at).toLocaleTimeString(),
        })));
      },
    });
    this.activeView.set('auction-live');
  }

  deleteListing(id: string): void {
    if (!confirm('Supprimer cette annonce ?')) return;
    this.api.deleteListing(id).subscribe({
      next: () => this.listings.update(l => l.filter(x => x.id !== id)),
    });
  }

  readonly statusBadge: Record<string, string> = {
    ACTIVE:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    UNDER_OFFER: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    CLOSED:      'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };

  readonly auctionStatusBadge: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    ACTIVE:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse',
    ENDED:     'bg-slate-500/10 text-slate-500 border-slate-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  readonly governorates = ['Tunis', 'Sfax', 'Sousse', 'Kasserine', 'Kairouan', 'Gafsa', 'Sidi Bouzid', 'Béja', 'Jendouba', 'Siliana'];
  readonly soilTypes = ['Argileux', 'Limoneux', 'Sableux', 'Calcaire', 'Volcanique'];
  readonly waterOptions = ['Puits', 'Canal', 'Forage', 'Pluvial', 'Aucun'];

  protected readonly Math = Math;
}
