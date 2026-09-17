import {
  Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideHome, lucideLoader, lucideGavel, lucideTrendingUp, lucideCheckCircle,
  lucideXCircle, lucideClock, lucideMessageSquare, lucidePlus, lucideHelpCircle, lucideTrophy
} from '@ng-icons/lucide';

interface OwnerStats {
  active_listings: number;
  total_listings: number;
  active_auctions: number;
  best_offer_tnd: number;
  total_bids_received: number;
}

interface LandAuction {
  id: string;
  title?: string;
  reserve_price_secret: number;
  end_at: string;
  status: string;
  min_increment: number;
  landListing?: { surface_ha: number; governorate: string; listing_type: string };
  bids?: { id: string; amount_tnd: number; created_at: string; user?: { name: string } }[];
  questions?: { id: string; question: string; answer?: string; created_at: string; _answer?: string; _saving?: boolean }[];
  countdown?: string;
  _accepting?: boolean;
  _cancelling?: boolean;
  _loadingBids?: boolean;
  _loadingQa?: boolean;
  _expanded?: boolean;
}

@Component({
  selector: 'app-land-owner-auctions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucideHome, lucideLoader, lucideGavel, lucideTrendingUp, lucideCheckCircle, lucideXCircle, lucideClock, lucideMessageSquare, lucidePlus, lucideHelpCircle, lucideTrophy })],
  templateUrl: './land-owner-auctions.component.html',
  styleUrls: ['./land-owner-auctions.component.scss'],
})
export class LandOwnerAuctionsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private countdownInterval: any;

  stats = signal<OwnerStats | null>(null);
  auctions = signal<LandAuction[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.load();
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngOnDestroy() { if (this.countdownInterval) clearInterval(this.countdownInterval); }

  load() {
    this.isLoading.set(true);
    Promise.all([
      this.http.get<OwnerStats>(`${environment.apiUrl}/land/my-stats`).toPromise().catch(() => null),
      this.http.get<LandAuction[]>(`${environment.apiUrl}/land/auctions?my=true`).toPromise().catch(() => []),
    ]).then(([stats, auctions]) => {
      if (stats) this.stats.set(stats);
      this.auctions.set((auctions ?? []) as LandAuction[]);
      this.isLoading.set(false);
    });
  }

  updateCountdowns() {
    const now = new Date().getTime();
    this.auctions.update(list => list.map(a => {
      const end = new Date(a.end_at).getTime();
      const diff = end - now;
      if (diff <= 0) return { ...a, countdown: 'Terminé' };
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { ...a, countdown: `${d}j ${h}h ${m}m ${s}s` };
    }));
  }

  toggleAuction(auction: LandAuction) {
    auction._expanded = !auction._expanded;
    if (auction._expanded && !auction.bids) this.loadBids(auction);
    if (auction._expanded && !auction.questions) this.loadQa(auction);
  }

  loadBids(auction: LandAuction) {
    auction._loadingBids = true;
    this.http.get<any[]>(`${environment.apiUrl}/land/auctions/${auction.id}/bids`).subscribe({
      next: (bids) => { auction.bids = bids; auction._loadingBids = false; },
      error: () => { auction.bids = []; auction._loadingBids = false; },
    });
  }

  loadQa(auction: LandAuction) {
    auction._loadingQa = true;
    this.http.get<any[]>(`${environment.apiUrl}/land/auctions/${auction.id}/questions`).subscribe({
      next: (qs) => { auction.questions = qs.map(q => ({ ...q, _answer: q.answer ?? '' })); auction._loadingQa = false; },
      error: () => { auction.questions = []; auction._loadingQa = false; },
    });
  }

  acceptBid(auction: LandAuction) {
    if (!confirm('Accepter la meilleure offre ? Cette action est irréversible.')) return;
    auction._accepting = true;
    this.http.post(`${environment.apiUrl}/land/auctions/${auction.id}/accept-bid`, {}).subscribe({
      next: () => { auction.status = 'ENDED'; auction._accepting = false; },
      error: () => { auction._accepting = false; },
    });
  }

  cancelAuction(auction: LandAuction) {
    if (!confirm('Annuler cette enchère ?')) return;
    auction._cancelling = true;
    this.http.post(`${environment.apiUrl}/land/auctions/${auction.id}/cancel`, {}).subscribe({
      next: () => { auction.status = 'CANCELLED'; auction._cancelling = false; },
      error: () => { auction._cancelling = false; },
    });
  }

  answerQuestion(auction: LandAuction, q: any) {
    if (!q._answer?.trim()) return;
    q._saving = true;
    this.http.post(`${environment.apiUrl}/land/auctions/${auction.id}/questions/${q.id}/answer`, { answer: q._answer }).subscribe({
      next: () => { q.answer = q._answer; q._saving = false; },
      error: () => { q._saving = false; },
    });
  }

  private numberFormatter = new Intl.NumberFormat('fr-TN');

  formatAmount(n: number): string {
    return this.numberFormatter.format(Math.round(n)) + ' TND';
  }

  getBestBid(auction: LandAuction): number {
    if (!auction.bids?.length) return 0;
    return Math.max(...auction.bids.map(b => b.amount_tnd));
  }
}
