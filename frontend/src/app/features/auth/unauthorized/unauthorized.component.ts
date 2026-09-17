import {  Component, inject , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/state/auth.store';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideLock } from '@ng-icons/lucide';

/**
 * UnauthorizedComponent — Page 403
 * Affichée quand un utilisateur authentifié tente d'accéder
 * à une route pour laquelle son rôle n'est pas autorisé.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-unauthorized',
  standalone: true,
  imports: [NgIconComponent],
  providers: [provideIcons({ lucideLock 
})],
  template: `
    <div class="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-6">
      <div class="text-center max-w-md">
        <!-- Icon -->
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20
                    flex items-center justify-center">
          <ng-icon name="lucideLock" class="text-4xl text-red-500"></ng-icon>
        </div>

        <!-- Code -->
        <p class="text-red-500 font-mono text-sm font-bold tracking-widest uppercase mb-2">
          Erreur 403
        </p>

        <!-- Title -->
        <h1 class="text-3xl font-black text-white mb-3">Accès Refusé</h1>

        <!-- Message -->
        <p class="text-slate-400 text-base mb-2">
          Votre rôle <span class="font-bold text-amber-400">{{ auth.role() ?? 'inconnu' }}</span>
          ne vous autorise pas à accéder à cette section.
        </p>
        <p class="text-slate-500 text-sm mb-8">
          Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        <!-- Actions -->
        <div class="flex gap-3 justify-center">
          <button (click)="goBack()"
                  class="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300
                         hover:bg-white/5 transition-colors text-sm font-semibold">
            ← Retour
          </button>
          <button (click)="goHome()"
                  class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600
                         text-white transition-colors text-sm font-semibold shadow-lg shadow-emerald-500/30">
            Tableau de bord
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {
  protected auth   = inject(AuthStore);
  private   router = inject(Router);

  /** Rôle → route par défaut de son dashboard */
  private readonly ROLE_HOME: Record<string, string> = {
    ADMIN:            '/dashboard/admin',
    COOP_PRESIDENT:   '/dashboard/smsa',
    EXPERT:           '/dashboard/expert',
    B2B_BUYER:        '/dashboard/b2b',
    EQUIP_OWNER:      '/dashboard/equipment',
    FARMER:           '/dashboard/farmer',
    FARMER_AMBASSADOR:'/dashboard/ambassador',
    DRIVER:           '/dashboard/driver',
    WORKER:           '/dashboard/worker',
    LAND_OWNER:       '/dashboard/land_owner',
  };

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    const role = this.auth.role();
    const home = role ? (this.ROLE_HOME[role] ?? '/') : '/';
    this.router.navigateByUrl(home);
  }
}
