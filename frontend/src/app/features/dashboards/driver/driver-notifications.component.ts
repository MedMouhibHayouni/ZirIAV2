import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBell, lucideTruck, lucideCheckCircle, lucideDollarSign,
  lucideAlertCircle, lucideInfo, lucideStar, lucideX
} from '@ng-icons/lucide';
import { SocketService, AppNotification } from '../../../core/services/socket.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-notifications',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideBell, lucideTruck, lucideCheckCircle, lucideDollarSign,
    lucideAlertCircle, lucideInfo, lucideStar, lucideX
  })],
  template: `
    <div class="driver-notifs zir-animate-in">
      <div class="notifs-header">
        <h1><ng-icon name="lucideBell"></ng-icon> Notifications</h1>
        <p>Vos alertes, paiements et mises à jour en temps réel.</p>
        @if (unreadCount() > 0) {
          <button class="mark-all-btn" (click)="markAllRead()">
            <ng-icon name="lucideCheckCircle"></ng-icon>
            Tout marquer comme lu
          </button>
        }
      </div>

      <div class="notifs-list">
        @for (notif of notifications(); track notif.id) {
          <div class="notif-item" [class.unread]="!notif.read" (click)="markRead(notif)">
            <div class="notif-icon" [ngClass]="'type-' + notif.type.toLowerCase()">
              @if (notif.type === 'CHAT_MESSAGE') { <ng-icon name="lucideBell"></ng-icon> }
              @else if (notif.type === 'TRANSPORT_ACCEPTED') { <ng-icon name="lucideCheckCircle"></ng-icon> }
              @else if (notif.type === 'TRANSPORT_UPDATE') { <ng-icon name="lucideTruck"></ng-icon> }
              @else { <ng-icon name="lucideInfo"></ng-icon> }
            </div>
            <div class="notif-body">
              <div class="notif-title">{{ notif.title }}</div>
              <div class="notif-msg">{{ notif.message }}</div>
              <div class="notif-time">{{ notif.created_at | date:'dd MMM, HH:mm' }}</div>
            </div>
            @if (!notif.read) { <div class="unread-dot"></div> }
            <button class="dismiss-btn" (click)="$event.stopPropagation(); dismiss(notif)">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>
        } @empty {
          <div class="empty-notifs">
            <ng-icon name="lucideBell"></ng-icon>
            <h3>Aucune notification</h3>
            <p>Vous êtes à jour ! Nous vous alerterons pour les nouvelles missions et paiements.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .driver-notifs { padding: 2rem; max-width: 720px; margin: 0 auto; }

    .notifs-header {
      display: flex; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 2rem;

      h1 {
        font-size: 1.75rem; font-weight: 800; color: var(--text-primary);
        display: flex; align-items: center; gap: 12px; margin: 0 0 4px; width: 100%;
        ng-icon { color: var(--zir-emerald); }
      }
      p { font-size: 0.95rem; color: var(--text-muted); margin: 0; flex: 1; }

      .mark-all-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 16px; border-radius: 10px;
        background: var(--bg-card); border: 1px solid var(--border-color);
        color: var(--text-secondary); font-size: 13px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease;
        &:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
        ng-icon { font-size: 14px; }
      }
    }

    .notifs-list { display: flex; flex-direction: column; gap: 10px; }

    .notif-item {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex; align-items: flex-start; gap: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;

      &:hover { transform: translateX(4px); border-color: rgba(16,185,129,0.2); }

      &.unread {
        background: rgba(16,185,129,0.02);
        border-color: rgba(16,185,129,0.15);
        .notif-title { font-weight: 800; }
      }

      .notif-icon {
        width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 18px;

        &.type-chat_message { background: rgba(16,185,129,0.1); color: var(--zir-emerald); }
        &.type-transport_accepted { background: rgba(16,185,129,0.1); color: var(--zir-emerald); }
        &.type-transport_update { background: rgba(59,130,246,0.1); color: #3b82f6; }
      }

      .notif-body {
        flex: 1;
        .notif-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .notif-msg { font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
        .notif-time { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-weight: 600; }
      }

      .unread-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--zir-emerald); flex-shrink: 0; margin-top: 4px;
      }

      .dismiss-btn {
        background: none; border: none; cursor: pointer;
        color: var(--text-muted); padding: 2px; opacity: 0;
        transition: opacity 0.2s ease;
        display: flex; align-items: center;
        ng-icon { font-size: 14px; }
        &:hover { color: #ef4444; }
      }

      &:hover .dismiss-btn { opacity: 1; }
    }

    .empty-notifs {
      display: flex; flex-direction: column; align-items: center;
      padding: 80px 24px; text-align: center;
      background: var(--bg-card); border: 1px dashed var(--border-color);
      border-radius: 16px;

      ng-icon { font-size: 3rem; color: var(--text-muted); opacity: 0.3; margin-bottom: 1rem; }
      h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
      p { font-size: 0.9rem; color: var(--text-muted); margin: 0; max-width: 380px; }
    }

    @media (max-width: 768px) { .driver-notifs { padding: 1rem; } }
  `]
})
export class DriverNotificationsComponent {
  public readonly socket = inject(SocketService);

  notifications = () => this.socket.notifications();
  unreadCount = () => this.socket.unreadCount();

  markRead(notif: AppNotification) {
    this.socket.markRead(notif.id);
  }

  markAllRead() {
    this.socket.markAllRead();
  }

  dismiss(notif: AppNotification) {
    this.socket.markRead(notif.id);
  }
}
