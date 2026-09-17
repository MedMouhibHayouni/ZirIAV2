import {  Component, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight, lucideUser, lucideMail, lucidePhone, lucideLock,
  lucideMapPin, lucideBuilding, lucideCheckCircle2, lucideChevronLeft,
  lucideEye, lucideEyeOff
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { AuthStore, AuthUser } from '../../../core/state/auth.store';
import { TUNISIA_GOVERNORATES } from '../../../core/constants/governorates';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterLink],
  providers: [provideIcons({
    lucideArrowRight, lucideUser, lucideMail, lucidePhone, lucideLock,
    lucideMapPin, lucideBuilding, lucideCheckCircle2, lucideChevronLeft,
    lucideEye, lucideEyeOff
})],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authStore = inject(AuthStore);

  step = signal(1);
  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Form Data
  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role = 'FARMER';
  governorate = '';
  coopName = '';

  // Liste canonique partagée (core/constants/governorates) — ne pas dupliquer
  governorates: readonly string[] = TUNISIA_GOVERNORATES;

  roles = [
    { id: 'FARMER', name: 'Agriculteur', color: '#2D6A4F' },
    { id: 'COOP_PRESIDENT', name: 'Coopérative', color: '#40916C' },
    { id: 'B2B_BUYER', name: 'Acheteur B2B', color: '#1D3557' },
    { id: 'SUPPLIER', name: 'Fournisseur', color: '#E76F51' },
    { id: 'EQUIP_OWNER', name: 'Équipementier', color: '#2A9D8F' },
    { id: 'DRIVER', name: 'Chauffeur', color: '#264653' },
    { id: 'LAND_OWNER', name: 'Propriétaire', color: '#8B5CF6' }
  ];

  targetPlan = '';

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        const found = this.roles.find(r => r.id === params['role']);
        if (found) this.role = found.id;
      }
      if (params['plan']) {
        this.targetPlan = params['plan'];
      }
    });
  }

  nextStep() {
    this.errorMsg.set('');
    
    if (this.step() === 1) {
      if (!this.name || !this.email || !this.password) {
        this.errorMsg.set('Veuillez remplir tous les champs obligatoires.');
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMsg.set('Les mots de passe ne correspondent pas.');
        return;
      }
    }
    
    if (this.step() === 2) {
      if (!this.role) {
        this.errorMsg.set('Veuillez sélectionner un rôle.');
        return;
      }
    }

    this.step.set(this.step() + 1);
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(v => !v);
  }

  prevStep() {
    this.step.set(this.step() - 1);
    this.errorMsg.set('');
  }

  submit() {
    this.errorMsg.set('');
    if (!this.governorate) {
      this.errorMsg.set('Veuillez sélectionner un gouvernorat.');
      return;
    }

    this.loading.set(true);

    const normalizedPhone = this.phone?.trim() || undefined;
    const normalizedEmail = this.email?.trim().toLowerCase() || this.email;
    const payload: any = {
      name: this.name?.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: this.password,
      role: this.role,
      governorate: this.governorate?.trim() || undefined,
    };
    // Only send coopName if backend DTO now accepts it (whitelisted)
    if (this.role === 'COOP_PRESIDENT' && this.coopName?.trim()) {
      payload.coopName = this.coopName.trim();
    }

    this.http.post<{ access_token: string; user: any }>(
      `${environment.apiUrl}/auth/register`,
      payload
    ).subscribe({
      next: (res) => {
        const authUser: AuthUser = {
          id: res.user.id || '',
          name: res.user.name,
          email: res.user.email || this.email,
          role: res.user.role,
          plan: (res.user.plan || 'FREE'),
          activity_type: (res.user as any).activity_type || null,
          expert_type: (res.user as any).expert_type || null,
          equipment_type: (res.user as any).equipment_type || null,
        };
        this.authStore.setSession(res.access_token, authUser);
        this.loading.set(false);

        if (this.targetPlan) {
          this.router.navigate(['/dashboard/subscription/checkout'], { queryParams: { plan: this.targetPlan } });
        } else if (res.user.role === 'FARMER') {
          this.router.navigate(['/onboarding/activity']);
        } else {
          const ROLE_ROUTE_MAP: Record<string,string> = {
            ADMIN:'/dashboard/admin', COOP_PRESIDENT:'/dashboard/smsa',
            B2B_BUYER:'/dashboard/b2b', SUPPLIER:'/dashboard/supplier',
            EQUIP_OWNER:'/dashboard/equipment', WORKER:'/dashboard/worker',
            DRIVER:'/dashboard/driver', LAND_OWNER:'/dashboard/land_owner',
            EXPERT:'/dashboard/expert', FARMER_AMBASSADOR:'/dashboard/ambassador'
          };
          const route = ROLE_ROUTE_MAP[res.user.role] ?? '/dashboard/b2b';
          this.router.navigate([route]);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Erreur lors de la création du compte.');
      }
    });
  }
}
