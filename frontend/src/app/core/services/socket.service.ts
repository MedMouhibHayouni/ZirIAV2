import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../state/auth.store';
import { catchError, of } from 'rxjs';

// ─── Canonical notification shape from backend ─────────────────────────────
export interface AppNotification {
  id: string;         // DB id (or client-generated for real-time)
  title: string;
  message: string;
  type: string;       // 'DIAGNOSIS_VALIDATED' | 'B2B_REQUEST' | 'NEW_APPLICATION' | etc.
  payload: any;
  read: boolean;
  created_at: string | Date;
}

export interface DiseaseAlertPayload {
  type: 'disease_alert';
  detection_id: string;
  disease_name: string;
  urgency: 'LOW' | 'MEDIUM' | 'CRITICAL';
  governorate: string;
  confidence_score: number;
  reporter_name: string;
  photo_url: string | null;
}

export interface NewBidPayload {
  type: 'new_bid';
  auction_id: string;
  parcel_id: string;
  amount: number;
  bidder_name: string;
  bid_count: number;
}

export interface NewOrderPayload {
  type: 'new_order';
  order_id: string;
  product_name: string;
  buyer_name: string;
  quantity: number;
  total_price_tnd: number;
}

export interface JobApplicationPayload {
  type: 'job_application';
  offer_id: string;
  worker_name: string;
  task_type: string;
}

// Legacy – kept for backward compat with notification-center helpers
export type SocketEventPayload =
  | DiseaseAlertPayload
  | NewBidPayload
  | NewOrderPayload
  | JobApplicationPayload;

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly auth = inject(AuthStore);
  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);

  private socket: Socket | null = null;

  // ── Reactive notification store ─────────────────────────────────────────
  private readonly _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  // ── Live toast queue (popup on receive) ─────────────────────────────────
  private readonly _toasts = signal<AppNotification[]>([]);
  readonly toasts = this._toasts.asReadonly();

  // ── Per-event signals (for targeted dashboard subscriptions) ────────────
  readonly latestDiseaseAlert = signal<DiseaseAlertPayload | null>(null);
  readonly latestBid          = signal<NewBidPayload | null>(null);
  readonly latestOrder        = signal<NewOrderPayload | null>(null);
  readonly latestJobApp       = signal<JobApplicationPayload | null>(null);
  readonly latestWalletBalance = signal<{ balance_available_tnd: number; balance_pending_tnd: number } | null>(null);
  readonly latestContractPending = signal<{ contract_id: string; contract_type: string; total_amount_tnd: number; reference_id: string } | null>(null);
  readonly latestContractActivated = signal<{ contract_id: string; contract_type: string; reference_id: string } | null>(null);

  // ── Connection state ─────────────────────────────────────────────────────
  readonly isConnected = signal(false);

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Call once from TopbarComponent on init.
   * 1. Fetches persisted notifications from REST API (fills panel immediately).
   * 2. Opens WebSocket connection to /notifications namespace.
   */
  connect(): void {
    this._fetchPersistedNotifications();
    this._openSocket();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected.set(false);
  }

  // ── Persisted fetch ──────────────────────────────────────────────────────

  private _fetchPersistedNotifications(): void {
    const token = this.auth.token();
    if (!token) return;

    this.http.get<any>(`${environment.apiUrl}/notifications?limit=30&page=1`)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe(res => {
        const items: AppNotification[] = (res.items || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.body,
          type: n.type,
          payload: n.payload || {},
          read: n.is_read,
          created_at: n.created_at,
        }));
        this.ngZone.run(() => this._notifications.set(items));
      });
  }

  fetchUnreadCount(): void {
    const token = this.auth.token();
    if (!token) return;
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`)
      .pipe(catchError(() => of({ count: 0 })))
      .subscribe(res => {
        // If WS is not delivering, at least update count from poll
        if (res.count > this.unreadCount()) {
          this._fetchPersistedNotifications();
        }
      });
  }

  // ── WebSocket ────────────────────────────────────────────────────────────

  private _openSocket(): void {
    if (this.socket?.connected) return;

    const token = this.auth.token();
    if (!token) return;

    // FIX: must connect to the /notifications namespace, not the root
    const wsUrl = environment.apiUrl.replace(/\/api$/, ''); // strip /api suffix if present
    this.socket = io(`${wsUrl}/notifications`, {
      transports: ['websocket'], // polling fallback = repeated HTTP + CD wakeups; websocket-only
      auth: { token },
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: 8,
    });

    this._registerHandlers();
  }

  private _registerHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.ngZone.run(() => this.isConnected.set(true));
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[ZirIA WS] connect_error:', err.message);
      this.ngZone.run(() => this.isConnected.set(false));
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => this.isConnected.set(false));
    });

    this.socket.on('wallet_balance_updated', (data: { balance_available_tnd: number; balance_pending_tnd: number }) => {
      this.ngZone.run(() => this.latestWalletBalance.set(data));
    });

    this.socket.on('contract_pending_acceptance', (data: any) => {
      this.ngZone.run(() => {
        this.latestContractPending.set(data);
        const notif: AppNotification = {
          id: `ws_contract_pending_${Date.now()}`,
          title: '📋 Nouveau contrat à accepter',
          message: `Un contrat ${data.contract_type?.replace(/_/g, ' ')} d'un montant de ${Number(data.total_amount_tnd).toFixed(3)} TND vous attend.`,
          type: 'CONTRACT_PENDING',
          payload: data,
          read: false,
          created_at: new Date(),
        };
        this._push(notif);
        this._showToast(notif);
      });
    });

    this.socket.on('contract_activated', (data: any) => {
      this.ngZone.run(() => {
        this.latestContractActivated.set(data);
        const notif: AppNotification = {
          id: `ws_contract_active_${Date.now()}`,
          title: '✅ Contrat activé',
          message: `Le contrat ${data.contract_type?.replace(/_/g, ' ')} a été accepté et est maintenant actif.`,
          type: 'CONTRACT_ACTIVATED',
          payload: data,
          read: false,
          created_at: new Date(),
        };
        this._push(notif);
        this._showToast(notif);
      });
    });


    this.socket.on('notification', (data: { title: string; message: string; payload: any }) => {
      this.ngZone.run(() => {
        const notif: AppNotification = {
          id: `ws_${Date.now()}_${Math.random()}`,
          title: data.title || data.payload?.type || 'Notification',
          message: data.message,
          type: data.payload?.type || 'GENERAL',
          payload: data.payload || {},
          read: false,
          created_at: new Date(),
        };
        this._push(notif);
        this._showToast(notif);

        // Legacy signal hydration for backward compatibility with legacy dashboards
        const payloadType = data.payload?.type;
        if (payloadType === 'disease_alert') {
          this.latestDiseaseAlert.set(data.payload);
        } else if (payloadType === 'new_bid') {
          this.latestBid.set(data.payload);
        } else if (payloadType === 'new_order') {
          this.latestOrder.set(data.payload);
        } else if (payloadType === 'job_application') {
          this.latestJobApp.set(data.payload);
        }
      });
    });
  }

  private _push(notif: AppNotification): void {
    this._notifications.update(list => [notif, ...list].slice(0, 50));
  }

  private _showToast(notif: AppNotification): void {
    this._toasts.update(t => [...t, notif]);
    // Auto-dismiss toast after 6 seconds
    setTimeout(() => this.dismissToast(notif.id), 6000);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * FIX C — écoute d'événements WS arbitraires (ex. negotiation_*).
   * Retourne une fonction de cleanup à appeler au destroy du composant.
   * Le handler est toujours exécuté dans la zone Angular (CD safe).
   */
  onEvent(event: string, handler: (payload: any) => void): () => void {
    if (!this.socket) return () => {};
    const wrapped = (payload: any) => this.ngZone.run(() => handler(payload));
    this.socket.on(event, wrapped);
    return () => { this.socket?.off(event, wrapped); };
  }

  offEvent(event: string): void {
    this.socket?.off(event);
  }

  dismissToast(id: string): void {
    this._toasts.update(t => t.filter(n => n.id !== id));
  }

  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    // Sync to backend (fire-and-forget, skip if ws_ id)
    if (!id.startsWith('ws_')) {
      this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {})
        .pipe(catchError(() => of(null))).subscribe();
    }
  }

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {})
      .pipe(catchError(() => of(null))).subscribe();
  }

  clearAll(): void {
    this._notifications.set([]);
  }
}
