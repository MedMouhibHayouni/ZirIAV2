import {  Component, OnInit, inject, signal , ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  lucideCloud, lucideTrendingUp, lucideTrendingDown, lucideAlertCircle,
  lucidePackage, lucideShoppingCart, lucideArrowRight, lucideCalendar,
  lucideDroplets, lucideThermometer, lucideWind, lucideMapPin, lucideLeaf, lucideActivity, lucideSun,
  lucideBell, lucideSprout, lucideSparkles, lucidePlus, lucideWallet, lucideHexagon,
  lucideChevronRight, lucideCrown, lucideZap
} from '@ng-icons/lucide';
import { FarmerApiService } from '../../../core/services/farmer-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContractsApiService } from '../../../core/services/contracts-api.service';
import { FarmerAgentComponent } from './farmer-agent.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, FarmerAgentComponent],
  providers: [provideIcons({
    lucideCloud, lucideTrendingUp, lucideTrendingDown, lucideAlertCircle,
    lucidePackage, lucideShoppingCart, lucideArrowRight, lucideCalendar,
    lucideDroplets, lucideThermometer, lucideWind, lucideMapPin, lucideLeaf, lucideActivity, lucideSun,
    lucideBell, lucideSprout, lucideSparkles, lucidePlus, lucideWallet, lucideHexagon,
    lucideChevronRight, lucideCrown, lucideZap
})],
  templateUrl: './farmer-overview.component.html',
  styleUrl: './farmer-overview.component.scss'
})
export class FarmerOverviewComponent implements OnInit {
  private farmerApi = inject(FarmerApiService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private contractsApi = inject(ContractsApiService);

  currentUser = this.auth.currentUser as any;
  pendingContractsCount = signal(0);
  
  // Signals for dashboard data
  stats = signal({
    parcelsCount: 0,
    activeListings: 0,
    estimatedRevenue: 0,
    monthlyIncome: 0
  });

  subscription = signal<any>(null);
  recentAlerts = signal<any[]>([]);
  parcelsSummary = signal<any[]>([]);
  
  weatherData = signal<any>(null);

  ngOnInit() {
    this.loadDashboardData();
    this.loadWeather();
  }

  loadDashboardData() {
    // 1. Parcelles Actives
    this.http.get<any[]>(`${environment.apiUrl}/parcels/my`).subscribe(parcels => {
      this.parcelsSummary.set(parcels.slice(0, 3));
      this.stats.update(s => ({ ...s, parcelsCount: parcels.length }));
    });

    // 2. Activity Feed (Notifications)
    this.http.get<{items: any[]}>(`${environment.apiUrl}/notifications?limit=5`).subscribe(res => {
      this.recentAlerts.set(res.items || []);
    });

    // 3. Revenu Estimé & Active Listings — données réelles du backend
    this.http.get<{ active_listings_count: number; estimated_revenue_tnd: number; pending_connections: number }>(
      `${environment.apiUrl}/marketplace/my-stats`
    ).subscribe({
      next: (stats) => {
        this.stats.update(s => ({
          ...s,
          activeListings: stats.active_listings_count,
          estimatedRevenue: stats.estimated_revenue_tnd
        }));
      },
      error: () => {} // Silently ignore if role doesn't permit
    });

    // 4. Limites Abonnement
    this.http.get<any>(`${environment.apiUrl}/subscriptions/my`).subscribe({
      next: (sub) => this.subscription.set(sub),
      error: (err) => {
        console.error('Subscription error:', err);
        this.subscription.set(null);
      }
    });
    
    // 5. Finance Summary (Actual income)
    this.http.get<any>(`${environment.apiUrl}/finance/records/summary`).subscribe(summary => {
      if (summary) {
        this.stats.update(s => ({ ...s, monthlyIncome: summary.income || 0 }));
      }
    });

    // 6. Pending contracts check
    this.contractsApi.getMyContracts().subscribe({
      next: (contracts) => {
        const pending = (contracts || []).filter(c => c.status === 'PENDING_ACCEPTANCE');
        this.pendingContractsCount.set(pending.length);
        this.cdr.markForCheck();
      }
    });
  }

  loadWeather() {
    const lat = this.currentUser()?.lat || 35.1676;
    const lng = this.currentUser()?.lng || 8.8365;
    
    this.http.get<any>(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)
      .subscribe(res => {
        this.weatherData.set({
          temp: res.current.temperature_2m,
          humidity: res.current.relative_humidity_2m,
          wind: res.current.wind_speed_10m,
          forecast: [
            { day: 'Aujourd\'hui', temp: res.daily.temperature_2m_max[0] },
            { day: 'Demain', temp: res.daily.temperature_2m_max[1] }
          ]
        });
      });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  todayLabel(): string {
    try {
      return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    } catch { return ''; }
  }

  displayName(): string {
    const u: any = this.currentUser?.();
    return u?.name || u?.first_name || 'Agriculteur';
  }

  initials(): string {
    const n = this.displayName().trim().split(/\s+/);
    if (n.length === 1) return n[0].slice(0, 2).toUpperCase();
    return (n[0][0] + n[n.length - 1][0]).toUpperCase();
  }

  activityLabel(): string {
    const a: any = (this.currentUser?.() as any)?.activity_type;
    if (a === 'CROP') return 'Végétal';
    if (a === 'LIVESTOCK') return 'Élevage';
    if (a === 'MIXED') return 'Mixte';
    return 'Exploitation';
  }

  userGovernorate(): string {
    return (this.currentUser?.() as any)?.governorate || 'Kasserine';
  }

  planLabel(): string {
    const s: any = this.subscription?.();
    return s?.plan_code || s?.plan || 'GRATUIT';
  }
}
