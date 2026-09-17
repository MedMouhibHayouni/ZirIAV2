import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of, Observable } from 'rxjs';

export interface LandParcel {
  id: string;
  name: string;
  surface_area: number;
  governorate: string;
  crop_type?: string;
  center_lat: number;
  center_lng: number;
  is_for_auction: boolean;
  current_bid?: number;
  owner_id: string;
}

export interface LandListing {
  id: string;
  owner_id: string;
  surface_ha: number;
  soil_type: string | null;
  governorate: string | null;
  lat: number | null;
  lng: number | null;
  price_per_ha: number;
  listing_type: 'SALE' | 'RENT' | 'LEASE';
  status: 'ACTIVE' | 'UNDER_OFFER' | 'CLOSED';
  description: string | null;
  photo_url: string | null;
  water_access: string | null;
}

export interface LandAuction {
  id: string;
  parcel_id: string;
  reserve_price_secret: number;
  start_price: number; 
  min_increment: number;
  current_bid: number;
  current_price: number; 
  bid_count: number;
  end_at: string;
  end_date: string; 
  auto_extend_minutes: number;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED' | 'CLOSED';
  landListing?: LandListing;
  parcel: LandParcel; 
}

export interface LandBid {
  id: string;
  auction_id: string;
  amount: number;
  created_at: string;
}

export interface CreateListingDto extends Partial<LandListing> {}
export interface CreateAuctionDto {
  parcel_id: string;
  reserve_price_secret: number;
  min_increment: number;
  end_at: string;
  auto_extend_minutes: number;
}

@Injectable({ providedIn: 'root' })
export class LandApiService {
  myLands = signal<LandParcel[]>([]);
  activeAuctions = signal<LandAuction[]>([]);
  
  isLoadingLands = signal(false);
  isLoadingAuctions = signal(false);
  
  constructor(private http: HttpClient) {}

  fetchMyLands() {
    this.isLoadingLands.set(true);
    return this.http.get<LandParcel[]>(`${environment.apiUrl}/parcels/my-owned`).pipe(
      tap(data => {
        this.myLands.set(data);
        this.isLoadingLands.set(false);
      }),
      catchError(() => {
        this.isLoadingLands.set(false);
        return of([]);
      })
    );
  }

  getMyListings(): Observable<LandListing[]> {
    return this.http.get<LandListing[]>(`${environment.apiUrl}/land/me`);
  }

  getAuctions(): Observable<LandAuction[]> {
    return this.http.get<LandAuction[]>(`${environment.apiUrl}/land/auctions`).pipe(
      tap(data => this.activeAuctions.set(this.mapAuctions(data)))
    );
  }

  createAuction(dto: CreateAuctionDto): Observable<LandAuction> {
    return this.http.post<LandAuction>(`${environment.apiUrl}/land/auctions`, dto);
  }

  getAuctionBids(auctionId: string): Observable<LandBid[]> {
    return this.http.get<LandBid[]>(`${environment.apiUrl}/land/auctions/${auctionId}/bids`);
  }

  deleteListing(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/land/${id}`);
  }

  fetchActiveAuctions() {
    this.isLoadingAuctions.set(true);
    return this.http.get<LandAuction[]>(`${environment.apiUrl}/land/auctions`).pipe(
      tap(data => {
        this.activeAuctions.set(this.mapAuctions(data));
        this.isLoadingAuctions.set(false);
      }),
      catchError(() => {
        this.isLoadingAuctions.set(false);
        return of([]);
      })
    );
  }

  private mapAuctions(data: any[]): LandAuction[] {
    return data.map(a => ({
      ...a,
      start_price: a.start_price ?? a.reserve_price_secret ?? 0,
      current_price: a.current_price ?? a.current_bid ?? a.reserve_price_secret ?? 0,
      end_date: a.end_date ?? a.end_at ?? new Date().toISOString(),
      parcel: a.parcel ?? a.landListing ?? { id: '', name: 'Terrain Inconnu', surface_area: 0, governorate: '' }
    }));
  }

  startAuction(parcelId: string, startPrice: number, endDate: string) {
    return this.http.post(`${environment.apiUrl}/land/auctions`, {
      parcel_id: parcelId,
      reserve_price_secret: startPrice,
      end_at: endDate,
      min_increment: 50,
      auto_extend_minutes: 5
    });
  }

  placeBid(auctionId: string, amount: number) {
    return this.http.post(`${environment.apiUrl}/land/auctions/${auctionId}/bids`, { amount });
  }
}


