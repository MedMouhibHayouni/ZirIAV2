import {  Component, inject, Input, Output, EventEmitter, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSun, lucideMoon, lucideLanguages, lucideUserCircle, lucideBell,
  lucideSearch, lucideChevronDown, lucideLogOut, lucideSettings, lucideZap, lucideMenu, lucideX, lucideLeaf,
  lucideShield, lucideCrown
} from '@ng-icons/lucide';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, NgIconComponent, NotificationCenterComponent, RouterLink],
  providers: [provideIcons({
    lucideSun, lucideMoon, lucideLanguages, lucideUserCircle, lucideBell,
    lucideSearch, lucideChevronDown, lucideLogOut, lucideSettings, lucideZap, lucideMenu, lucideX, lucideLeaf,
    lucideShield, lucideCrown
  
})],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit {
  @Input()  navOpen = false;
  @Output() hamburgerClick = new EventEmitter<void>();

  theme     = inject(ThemeService);
  lang      = inject(LanguageService);
  auth      = inject(AuthService);
  private socket = inject(SocketService);
  private http = inject(HttpClient);

  private router = inject(Router);

  supplierPlan = signal<any>(null);
  readonly wsConnected = this.socket.isConnected;

  // Profile dropdown toggle
  profileDropdownOpen = signal(false);

  // Computed: profile picture URL from reactive auth store
  userPictureUrl = computed(() => this.auth.currentUser()?.profile_picture_url ?? null);
  
  // Polled unread count
  ngOnInit(): void {
    this.socket.connect();

    const role = this.auth.currentUser()?.role;
    if (role === 'SUPPLIER') {
      this.http.get<any>(`${environment.apiUrl}/supplier/plans/my-subscription`).subscribe({
        next: (sub) => {
          this.supplierPlan.set(sub?.plan);
        },
        error: () => {}
      });
    }
  }

  get userName(): string {
    return this.auth.currentUser()?.name ?? localStorage.getItem('user_name') ?? 'Utilisateur';
  }

  get userRole(): string {
    const r = this.auth.currentUser()?.role ?? localStorage.getItem('user_role') ?? '';
    const labels: Record<string, string> = {
      ADMIN: 'Super Admin', COOP_PRESIDENT: 'Président SMSA',
      FARMER: 'Agriculteur', B2B_BUYER: 'Acheteur B2B',
      EXPERT: 'Expert Agri', EQUIP_OWNER: 'Équipements',
      WORKER: 'Travailleur', DRIVER: 'Transporteur', LAND_OWNER: 'Propriétaire'
    };
    return labels[r] ?? r;
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  getInitials(): string {
    const name = this.userName;
    if (!name) return 'Z';
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  toggleProfileDropdown(event?: Event) {
    event?.stopPropagation();
    this.profileDropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.profileDropdownOpen.set(false);
  }

  goToProfile() {
    this.profileDropdownOpen.set(false);
    this.router.navigate(['/dashboard/profile']);
  }

  doLogout() {
    this.profileDropdownOpen.set(false);
    this.auth.logout();
  }

  userPlan = computed(() => this.auth.currentUser()?.plan ?? 'FREE');
  
  subscriptionCta = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === 'SUPPLIER') {
      const plan = this.supplierPlan();
      if (!plan) {
        return {
          show: true,
          btnText: 'S\'abonner',
          icon: 'lucideZap',
          route: '/dashboard/supplier/subscription',
          queryParams: null
        };
      } else if (plan.plan_code === 'VITRINE_BASIC' || plan.plan_code === 'VITRINE_PRO' || plan.plan_code === 'ERP_STARTER') {
        return {
          show: true,
          btnText: 'Upgrade',
          icon: 'lucideCrown',
          route: '/dashboard/supplier/subscription',
          queryParams: null
        };
      }
      return { show: false, btnText: '', icon: '', route: '', queryParams: null };
    }

    const plan = this.userPlan();
    if (plan === 'FREE') {
      return { show: true, btnText: 'S\'abonner', icon: 'lucideZap', route: '/dashboard/subscription/checkout', queryParams: { plan: 'STARTER' } };
    } else if (plan === 'STARTER') {
      return { show: true, btnText: 'Upgrade', icon: 'lucideShield', route: '/dashboard/subscription/checkout', queryParams: { plan: 'PRO' } };
    }
    return { show: false, btnText: '', icon: '', route: '', queryParams: null };
  });
}
