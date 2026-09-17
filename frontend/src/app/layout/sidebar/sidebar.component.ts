import { Component, computed, inject, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, effect, ChangeDetectorRef, afterNextRender, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { io, Socket } from 'socket.io-client';
import {
  lucideLayoutDashboard, lucideBriefcase, lucideTractor,
  lucideSprout, lucideShieldAlert, lucideLogOut, lucideActivity,
  lucideUsers, lucideMap, lucideBarChart2, lucideCalendar,
  lucidePackage, lucideCheckSquare, lucideSettings, lucideFileText,
  lucideRadio, lucideAlertTriangle, lucideTruck, lucideHammer,
  lucideDollarSign, lucideMic, lucideServer, lucideCamera, lucideBell, lucideFlame,
  lucideX, lucideShoppingCart, lucideMicroscope, lucideFlag, lucideMessageSquare, lucideUserPlus, lucideStethoscope,
  lucideZap, lucideCrown, lucideShield, lucideLock, lucideGlobe, lucideReceipt, lucideUser, lucideHistory,
  lucideCpu, lucideBookOpen, lucideFlaskConical, lucideDroplets, lucideCalculator,
  lucideMapPin, lucideHeart, lucideClipboardList, lucideSyringe, lucideWallet, lucideUserCircle,
  lucideSun, lucideMoon, lucideAward, lucideBox
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SocketService } from '../../core/services/socket.service';
import { AgriJobApiService } from '../../core/services/agrijob-api.service';
import { ExpertApiService } from '../../core/services/expert-api.service';
import { FarmerApiService } from '../../core/services/farmer-api.service';
import { ToastService } from '../../features/dashboards/expert/shared/toast.service';

interface NavItem {
  route: string;
  icon: string;
  label: string;
  badge?: 'unreadCount' | 'workerNotifications' | string; // Binds dynamically
  requiredFeature?: string;
  requiredPlan?: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
}

/** Sprint 6 — Visual identity per expert type */
export const EXPERT_TYPE_IDENTITY: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  PHYTOPATHOLOGIST: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: 'lucideMicroscope',    label: 'Phytopathologiste' },
  AGRONOMIST:       { color: '#84cc16', bg: 'rgba(132,204,22,0.12)', icon: 'lucideSprout',         label: 'Ingénieur Agronome' },
  HYDRAULIC_ENGINEER:{ color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', icon: 'lucideDroplets',       label: 'Ingénieur Hydraulique' },
  HYDROGEOLOGIST:   { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: 'lucideMapPin',          label: 'Hydrogéologue' },
  ZOOTECHNICIAN:    { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  icon: 'lucideHeart',          label: 'Spécialiste Élevage' },
  VETERINARY_EPIDEMIOLOGIST: { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', icon: 'lucideSyringe', label: 'Vétérinaire Épidém.' }
};

/** Activity-type identity (color palette per farmer activity) */
export const ACTIVITY_TYPE_IDENTITY: Record<string, { color: string; bg: string; icon: string; label: string; accentBg: string }> = {
  CROP:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  accentBg: 'rgba(34,197,94,0.08)', icon: 'lucideSprout',   label: 'Agriculture Végétale 🌿' },
  LIVESTOCK: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', accentBg: 'rgba(251,146,60,0.08)', icon: 'lucideHeart',    label: 'Élevage & Bétail 🐄' },
  MIXED:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',accentBg: 'rgba(167,139,250,0.08)',icon: 'lucideActivity', label: 'Mixte — Végétal & Élevage 🌾🐄' },
};

const EXPERT_TYPE_MENUS: Record<string, NavItem[]> = {
  PHYTOPATHOLOGIST: [
    { route: '/dashboard/expert/overview',      icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/cases',         icon: 'lucideCpu',            label: 'Triage IA' },
    { route: '/dashboard/expert/heatmap',       icon: 'lucideMap',            label: 'Heatmap' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',       label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/alerts',        icon: 'lucideShieldAlert',    label: 'Alertes & Bulletins' },
    { route: '/dashboard/expert/prescriptions', icon: 'lucideFileText',       label: 'Prescriptions' },
    { route: '/dashboard/expert/consultations', icon: 'lucideBriefcase',   label: 'Consultations' },
    { route: '/dashboard/expert/messages',      icon: 'lucideMessageSquare',  label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',       icon: 'lucideWallet',         label: 'Revenus' },
    { route: '/dashboard/expert/profil',        icon: 'lucideUserCircle',     label: 'Mon Profil' }
  ],
  AGRONOMIST: [
    { route: '/dashboard/expert/overview',         icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/cahiers-culture',  icon: 'lucideBookOpen',        label: 'Cahiers de Culture' },
    { route: '/dashboard/expert/analyses-sol',     icon: 'lucideFlaskConical',    label: 'Analyses de Sol' },
    { route: '/dashboard/expert/prescriptions',    icon: 'lucideFileText',        label: 'Ordonnances' },
    { route: '/dashboard/expert/consultations',    icon: 'lucideBriefcase',       label: 'Consultations' },
    { route: '/dashboard/expert/messages',         icon: 'lucideMessageSquare',   label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',          icon: 'lucideWallet',          label: 'Revenus' },
    { route: '/dashboard/expert/profil',           icon: 'lucideUserCircle',      label: 'Mon Profil' }
  ],
  HYDRAULIC_ENGINEER: [
    { route: '/dashboard/expert/overview',         icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/projets-irrigation', icon: 'lucideDroplets',     label: 'Projets Irrigation' },
    { route: '/dashboard/expert/calcul-eau',       icon: 'lucideCalculator',      label: 'Calcul ETc' },
    { route: '/dashboard/expert/consultations',    icon: 'lucideBriefcase',       label: 'Consultations' },
    { route: '/dashboard/expert/messages',         icon: 'lucideMessageSquare',   label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',          icon: 'lucideWallet',          label: 'Revenus' },
    { route: '/dashboard/expert/profil',           icon: 'lucideUserCircle',      label: 'Mon Profil' }
  ],
  HYDROGEOLOGIST: [
    { route: '/dashboard/expert/overview',         icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/carte-puits',      icon: 'lucideMapPin',          label: 'Carte des Puits' },
    { route: '/dashboard/expert/piezometrie',      icon: 'lucideActivity',        label: 'Piézométrie' },
    { route: '/dashboard/expert/consultations',    icon: 'lucideBriefcase',       label: 'Consultations' },
    { route: '/dashboard/expert/messages',         icon: 'lucideMessageSquare',   label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',          icon: 'lucideWallet',          label: 'Revenus' },
    { route: '/dashboard/expert/profil',           icon: 'lucideUserCircle',      label: 'Mon Profil' }
  ],
  ZOOTECHNICIAN: [
    { route: '/dashboard/expert/overview',         icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/mes-elevages',     icon: 'lucideHeart',           label: 'Mes Élevages' },
    { route: '/dashboard/expert/calcul-rations',   icon: 'lucideCalculator',      label: 'Rations & Nutrition' },
    { route: '/dashboard/expert/calendrier-repro', icon: 'lucideCalendar',        label: 'Calendrier Repro' },
    { route: '/dashboard/expert/consultations',    icon: 'lucideBriefcase',       label: 'Consultations' },
    { route: '/dashboard/expert/messages',         icon: 'lucideMessageSquare',   label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',          icon: 'lucideWallet',          label: 'Revenus' },
    { route: '/dashboard/expert/profil',           icon: 'lucideUserCircle',      label: 'Mon Profil' }
  ],
  VETERINARY_EPIDEMIOLOGIST: [
    { route: '/dashboard/expert/overview',         icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/expert/mes-agriculteurs', icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/expert/dossiers-cliniques', icon: 'lucideClipboardList', label: 'Dossiers Cliniques' },
    { route: '/dashboard/expert/vaccinations',     icon: 'lucideSyringe',         label: 'Vaccinations' },
    { route: '/dashboard/expert/carte-quarantaine', icon: 'lucideMap',            label: 'Carte Quarantaine' },
    { route: '/dashboard/expert/alerts',           icon: 'lucideShieldAlert',     label: 'Alertes Sanitaires' },
    { route: '/dashboard/expert/consultations',    icon: 'lucideBriefcase',       label: 'Consultations' },
    { route: '/dashboard/expert/messages',         icon: 'lucideMessageSquare',   label: 'Messages', badge: 'expertMessages' },
    { route: '/dashboard/expert/revenus',          icon: 'lucideWallet',          label: 'Revenus' },
    { route: '/dashboard/expert/profil',           icon: 'lucideUserCircle',      label: 'Mon Profil' }
  ]
};

const ROLE_MENUS: Record<string, NavItem[]> = {
  ADMIN: [
    { route: '/dashboard/admin/overview',     icon: 'lucideActivity',       label: 'Vue globale' },
    { route: '/dashboard/admin/users',        icon: 'lucideUsers',          label: 'Utilisateurs' },
    { route: '/dashboard/admin/experts',      icon: 'lucideAward',          label: 'Experts & Ambassadeurs' },
    { route: '/dashboard/admin/transactions', icon: 'lucideBriefcase',      label: 'Transactions' },
    { route: '/dashboard/admin/system',       icon: 'lucideServer',         label: 'Santé Système' },
  ],
  COOP_PRESIDENT: [
    { route: '/dashboard/smsa/overview',      icon: 'lucideLayoutDashboard', label: 'Tableau de bord' },
    { route: '/dashboard/smsa/members',       icon: 'lucideUsers',           label: 'Gérer Membres' },
    { route: '/dashboard/smsa/parcels',       icon: 'lucideMap',             label: 'Parcelles GPS' },
    { route: '/dashboard/smsa/marketplace',   icon: 'lucidePackage',         label: 'Mes Ventes' },
    { route: '/dashboard/smsa/alerts',        icon: 'lucideAlertTriangle',   label: 'Alertes Phyto' },
  ],
  B2B_BUYER: [
    { route: '/dashboard/b2b/sourcing',       icon: 'lucideBriefcase',      label: 'Sourcing Hub' },
    { route: '/dashboard/b2b/contracts',      icon: 'lucideCheckSquare',    label: 'Mes Contrats' },
    { route: '/dashboard/b2b/insights',       icon: 'lucideBarChart2',      label: 'Insights Marché' },
  ],
  EQUIP_OWNER: [
    { route: '/dashboard/equipment-owner/rentals', icon: 'lucideTractor',        label: 'Mes Locations' },
    { route: '/dashboard/equipment-owner/contrats', icon: 'lucideFileText',      label: 'Mes Contrats' },
  ],
  EXPERT: [],
  FARMER: [], // Populated dynamically by farmerMenuFor()
  SUPPLIER: [
    { route: '/dashboard/supplier/overview',     icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/supplier/catalog',      icon: 'lucidePackage',         label: 'Mon Catalogue' },
    { route: '/dashboard/supplier/orders',       icon: 'lucideShoppingCart',    label: 'Commandes' },
    { route: '/dashboard/supplier/vitrine',      icon: 'lucideGlobe',           label: 'Ma Vitrine' },
    { route: '/dashboard/supplier/mon-bureau',   icon: 'lucideReceipt',         label: 'Mon Bureau' },
    { route: '/dashboard/supplier/analytics',    icon: 'lucideBarChart2',       label: 'Analytiques', requiredFeature: 'basic_analytics' },
    { route: '/dashboard/supplier/promotions',   icon: 'lucideFlame',           label: 'Promotions' },
    { route: '/dashboard/supplier/crm',          icon: 'lucideUsers',           label: 'Clients CRM', requiredFeature: 'client_crm' },
    { route: '/dashboard/supplier/subscription', icon: 'lucideCrown',           label: 'Mon Abonnement' },
    { route: '/dashboard/supplier/settings',     icon: 'lucideSettings',        label: 'Paramètres' },
  ],
  FARMER_AMBASSADOR: [
    { route: '/dashboard/ambassador/overview',     icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
    { route: '/dashboard/ambassador/farmers',      icon: 'lucideUsers',           label: 'Mes Agriculteurs' },
    { route: '/dashboard/ambassador/map',          icon: 'lucideMap',             label: 'Carte de Zone' },
    { route: '/dashboard/ambassador/alerts',       icon: 'lucideBell',            label: 'Alertes Zone' },
    { route: '/dashboard/ambassador/diagnostics',  icon: 'lucideMicroscope',      label: 'Diagnostics' },
    { route: '/dashboard/ambassador/field-reports',icon: 'lucideFlag',            label: 'Signalements Terrain' },
    { route: '/dashboard/ambassador/certifications',icon: 'lucideCrown',           label: 'Validations Certifs' },
    { route: '/dashboard/ambassador/messages',     icon: 'lucideMessageSquare',   label: 'Messages' },
    { route: '/dashboard/ambassador/onboarding',   icon: 'lucideUserPlus',        label: 'Inscrire Agriculteur' },
  ],
  WORKER: [
    { route: '/dashboard/worker/profile',      icon: 'lucideUsers',           label: 'Mon Profil' },
    { route: '/dashboard/worker/jobs',         icon: 'lucideHammer',          label: 'Offres Emploi' },
    { route: '/dashboard/worker/missions',     icon: 'lucideBriefcase',       label: 'Mes Candidatures' },
    { route: '/dashboard/worker/earnings',     icon: 'lucideDollarSign',      label: 'Mes Revenus' },
    { route: '/dashboard/worker/notifications',icon: 'lucideBell',            label: 'Notifications', badge: 'workerNotifications' },
    { route: '/dashboard/worker/contrats',      icon: 'lucideFileText',        label: 'Mes Contrats' },
  ],
  DRIVER: [
    { route: '/dashboard/driver/profil',        icon: 'lucideUser',           label: 'Mon Profil' },
    { route: '/dashboard/driver/missions',      icon: 'lucidePackage',        label: 'Missions Disponibles' },
    { route: '/dashboard/driver/en-cours',      icon: 'lucideTruck',          label: 'Mission en Cours' },
    { route: '/dashboard/driver/historique',    icon: 'lucideHistory',        label: 'Historique' },
    { route: '/dashboard/driver/revenus',       icon: 'lucideDollarSign',     label: 'Mes Revenus' },
    { route: '/dashboard/driver/notifications', icon: 'lucideBell',           label: 'Notifications', badge: '2' },
    { route: '/dashboard/driver/vehicles',      icon: 'lucideTractor',        label: 'Mon Véhicule' },
    { route: '/dashboard/driver/contrats',      icon: 'lucideFileText',        label: 'Mes Contrats' },
  ],
  LAND_OWNER: [
    { route: '/dashboard/land_owner/lands',   icon: 'lucideMap',            label: 'Mes Terres (Cadastre)' },
    { route: '/dashboard/land_owner/offers',  icon: 'lucideFileText',       label: 'Demandes location' },
  ]
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIconComponent, TranslateModule],
  viewProviders: [provideIcons({
    lucideLayoutDashboard, lucideBriefcase, lucideTractor, lucideSprout,
    lucideShieldAlert, lucideLogOut, lucideActivity, lucideUsers, lucideMap,
    lucideBarChart2, lucideCalendar, lucidePackage, lucideCheckSquare,
    lucideSettings, lucideFileText, lucideRadio, lucideAlertTriangle,
    lucideTruck, lucideHammer, lucideDollarSign, lucideMic,
    lucideServer, lucideCamera, lucideBell, lucideFlame, lucideX, lucideShoppingCart,
    lucideMicroscope, lucideFlag, lucideMessageSquare, lucideUserPlus, lucideStethoscope,
    lucideZap, lucideCrown, lucideShield, lucideLock, lucideGlobe, lucideReceipt, lucideUser, lucideHistory,
    lucideCpu, lucideBookOpen, lucideFlaskConical, lucideDroplets, lucideCalculator,
    lucideMapPin, lucideHeart, lucideClipboardList, lucideSyringe, lucideWallet, lucideUserCircle,
    lucideSun, lucideMoon, lucideAward, lucideBox
  })],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input()  navOpen = false;
  @Output() closeRequest = new EventEmitter<void>();

  authService  = inject(AuthService);
  themeService = inject(ThemeService);
  socket       = inject(SocketService);
  private elRef        = inject(ElementRef);
  private agrijobApi   = inject(AgriJobApiService);
  private expertApi    = inject(ExpertApiService);
  private farmerApi    = inject(FarmerApiService);
  private toastService = inject(ToastService);
  private http         = inject(HttpClient);
  private router       = inject(Router);
  private cdr          = inject(ChangeDetectorRef);

  supplierPlan = signal<any>(null);
  showUpgradeModal = signal(false);
  upgradeFeatureName = signal('');
  expertUnreadCount = signal(0);
  farmerUnreadCount = signal(0);

  private msgSocket: Socket | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.cdr.markForCheck();
      
      if (user && user.role === 'SUPPLIER') {
        this.http.get<any>(`${environment.apiUrl}/supplier/plans/my-subscription`).subscribe({
          next: (sub) => {
            this.supplierPlan.set(sub?.plan);
            this.cdr.markForCheck();
          },
          error: () => {
            this.supplierPlan.set(null);
            this.cdr.markForCheck();
          }
        });
      } else {
        this.supplierPlan.set(null);
      }

      if (user && user.role === 'WORKER') {
        this.agrijobApi.getUnreadCount().subscribe();
      }
    });

    // Polling for unread counts — 60s + skip when tab hidden (CPU saver)
    afterNextRender(() => {
      if (this.authService.currentUser()?.role === 'EXPERT') {
        this.fetchExpertUnread();
        this._expertPollInterval = window.setInterval(() => {
          if (document.hidden) return;
          if (this.authService.currentUser()?.role === 'EXPERT') {
            this.fetchExpertUnread();
          } else {
            window.clearInterval(this._expertPollInterval);
          }
        }, 60000);
      }
      if (this.authService.currentUser()?.role === 'FARMER') {
        this.fetchFarmerUnread();
        this._farmerPollInterval = window.setInterval(() => {
          if (document.hidden) return;
          if (this.authService.currentUser()?.role === 'FARMER') {
            this.fetchFarmerUnread();
          } else {
            window.clearInterval(this._farmerPollInterval);
          }
        }, 60000);
      }
    });
  }

  ngOnInit() {
    this.connectMsgSocket();
  }

  ngOnDestroy() {
    this.msgSocket?.disconnect();
    window.clearInterval(this._expertPollInterval);
    window.clearInterval(this._farmerPollInterval);
  }

  private _expertPollInterval = 0;
  private _farmerPollInterval = 0;

  private connectMsgSocket() {
    const user = this.authService.currentUser();
    if (!user || (user.role !== 'EXPERT' && user.role !== 'FARMER')) return;

    const token = this.authService.getToken();
    if (!token) return;

    const wsUrl = environment.apiUrl.replace(/\/api$/, '');
    this.msgSocket = io(`${wsUrl}/expert-dashboard`, {
      auth: { token },
      transports: ['websocket'], // no polling fallback (CPU + battery)
      reconnection: true,
      reconnectionDelay: 8000,
      reconnectionAttempts: 5,
    });

    this.msgSocket.on('stats_update', () => {
      if (user.role === 'EXPERT') this.fetchExpertUnread();
      if (user.role === 'FARMER') this.fetchFarmerUnread();
    });

    this.msgSocket.on('new_message_notification', (data: any) => {
      const senderName = data.sender_name || 'Inconnu';
      const roleLabel = data.sender_role || '';
      const shortBody = data.body && data.body.length > 80
        ? data.body.substring(0, 80) + '...'
        : data.body || '';

      const title = roleLabel ? `${senderName} (${roleLabel})` : senderName;

      this.toastService.info(title, shortBody, 5000);
    });
  }

  fetchExpertUnread() {
    this.expertApi.getMessageUnreadCount().subscribe({
      next: (res) => {
        this.expertUnreadCount.set(res.unread_count);
        this.cdr.markForCheck();
      }
    });
  }

  fetchFarmerUnread() {
    this.farmerApi.getMessageUnreadCount().subscribe({
      next: (res) => {
        this.farmerUnreadCount.set(res.unread_count);
        this.cdr.markForCheck();
      }
    });
  }


  // ─── Farmer menu builder (activity-type aware) ───────────────────────────
  private farmerMenuFor(activityType: string | null | undefined): NavItem[] {
    const COMMON: NavItem[] = [
      { route: '/dashboard/farmer/dashboard',   icon: 'lucideMic',             label: 'ZirPulse IA', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/analytics',   icon: 'lucideLayoutDashboard', label: 'Analytiques', requiredPlan: 'STARTER' },
      { route: '/dashboard/farmer/experts',     icon: 'lucideStethoscope',     label: 'Experts', badge: 'expertMessages', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/services',    icon: 'lucideBriefcase',       label: 'Services', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/erp',         icon: 'lucidePackage',         label: 'Stock & Finances', requiredPlan: 'PRO' },
      { route: '/dashboard/farmer/alerts',      icon: 'lucideBell',            label: 'Alertes', badge: 'unreadCount', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/marketplace', icon: 'lucideFlame',           label: 'Mes Annonces', requiredPlan: 'FREE' },
      { route: '/marketplace',                  icon: 'lucideGlobe',           label: 'Marché Public 🌍', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/contrats',    icon: 'lucideFileText',        label: 'Mes Contrats', requiredPlan: 'STARTER' },
    ];

    const CROP_ONLY: NavItem[] = [
      { route: '/dashboard/farmer/map',         icon: 'lucideSprout',  label: 'Mes Parcelles 🌱', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/diagnostic',  icon: 'lucideCamera',  label: 'Diagnostic Plante 🔬', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/supplies',    icon: 'lucideShoppingCart', label: 'Boutique Intrants', requiredPlan: 'FREE' },
    ];

    const LIVESTOCK_ONLY: NavItem[] = [
      { route: '/dashboard/farmer/cheptel',          icon: 'lucideHeart',    label: 'Mon Cheptel 🐄', requiredPlan: 'FREE' },
      { route: '/dashboard/farmer/animal-diagnostic', icon: 'lucideActivity', label: 'Diag. Animal IA 🩺', requiredPlan: 'STARTER' },
    ];

    const APICULTURE_ONLY: NavItem[] = [
      { route: '/dashboard/farmer/apiculture',   icon: 'lucideSprout',  label: 'Apiculture 🐝', requiredPlan: 'STARTER' },
      { route: '/dashboard/farmer/cheptel',      icon: 'lucideHeart',   label: 'Mon Cheptel 🐄', requiredPlan: 'FREE' },
    ];

    const type = activityType ?? 'MIXED';

    let specific: NavItem[] = [];
    if (type === 'CROP') {
      specific = CROP_ONLY;
    } else if (type === 'LIVESTOCK') {
      specific = LIVESTOCK_ONLY;
    } else {
      // MIXED — show everything (crop + livestock + apiculture)
      specific = [
        ...CROP_ONLY,
        ...LIVESTOCK_ONLY,
        { route: '/dashboard/farmer/apiculture', icon: 'lucideSprout', label: 'Apiculture 🐝', requiredPlan: 'STARTER' },
      ];
    }

    // Insert COMMON then domain-specific items (common first for shared context)
    return [...COMMON.slice(0, 2), ...specific, ...COMMON.slice(2)];
  }

  menuItems = computed<NavItem[]>(() => {
    const user = this.authService.currentUser();
    const role = user?.role ?? '';
    let items: NavItem[];

    if (role === 'EXPERT' && user?.expert_type) {
      items = EXPERT_TYPE_MENUS[user.expert_type] ?? [];
    } else if (role === 'EQUIP_OWNER' && user?.equipment_type === 'Frigoriste') {
      items = [
        { route: '/dashboard/storage/overview',     icon: 'lucideLayoutDashboard', label: 'Vue d\'ensemble' },
        { route: '/dashboard/storage/clients',      icon: 'lucideUsers',           label: 'Mes Clients' },
        { route: '/dashboard/storage/rooms',        icon: 'lucideBox',             label: 'Mes Salles & Design' },
        { route: '/dashboard/storage/reservations', icon: 'lucideFileText',        label: 'Réservations' },
        { route: '/dashboard/storage/revenue',      icon: 'lucideZap',             label: 'Revenus & STEG' },
        { route: '/dashboard/storage/facility',     icon: 'lucideMapPin',          label: 'Mon Site' },
        { route: '/dashboard/profile',              icon: 'lucideUser',            label: 'Mon Profil' },
      ];
    } else if (role === 'FARMER') {
      items = this.farmerMenuFor(user?.activity_type);
      // Apply accent CSS vars on the host element reactively
      const identity = ACTIVITY_TYPE_IDENTITY[user?.activity_type ?? 'CROP'] ?? ACTIVITY_TYPE_IDENTITY['CROP'];
      const el = this.elRef.nativeElement as HTMLElement;
      el.style.setProperty('--farmer-accent', identity.color);
      el.style.setProperty('--farmer-accent-bg', identity.bg);
    } else {
      items = ROLE_MENUS[role] ?? [];
    }

    return [
      { route: '/dashboard/feed', icon: 'lucideGlobe', label: 'ZirFeed' },
      ...items
    ];
  });

  hasFeature(feature?: string): boolean {
    if (!feature) return true; // no feature required
    const plan = this.supplierPlan();
    if (!plan) return false;
    return plan.features_json?.includes(feature);
  }

  hasPlan(requiredPlan?: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS'): boolean {
    if (!requiredPlan || requiredPlan === 'FREE') return true;
    const current = this.userPlan();
    const weights: Record<string, number> = {
      'FREE': 1,
      'STARTER': 2,
      'PRO': 3,
      'BUSINESS': 4
    };
    return (weights[current] ?? 1) >= (weights[requiredPlan] ?? 1);
  }

  onNavItemClick(item: NavItem) {
    if (item.requiredFeature && !this.hasFeature(item.requiredFeature)) {
      this.upgradeFeatureName.set(item.label);
      this.showUpgradeModal.set(true);
      return;
    }
    if (item.requiredPlan && !this.hasPlan(item.requiredPlan)) {
      this.upgradeFeatureName.set(`${item.label} (Plan ${item.requiredPlan} Requis)`);
      this.showUpgradeModal.set(true);
      return;
    }
    this.router.navigate([item.route]);
    this.onNavClick();
  }

  roleLabel = computed<string>(() => {
    const user = this.authService.currentUser();
    const role = user?.role ?? '';
    if (role === 'EXPERT' && user?.expert_type) {
      return EXPERT_TYPE_IDENTITY[user.expert_type]?.label ?? 'Expert Agricole';
    }
    if (role === 'FARMER' && user?.activity_type) {
      return ACTIVITY_TYPE_IDENTITY[user.activity_type]?.label ?? 'Agriculteur';
    }
    const labels: Record<string, string> = {
      ADMIN:             'Super Administrateur',
      COOP_PRESIDENT:    'Président SMSA',
      B2B_BUYER:         'Acheteur B2B',
      EQUIP_OWNER:       'Propriétaire Équipements',
      FARMER_AMBASSADOR: 'Ambassadeur Terrain',
      EXPERT:            'Expert Agricole',
      FARMER:            'Agriculteur',
      WORKER:            'Travailleur Saison.',
      DRIVER:            'Transporteur Logistique',
      LAND_OWNER:        'Propriétaire Foncier'
    };
    return labels[role] ?? 'Utilisateur';
  });

  /** Sprint 6: returns expert type identity (color/icon) or null for non-experts */
  expertIdentity = computed(() => {
    const user = this.authService.currentUser();
    if (user?.role === 'EXPERT' && user?.expert_type) {
      return EXPERT_TYPE_IDENTITY[user.expert_type] ?? null;
    }
    return null;
  });

  /** Activity type identity (color/icon) for FARMER role */
  activityTypeIdentity = computed(() => {
    const user = this.authService.currentUser();
    if (user?.role === 'FARMER' && user?.activity_type) {
      return ACTIVITY_TYPE_IDENTITY[user.activity_type] ?? null;
    }
    return null;
  });

  userPlan = computed(() => {
    return this.authService.currentUser()?.plan ?? 'FREE';
  });
  
  subscriptionCta = computed(() => {
    const user = this.authService.currentUser();
    const role = user?.role;

    if (role === 'SUPPLIER') {
      const plan = this.supplierPlan();
      if (!plan) {
        return {
          show: true,
          title: 'Vitrine B2B Pro',
          subtitle: 'Attirez plus d\'agriculteurs',
          btnText: 'S\'abonner',
          icon: 'lucideZap',
          route: '/dashboard/supplier/subscription',
          queryParams: null
        };
      } else if (plan.plan_code === 'VITRINE_BASIC' || plan.plan_code === 'VITRINE_PRO' || plan.plan_code === 'ERP_STARTER') {
        return {
          show: true,
          title: 'ERP Complet',
          subtitle: 'Gérez toute votre activité',
          btnText: 'Mettre à niveau',
          icon: 'lucideCrown',
          route: '/dashboard/supplier/subscription',
          queryParams: null
        };
      }
      return { show: false, title: '', subtitle: '', btnText: '', icon: '', route: '', queryParams: null, ctaColor: '' };
    }

    // ─── FARMER: differentiated pack CTA per activity type + plan ────────────
    if (role === 'FARMER') {
      const plan = this.userPlan();
      const type = user?.activity_type ?? 'CROP';
      const identity = ACTIVITY_TYPE_IDENTITY[type] ?? ACTIVITY_TYPE_IDENTITY['CROP'];

      const packNames: Record<string, { starter: string; pro: string }> = {
        CROP:      { starter: 'Pack Culture Starter', pro: 'Pack Culture Pro 🌱' },
        LIVESTOCK: { starter: 'Pack Élevage Starter', pro: 'Pack Élevage Pro 🐄' },
        MIXED:     { starter: 'Pack Mixte Starter', pro: 'Pack Complet Pro 🌾🐄' },
      };
      const names = packNames[type] ?? packNames['CROP'];

      if (plan === 'FREE') {
        return {
          show: true,
          title: names.starter,
          subtitle: 'Débloquez vos modules ' + (type === 'CROP' ? 'agricoles' : type === 'LIVESTOCK' ? 'd\'élevage' : 'complets'),
          btnText: 'Découvrir',
          icon: 'lucideZap',
          route: '/dashboard/subscription/checkout',
          queryParams: { plan: 'STARTER', type },
          ctaColor: identity.color
        };
      } else if (plan === 'STARTER') {
        return {
          show: true,
          title: names.pro,
          subtitle: 'IA avancée + export + rapports',
          btnText: 'Passer au Pro',
          icon: 'lucideCrown',
          route: '/dashboard/subscription/checkout',
          queryParams: { plan: 'PRO', type },
          ctaColor: identity.color
        };
      }
      return { show: false, title: '', subtitle: '', btnText: '', icon: '', route: '', queryParams: null, ctaColor: '' };
    }

    // ─── Admin: no subscription CTA ────────────────────────────────────────────
    if (role === 'ADMIN') {
      return { show: false, title: '', subtitle: '', btnText: '', icon: '', route: '', queryParams: null, ctaColor: '' };
    }

    // ─── Generic (other roles) ────────────────────────────────────────────────
    const plan = this.userPlan();
    if (plan === 'FREE') {
      return { show: true, title: 'ZirIA Premium', subtitle: 'Débloquez tout le potentiel', btnText: 'S\'abonner', icon: 'lucideZap', route: '/dashboard/subscription/checkout', queryParams: { plan: 'STARTER' }, ctaColor: '' };
    } else if (plan === 'STARTER') {
      return { show: true, title: 'ZirIA Pro', subtitle: 'Vitesse & Sécurité max', btnText: 'Upgrade Plan', icon: 'lucideCrown', route: '/dashboard/subscription/checkout', queryParams: { plan: 'PRO' }, ctaColor: '' };
    }
    return { show: false, title: '', subtitle: '', btnText: '', icon: '', route: '', queryParams: null, ctaColor: '' };
  });

  onNavClick() {
    // Auto-close on mobile after navigating
    this.closeRequest.emit();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
  }

  getBadgeText(badgeStr?: string): string | null {
    if (!badgeStr) return null;
    if (badgeStr === 'unreadCount') {
      const count = this.socket.unreadCount();
      if (count > 0) return count > 99 ? '99+' : count.toString();
      return null;
    }
    if (badgeStr === 'workerNotifications') {
      const count = this.agrijobApi.unreadNotificationsCount();
      if (count > 0) return count > 99 ? '99+' : count.toString();
      return null;
    }
    if (badgeStr === 'expertMessages') {
      const count = this.expertUnreadCount();
      return count > 99 ? '99+' : count.toString();
    }
    if (badgeStr === 'farmerMessages') {
      const count = this.farmerUnreadCount();
      return count > 99 ? '99+' : count.toString();
    }
    return badgeStr;
  }

  getBadgeIsRead(badgeStr?: string): boolean {
    if (badgeStr === 'expertMessages') return this.expertUnreadCount() === 0;
    if (badgeStr === 'farmerMessages') return this.farmerUnreadCount() === 0;
    return false;
  }
}
