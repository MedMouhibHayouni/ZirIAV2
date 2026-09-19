import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../state/auth.store';

const ROLE_ROUTE_MAP: Record<string, string> = {
  ADMIN:            '/dashboard/admin',
  COOP_PRESIDENT:   '/dashboard/smsa',
  B2B_BUYER:        '/dashboard/b2b',
  EQUIP_OWNER:      '/dashboard/equipment',
  FARMER:           '/dashboard/farmer',
  FARMER_AMBASSADOR:'/dashboard/ambassador',
  WORKER:           '/dashboard/worker',
  DRIVER:           '/dashboard/driver',
  SUPPLIER:         '/dashboard/supplier',
  LAND_OWNER:       '/dashboard/land_owner',
  EXPERT:           '/dashboard/expert',
  INSTITUTION:      '/dashboard/apia',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan?: string;
  profile_picture_url?: string | null;
  language?: string | null;
  expert_type?: string | null;
  institution_type?: 'APIA' | 'CRDA' | null;
  institutionMember?: any;
  activity_type?: 'CROP' | 'LIVESTOCK' | 'MIXED' | null;
  equipment_type?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authStore = inject(AuthStore);
  private router = inject(Router);

  // Source of truth: Delegate to AuthStore signals to ensure single reactive state
  currentUser = computed<User | null>(() => {
    const storeUser = this.authStore.currentUser();
    if (!storeUser) return null;
    return {
      id: storeUser.id,
      name: storeUser.name,
      email: storeUser.email,
      role: storeUser.role,
      plan: storeUser.plan,
      profile_picture_url: storeUser.profile_picture_url,
      language: storeUser.language,
      expert_type: storeUser.expert_type,
      activity_type: storeUser.activity_type,
      equipment_type: storeUser.equipment_type,
    };
  });

  isAuthenticated = computed(() => this.authStore.isAuthenticated());

  dashboardRoute = computed(() => {
    const user = this.currentUser();
    if (!user) return '/login';
    if (user.role === 'EQUIP_OWNER' && user.equipment_type === 'Frigoriste') {
      return '/dashboard/storage/overview';
    }
    if (user.role === 'INSTITUTION') {
      return user.institution_type === 'CRDA' ? '/dashboard/crda' : '/dashboard/apia';
    }
    return ROLE_ROUTE_MAP[user.role] ?? '/dashboard/b2b';
  });

  login(token: string, user: User) {
    this.authStore.setSession(token, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      profile_picture_url: user.profile_picture_url,
      language: user.language,
      expert_type: user.expert_type,
      activity_type: user.activity_type,
      equipment_type: user.equipment_type,
      institution_type: (user as any).institution_type ?? null,
      institutionMember: (user as any).institutionMember ?? null,
    } as any);
    this.router.navigate([this.dashboardRoute()]);
  }

  getToken(): string | null {
    return this.authStore.token();
  }

  updateUser(user: Partial<User>) {
    this.authStore.updateUser(user);
  }

  logout() {
    this.authStore.clearSession();
    this.router.navigate(['/']);
  }
}
