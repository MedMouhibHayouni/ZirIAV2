import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationStore } from '../state/notification.store';

/**
 * Error Interceptor — Sprint 9
 * Intercepte les erreurs 4xx/5xx et affiche un message propre via le NotificationStore.
 * Empêche les erreurs silencieuses ou les blocs d'application.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationStore = inject(NotificationStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 is already handled by authInterceptor, skip here
      if (error.status === 401) {
        return throwError(() => error);
      }

      let userMessage = 'Une erreur inattendue s\'est produite.';

      switch (error.status) {
        case 0:
          userMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
          break;
        case 400:
          userMessage = `Requête invalide : ${error.error?.message || 'Vérifiez vos données.'}`;
          break;
        case 403:
          userMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
          break;
        case 404:
          userMessage = 'Ressource introuvable.';
          break;
        case 422:
          userMessage = `Erreur de validation : ${error.error?.message || 'Données incorrectes.'}`;
          break;
        case 500:
          userMessage = 'Erreur serveur interne. L\'équipe technique a été notifiée.';
          break;
        case 503:
          userMessage = 'Service temporairement indisponible. Réessayez dans quelques instants.';
          break;
      }

      notificationStore.showError(userMessage);
      return throwError(() => error);
    })
  );
};
