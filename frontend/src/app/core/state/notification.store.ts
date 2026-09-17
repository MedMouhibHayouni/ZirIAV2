import { Injectable, signal, computed } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

/**
 * NotificationStore — Sprint 9
 * Store léger Signal-based pour les toasts/snackbars globaux.
 * Consommé par le NotificationComponent dans le layout racine.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly hasNotifications = computed(() => this._notifications().length > 0);

  showSuccess(message: string) {
    this._push({ type: 'success', message });
  }

  showError(message: string) {
    this._push({ type: 'error', message });
  }

  showWarning(message: string) {
    this._push({ type: 'warning', message });
  }

  showInfo(message: string) {
    this._push({ type: 'info', message });
  }

  dismiss(id: string) {
    this._notifications.update(n => n.filter(x => x.id !== id));
  }

  private _push(partial: Omit<Notification, 'id'>) {
    const id = `notif_${Date.now()}`;
    this._notifications.update(n => [...n, { ...partial, id }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => this.dismiss(id), 5000);
  }
}
