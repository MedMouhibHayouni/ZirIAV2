import {  Component, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideLock, lucideArrowRight, lucideFingerprint, lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { AuthStore, AuthUser } from '../../../core/state/auth.store';

/** Maps each backend Role enum value to its dedicated dashboard route */
const ROLE_ROUTE_MAP: Record<string, string> = {
  ADMIN:            '/dashboard/admin',
  COOP_PRESIDENT:   '/dashboard/smsa',
  B2B_BUYER:        '/dashboard/b2b',
  EQUIP_OWNER:      '/dashboard/equipment',
  FARMER:           '/dashboard/farmer',
  FARMER_AMBASSADOR:'/dashboard/ambassador', // Dedicated ambassador dashboard
  WORKER:           '/dashboard/worker',
  DRIVER:           '/dashboard/driver',
  SUPPLIER:         '/dashboard/supplier',
  LAND_OWNER:       '/dashboard/land_owner',
  EXPERT:           '/dashboard/expert',
  INSTITUTION:      '/dashboard/apia',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterLink],
  providers: [provideIcons({ lucideMail, lucideLock, lucideArrowRight, lucideFingerprint, lucideEye, lucideEyeOff 
})],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  emailOrPhone = '';
  password = '';
  
  loading = signal(false);
  errorMsg = signal('');
  
  loginType: 'email' | 'phone' = 'email';
  showPassword = signal(false);

  toggleLoginType(type: 'email' | 'phone') {
    this.loginType = type;
    this.emailOrPhone = '';
    this.errorMsg.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  login() {
    this.loading.set(true);
    this.errorMsg.set('');

    const input = (this.emailOrPhone || '').trim();
    const isEmail = input.includes('@');
    const payload = isEmail 
      ? { email: input, password: this.password }
      : { phone: input, password: this.password };

    this.http.post<{ access_token: string; user: { id: string; role: string; name: string; email?: string; plan?: string; activity_type?: string | null; expert_type?: string | null; equipment_type?: string | null } }>(
      `${environment.apiUrl}/auth/login`,
      payload
    ).subscribe({
      next: (res) => {
        const authUser: AuthUser = {
          id: res.user.id || '',
          name: res.user.name,
          email: res.user.email || this.emailOrPhone,
          role: res.user.role,
          plan: res.user.plan || 'FREE',
          activity_type: (res.user as any).activity_type || null,
          expert_type: res.user.expert_type || null,
          equipment_type: res.user.equipment_type || null,
          institution_type: (res.user as any).institution_type || ((res.user.email || this.emailOrPhone || '').toLowerCase().includes('.crda.') ? 'CRDA' : 'APIA'),
          institutionMember: (res.user as any).institutionMember || null,
        };
        
        this.authStore.setSession(res.access_token, authUser);
        this.loading.set(false);
        
        let route = ROLE_ROUTE_MAP[res.user.role] ?? '/dashboard/b2b';
        if (res.user.role === 'EQUIP_OWNER' && res.user.equipment_type === 'Frigoriste') {
          route = '/dashboard/storage/overview';
        } else if (res.user.role === 'INSTITUTION') {
          const email = (res.user.email || this.emailOrPhone || '').toLowerCase();
          route = email.includes('.crda.') ? '/dashboard/crda/overview' : '/dashboard/apia/overview';
        }
        this.router.navigate([route]);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401 || err.status === 400 || err.status === 404) {
          this.errorMsg.set('Identifiants incorrects. Vérifiez vos informations.');
        } else {
          this.errorMsg.set('Impossible de joindre le serveur. Veuillez réessayer plus tard.');
        }
      }
    });
  }
}
