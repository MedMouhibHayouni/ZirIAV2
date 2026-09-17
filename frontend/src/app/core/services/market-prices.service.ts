import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, tap, of } from 'rxjs';

export interface MarketPrice {
  id: string;
  crop_type: string;
  date: string;
  price_min: number;
  price_max: number;
  price_avg: number;
  avg_price: number;       // alias used in overview template
  variation_pct: number;
  trend_7d_pct: number;
  trend_24h: number;       // alias used in overview template
}

export interface MarketTrend {
  crop_type: string;
  dates: string[];
  prices: number[];
}

@Injectable({
  providedIn: 'root'
})
export class MarketPricesService {
  private apiUrl = `${environment.apiUrl}/market-prices`;

  prices = signal<any[]>([]);
  dailyPrices = signal<any[]>([]);  // alias used by farmer-overview
  trends = signal<MarketTrend[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  constructor(private http: HttpClient) {}

  fetchDailyPrices() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.http.get<any[]>(this.apiUrl).pipe(
      tap(data => {
        const normalized = (Array.isArray(data) ? data : []).map(p => ({
          ...p,
          avg_price: p.avg_price ?? p.price_avg ?? 0,
          trend_24h: p.trend_24h ?? p.variation_pct ?? 0
        }));
        this.prices.set(normalized);
        this.dailyPrices.set(normalized);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.hasError.set(true);
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe();
  }

  /** Alias used by farmer-overview */
  fetchMarketPrices() {
    this.fetchDailyPrices();
  }

  fetchTrends() {
    this.http.get<MarketTrend[]>(`${this.apiUrl}/trends`).pipe(
      tap(data => this.trends.set(Array.isArray(data) ? data : [])),
      catchError(() => of([]))
    ).subscribe();
  }
}
