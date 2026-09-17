import { 
  Component, OnInit, AfterViewInit, ViewChild, ElementRef,
  OnDestroy, PLATFORM_ID, inject, NgZone, signal, computed, ChangeDetectorRef
, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight, lucideSprout, lucideGlobe2, lucideMic, lucideNetwork, lucideBrain,
  lucideShieldAlert, lucideUsers, lucideBriefcase, lucideTractor, lucideHammer, lucideTruck,
  lucideMap, lucideFileText, lucideCheck, lucideX, lucideChevronDown, lucideZap,
  lucideLeaf, lucideActivity, lucideLayers, lucidePackage, lucideBuilding2,
  lucideFlame, lucideStar, lucideBarChart3, lucideShield, lucideSmartphone, lucideGlobe,
  lucideMenu, lucideSparkles, lucideCamera
} from '@ng-icons/lucide';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { MarketplaceListing } from '../../core/models/marketplace-listing.model';
import { environment } from '../../../environments/environment';

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  price_tnd_monthly: number;
  features: string[];
  is_recommended?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, PublicNavbarComponent],
  providers: [provideIcons({
    lucideArrowRight, lucideSprout, lucideGlobe2, lucideMic, lucideNetwork, lucideBrain,
    lucideShieldAlert, lucideUsers, lucideBriefcase, lucideTractor, lucideHammer, lucideTruck,
    lucideMap, lucideFileText, lucideCheck, lucideX, lucideChevronDown, lucideZap,
    lucideLeaf, lucideActivity, lucideLayers, lucidePackage, lucideBuilding2,
    lucideFlame, lucideStar, lucideBarChart3, lucideShield, lucideSmartphone, lucideGlobe,
    lucideMenu, lucideSparkles, lucideCamera
  })],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('statsSection', { static: false }) statsSection!: ElementRef<HTMLDivElement>;
  @ViewChild('featuresSection', { static: false }) featuresSection!: ElementRef<HTMLDivElement>;
  @ViewChild('pricingSection', { static: false }) pricingSection!: ElementRef<HTMLDivElement>;

  public auth = inject(AuthService);
  private adminApi = inject(AdminApiService);
  private marketplaceService = inject(MarketplaceService);
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  readonly kpis = this.adminApi.kpis;
  readonly displayKpis = computed(() => {
    const data = this.kpis();
    return {
      activeUsers: data?.total_users || 450,
      b2bTransactions: data?.today_transactions_count || 120,
      activeDiseases: data?.active_critical_alerts || 0
    };
  });

  // Pricing — pre-populated so the section ALWAYS shows, API enriches if available
  pricingPlans = signal<PricingPlan[]>([
    { id: '1', code: 'FREE',     name: 'Gratuit',  price_tnd_monthly: 0,   features: ['1 parcelle', 'Agent IA limité', 'Marketplace (lecture)'], is_recommended: false },
    { id: '2', code: 'STARTER',  name: 'Starter',  price_tnd_monthly: 29,  features: ['5 parcelles', 'Diagnostic IA', 'Marketplace complète', 'Alertes SMS'], is_recommended: false },
    { id: '3', code: 'PRO',      name: 'Pro',       price_tnd_monthly: 79,  features: ['Parcelles illimitées', 'Agent Darija avancé', 'Rapports CRDA', 'API Access', 'Support prioritaire'], is_recommended: true },
    { id: '4', code: 'BUSINESS', name: 'Business',  price_tnd_monthly: 199, features: ['Multi-coopérative', 'White-label', 'SLA 99.9%', 'Intégration ERP', 'Gestionnaire dédié'], is_recommended: false },
  ]);

  // Plan detail modal
  selectedPlanForModal = signal<PricingPlan | null>(null);
  showPlanModal = signal(false);

  // Chat animation
  chatMessages = [
    { text: '', isUser: true, fullText: "n7eb nbi3 zuz tonne tmatem" },
    { text: '', isUser: false, fullText: "Annonce créée — 3 acheteurs potentiels trouvés." }
  ];
  private chatTimeouts: any[] = [];

  // Map
  private map: L.Map | null = null;
  private mapTimeout: any = null;

  // Stats
  private observer: IntersectionObserver | null = null;
  private pillarsObserver: IntersectionObserver | null = null;
  hasAnimatedStats = false;
  statCounters = {
    digitalAccess: 0,
    losses: 0,
    noMarket: 0,
    platformRoles: 0
  };

  roles = [
    { id: 'FARMER',          name: 'Agriculteur',        icon: 'lucideSprout',     color: '#2D6A4F', features: ['Marketplace B2B', 'Diagnostic IA', 'Gestion parcelles'] },
    { id: 'COOP_PRESIDENT',  name: 'Coopérative',        icon: 'lucideBuilding2',  color: '#40916C', features: ['Gestion membres', 'Bilans collectifs', 'Rapports CRDA'] },
    { id: 'B2B_BUYER',       name: 'Acheteur B2B',       icon: 'lucideBriefcase',  color: '#1D3557', features: ['Sourcing hub', 'Contrats sécurisés', 'Analyses marché'] },
    { id: 'EXPERT',          name: 'Expert CRDA',        icon: 'lucideActivity',   color: '#457B9D', features: ['Surveillance maladies', 'Validation alertes', 'Rapports terrain'] },
    { id: 'SUPPLIER',        name: 'Fournisseur',        icon: 'lucidePackage',    color: '#E76F51', features: ['Catalogue produits', 'Promotions ciblées', 'Commandes directes'] },
    { id: 'DRIVER',          name: 'Chauffeur',          icon: 'lucideTruck',      color: '#264653', features: ['Missions logistique', 'Tracking GPS', 'Revenus déclarés'] },
    { id: 'EQUIP_OWNER',     name: 'Équipementier',      icon: 'lucideTractor',    color: '#2A9D8F', features: ['Location matériel', 'Calendrier réservations', 'Suivi revenus'] },
    { id: 'LAND_OWNER',      name: 'Propriétaire Foncier', icon: 'lucideMap',      color: '#8B5CF6', features: ['Cadastre numérique', 'Location terres', 'Enchères sécurisées'] },
  ];

  steps = [
    {
      number: '01',
      title: "L'Agent parle Darija",
      desc: "Publiez en parlant votre langue. Notre IA comprend le dialecte tunisien et crée vos annonces automatiquement.",
      icon: 'lucideMic'
    },
    {
      number: '02',
      title: 'La Marketplace connecte',
      desc: "Votre offre est visible par des centaines d'acheteurs B2B vérifiés — exportateurs, industriels, coopératives.",
      icon: 'lucideNetwork'
    },
    {
      number: '03',
      title: "L'IA protège vos récoltes",
      desc: "Détection précoce des maladies par image. Alertes météo personnalisées. Prévision de récolte à 7 jours.",
      icon: 'lucideBrain'
    }
  ];

  ngOnInit(): void {
    // Force initial render of static pricing data for OnPush
    this.cdr.markForCheck();
    
    if (isPlatformBrowser(this.platformId)) {
      this.startChatAnimation();
      // We rely exclusively on the hardcoded static pricing data below for the landing page
      // to ensure perfect rendering and features display.
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
      this.initIntersectionObservers();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.chatTimeouts.forEach(t => clearTimeout(t));
      if (this.mapTimeout) clearTimeout(this.mapTimeout);
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
      if (this.observer) this.observer.disconnect();
      if (this.pillarsObserver) this.pillarsObserver.disconnect();
    }
  }

  scrollToFeatures() {
    this.featuresSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToPricing() {
    this.pricingSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  openPlanModal(plan: PricingPlan, event: Event) {
    event.preventDefault();
    this.selectedPlanForModal.set(plan);
    this.showPlanModal.set(true);
    this.cdr.markForCheck();
  }

  closePlanModal() {
    this.showPlanModal.set(false);
    this.selectedPlanForModal.set(null);
    this.cdr.markForCheck();
  }

  private fetchPricingPlans() {
    this.http.get<any>(`${environment.apiUrl}/subscriptions/plans`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.items ?? res.plans ?? []);
        if (list.length > 0) {
          const ordered = ['FREE', 'STARTER', 'PRO', 'BUSINESS'];
          const sorted = list.sort((a: PricingPlan, b: PricingPlan) =>
            ordered.indexOf(a.code) - ordered.indexOf(b.code));
          this.pricingPlans.set(sorted.map((p: any) => ({
            ...p,
            is_recommended: p.code === 'PRO'
          })));
          this.cdr.markForCheck();
        }
        // If API returns nothing, keep static pre-populated data
      },
      error: () => { /* keep static pre-populated data */ }
    });
  }

  private initIntersectionObservers() {
    if (this.statsSection) {
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.hasAnimatedStats) {
          this.hasAnimatedStats = true;
          this.animateStat('digitalAccess', 12, 2000);
          this.animateStat('losses', 8, 2000);
          this.animateStat('noMarket', 100, 2000);
          this.animateStat('platformRoles', 1, 2000);
        }
      }, { threshold: 0.3 });
      this.observer.observe(this.statsSection.nativeElement);
    }

    // Animate steps into view
    if (this.featuresSection) {
      this.pillarsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.step-card, .role-card-wrap, .pricing-card').forEach(el => {
        this.pillarsObserver!.observe(el);
      });
    }
  }

  private animateStat(key: keyof typeof this.statCounters, target: number, duration: number) {
    this.ngZone.runOutsideAngular(() => {
      const startTime = performance.now();
      let lastRender = 0;
      const THROTTLE_MS = 33; // ~30fps updates — smooth enough for a counter

      const update = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        this.statCounters[key] = Math.round(target * easeOut);

        // Only trigger CD at 30fps max, not 144fps
        if (currentTime - lastRender >= THROTTLE_MS || progress >= 1) {
          lastRender = currentTime;
          this.cdr.detectChanges();
        }

        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    });
  }

  private startChatAnimation() {
    this.ngZone.runOutsideAngular(() => {
      const typeWriter = (index: number, msgIndex: number, callback: () => void) => {
        if (index < this.chatMessages[msgIndex].fullText.length) {
          this.chatMessages[msgIndex].text += this.chatMessages[msgIndex].fullText.charAt(index);
          // markForCheck is lighter than detectChanges — marks dirty, batches via Zone coalescing
          this.ngZone.run(() => this.cdr.markForCheck());
          this.chatTimeouts.push(setTimeout(() => typeWriter(index + 1, msgIndex, callback), 40));
        } else {
          this.chatTimeouts.push(setTimeout(callback, 800));
        }
      };

      const loop = () => {
        this.chatMessages[0].text = '';
        this.chatMessages[1].text = '';
        this.cdr.detectChanges();
        typeWriter(0, 0, () => {
          typeWriter(0, 1, () => {
            this.chatTimeouts.push(setTimeout(loop, 4000));
          });
        });
      };
      loop();
    });
  }

  private initMap() {
    if (!this.mapContainer) return;

    L.Marker.prototype.options.icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41]
    });

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false
    }).setView([35.1676, 8.8365], 9);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO'
    }).addTo(this.map);

    this.mapTimeout = setTimeout(() => {
      if (!this.map) return;
      // Simulate live activity markers in the region
      for (let i = 0; i < 15; i++) {
        const lat = 35.1676 + (Math.random() - 0.5) * 0.5;
        const lng = 8.8365 + (Math.random() - 0.5) * 0.5;
        L.circleMarker([lat, lng], {
          radius: 6, fillColor: '#22c55e', color: '#fff', weight: 2,
          opacity: 1, fillOpacity: 0.9
        }).addTo(this.map);
      }
    }, 1500);
  }
}
