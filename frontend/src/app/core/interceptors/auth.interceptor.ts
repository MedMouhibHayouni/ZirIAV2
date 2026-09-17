import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take } from 'rxjs';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Auth Interceptor — Sprint 9
 * 1. Injecte le Bearer Token JWT sur toutes les requêtes sortantes
 * 2. Gère la redirection automatique sur erreur 401 (Token expiré)
 * 3. Tente un refresh_token avant de déconnecter l'utilisateur
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem('access_token');

  const isPublicRequest = req.url.includes('open-meteo.com') || 
                          req.url.includes('/auth/login') ||
                          req.url.includes('/auth/register') ||
                          req.url.includes('/auth/refresh') ||
                          req.url.includes('/subscriptions/plans');

  const clonedReq = (!isPublicRequest && token)
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicRequest) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          const refreshToken = localStorage.getItem('refresh_token');

          if (refreshToken) {
            return http.post<{ access_token: string }>(`${environment.apiUrl}/auth/refresh`, { refresh_token: refreshToken }).pipe(
              switchMap((res: any) => {
                isRefreshing = false;
                localStorage.setItem('access_token', res.access_token);
                refreshTokenSubject.next(res.access_token);
                return next(req.clone({ headers: req.headers.set('Authorization', `Bearer ${res.access_token}`) }));
              }),
              catchError((err) => {
                isRefreshing = false;
                logout(router);
                return throwError(() => err);
              })
            );
          } else {
            isRefreshing = false;
            logout(router);
            return throwError(() => error);
          }
        } else {
          return refreshTokenSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap((t) => next(req.clone({ headers: req.headers.set('Authorization', `Bearer ${t}`) })))
          );
        }
      }
      return throwError(() => error);
    })
  );
};

function logout(router: Router) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('current_user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  
  const currentUrl = router.url.split('?')[0];
  if (currentUrl !== '/' && currentUrl !== '/register' && currentUrl !== '/login') {
    router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
  }
}
