import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideUsers, lucideMessageSquare,
  lucideSprout, lucideStethoscope
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { io, Socket } from 'socket.io-client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-expert-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NgIconComponent],
  providers: [provideIcons({
    lucideSearch, lucideUsers, lucideMessageSquare,
    lucideSprout, lucideStethoscope
  })],
  template: `
    <div class="expert-hub">
      <!-- Tab bar -->
      <nav class="hub-tabs">
        <a class="hub-tab"
           routerLink="discover"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{exact: true}">
          <span class="tab-icon"><ng-icon name="lucideSearch"></ng-icon></span>
          <span class="tab-label">Découvrir</span>
          <span class="tab-desc">Trouver un expert</span>
        </a>
        <a class="hub-tab"
           routerLink="mes-experts"
           routerLinkActive="active">
          <span class="tab-icon"><ng-icon name="lucideUsers"></ng-icon></span>
          <span class="tab-label">Mes Experts</span>
          <span class="tab-desc">Vos experts liés</span>
        </a>
        <a class="hub-tab"
           routerLink="messages"
           routerLinkActive="active">
          <span class="tab-icon"><ng-icon name="lucideMessageSquare"></ng-icon></span>
          <span class="tab-label">Messages</span>
          <span class="tab-desc">Vos conversations</span>
          <span class="msg-badge" [class.unread]="unreadCount() > 0" [class.read]="unreadCount() === 0">
            {{ unreadCount() }}
          </span>
        </a>
      </nav>

      <!-- Content area -->
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .expert-hub {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-primary);
    }

    /* ── Tab Bar ────────────────────────── */
    .hub-tabs {
      display: flex;
      gap: 2px;
      padding: 12px 16px 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .hub-tab {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 12px 12px 0 0;
      text-decoration: none;
      color: var(--text-muted);
      transition: all 0.2s;
      position: relative;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      margin-bottom: -1px;
    }

    .hub-tab:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.03);
    }

    .hub-tab.active {
      color: var(--zir-emerald);
      background: var(--bg-primary);
      border-color: var(--border);
    }

    .hub-tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--zir-emerald);
    }

    .tab-icon ng-icon {
      width: 20px;
      height: 20px;
      display: block;
    }

    .tab-label {
      font-size: 0.9rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .tab-desc {
      display: none;
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .hub-tab.active .tab-desc {
      color: var(--text-secondary);
    }

    /* Tab content area */
    .hub-content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-primary);
    }

    .msg-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 800;
      line-height: 1;
      margin-left: auto;
    }
    .msg-badge.unread { background: #ef4444; color: white; }
    .msg-badge.read { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }

    @media (min-width: 900px) {
      .hub-tab {
        padding: 14px 24px;
      }
      .tab-desc {
        display: block;
      }
    }

    @media (max-width: 600px) {
      .hub-tabs {
        gap: 0;
        padding: 8px 8px 0;
      }
      .hub-tab {
        flex: 1;
        justify-content: center;
        padding: 10px 8px;
      }
      .tab-label {
        font-size: 0.78rem;
      }
      .tab-icon ng-icon {
        width: 18px;
        height: 18px;
      }
    }
  `]
})
export class FarmerExpertHubComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly unreadCount = signal(0);

  ngOnInit() {
    this.loadUnreadCount();
    this.connectSocket();
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }

  private loadUnreadCount() {
    const token = this.auth.getToken();
    if (!token) return;
    this.http.get<{ count: number }>(`${environment.apiUrl}/expert/messages/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => this.unreadCount.set(res.count ?? 0),
      error: () => {}
    });
  }

  private connectSocket() {
    const token = this.auth.getToken();
    if (!token) return;
    this.socket = io(`${environment.apiUrl}/expert-dashboard`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 8000,
      reconnectionAttempts: 5,
    });
    this.socket.on('connect', () => {});
    this.socket.on('stats_update', () => this.loadUnreadCount());
    this.socket.on('new_message', () => this.loadUnreadCount());
  }}
