import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthStore } from '../state/auth.store';

/**
 * authGuard — Vérifie uniquement qu'une session existe.
 * À placer sur le parent "dashboard" pour bloquer tous les enfants
 * si l'utilisateur n'est pas authentifié.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Pas de session → page de login
  return router.createUrlTree(['/login']);
};

/**
 * roleGuard — Vérifie le rôle de l'utilisateur connecté.
 * Lit la liste des rôles autorisés depuis `route.data['roles']`.
 *
 * Si l'utilisateur est connecté mais n'a pas le bon rôle →
 * redirection vers /unauthorized (page 403).
 *
 * Usage dans app.routes.ts :
 *   canActivate: [roleGuard],
 *   data: { roles: ['ADMIN', 'EXPERT'] }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthStore);
  const router = inject(Router);

  // 1. Pas connecté → login
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // 2. Récupérer les rôles autorisés déclarés sur la route
  const allowedRoles: string[] = route.data['roles'] ?? [];

  // 3. Si aucune restriction déclarée → accès libre pour les authentifiés
  if (allowedRoles.length === 0) {
    return true;
  }

  const userRole = auth.role();

  // 4. ADMIN passe toujours (super-utilisateur)
  if (userRole === 'ADMIN') {
    return true;
  }

  // 5. Vérifier si le rôle courant est dans la liste autorisée
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // 6. Rôle insuffisant → page 403
  return router.createUrlTree(['/unauthorized']);
};

/**
 * dashboardRedirectGuard — Redirige /dashboard vide vers le dashboard du rôle.
 * Évite le flash "b2b" pour FARMER/MIXTE etc. (bug signalé: mixte normal puis refresh).
 */
export const dashboardRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const role = auth.role();
  const user = auth.currentUser();
  const map: Record<string, string> = {
    ADMIN: '/dashboard/admin/overview',
    COOP_PRESIDENT: '/dashboard/smsa/overview',
    B2B_BUYER: '/dashboard/b2b/sourcing',
    SUPPLIER: '/dashboard/supplier/overview',
    EQUIP_OWNER: user?.equipment_type === 'Frigoriste' ? '/dashboard/storage/overview' : '/dashboard/equipment/calendar',
    FARMER: '/dashboard/farmer/dashboard',
    FARMER_AMBASSADOR: '/dashboard/ambassador/overview',
    WORKER: '/dashboard/worker/profile',
    DRIVER: '/dashboard/driver/profil',
    LAND_OWNER: '/dashboard/land_owner/lands',
    EXPERT: '/dashboard/expert/overview',
    INSTITUTION: user?.institution_type === 'CRDA' || user?.institutionMember?.institution?.type === 'CRDA' ? '/dashboard/crda/overview' : '/dashboard/apia/overview',
  };
  const target = map[role ?? ''] ?? '/dashboard/b2b/sourcing';
  return router.createUrlTree([target]);
};
