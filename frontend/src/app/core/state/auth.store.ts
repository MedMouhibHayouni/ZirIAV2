import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AuthUser {
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
  governorate_zones?: string[];
  certifications?: string[];
  bio?: string;
  consultation_rate_tnd?: number;
}

/**
 * AuthStore — Sprint 9
 * Store Signal-based centralisé pour l'état d'authentification.
 * Source de vérité unique pour le token, le user courant, et les permissions par rôle.
 * Compatible Angular 17+ (Signals). Pas de NgRx requis.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);

  // Signals
  private _user = signal<AuthUser | null>(null);
  private _token = signal<string | null>(null);
  private _hydrated = signal(false);

  // Computed (lecture seule)
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null && this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly isHydrated = this._hydrated.asReadonly();

  // Role guards (computed)
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly isB2B = computed(() => this._user()?.role === 'B2B_BUYER');
  readonly isSMSA = computed(() => this._user()?.role === 'COOP_PRESIDENT' || this._user()?.role === 'SMSA');
  readonly isExpert = computed(() => this._user()?.role === 'EXPERT');
  readonly isFarmer = computed(() => this._user()?.role === 'FARMER');

  constructor() {
    this._hydrateFromLocalStorage();
    this._refreshFromServer();
  }

  setSession(token: string, user: AuthUser) {
    this._token.set(token);
    this._user.set(user);
    localStorage.setItem('access_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
  }

  updateUser(user: Partial<AuthUser>) {
    const current = this._user();
    if (current) {
      const updated = { ...current, ...user };
      this._user.set(updated);
      localStorage.setItem('current_user', JSON.stringify(updated));
    }
  }

  clearSession() {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
  }

  private _hydrateFromLocalStorage() {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('current_user');
    const role = localStorage.getItem('user_role');

    if (token) {
      this._token.set(token);
    }

    if (userStr) {
      try {
        const parsed: AuthUser = JSON.parse(userStr);
        if (role) parsed.role = role;
        this._user.set(parsed);
      } catch {
        this.clearSession();
      }
    }
  }

  private _refreshFromServer() {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this._hydrated.set(true);
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (serverUser) => {
        if (serverUser) {
          const updated: AuthUser = {
            id: serverUser.id,
            name: serverUser.name,
            email: serverUser.email,
            role: serverUser.role,
            plan: serverUser.plan || 'FREE',
            profile_picture_url: serverUser.profile_picture_url || null,
            language: serverUser.language || null,
            expert_type: serverUser.expert_type || null,
            institution_type: serverUser.institution_type || null,
            institutionMember: serverUser.institutionMember || null,
            activity_type: serverUser.activity_type || null,
            equipment_type: serverUser.equipment_type || null,
            governorate_zones: serverUser.governorate_zones || [],
            certifications: serverUser.certifications || [],
            bio: serverUser.bio || '',
            consultation_rate_tnd: serverUser.consultation_rate_tnd || 0,
          };
          this._user.set(updated);
          localStorage.setItem('current_user', JSON.stringify(updated));
        }
        this._hydrated.set(true);
      },
      error: () => {
        this._hydrated.set(true);
      }
    });
  }
}
