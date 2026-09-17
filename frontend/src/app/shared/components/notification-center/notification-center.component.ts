import { Component, inject, signal, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBell, lucideX, lucideCheckCheck, lucideShieldAlert,
  lucideGavel, lucideShoppingBag, lucideBriefcase, lucideInfo,
  lucideLeaf, lucideAlertTriangle, lucideMail
} from '@ng-icons/lucide';
import { SocketService, AppNotification } from '../../../core/services/socket.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideBell, lucideX, lucideCheckCheck, lucideShieldAlert,
    lucideGavel, lucideShoppingBag, lucideBriefcase, lucideInfo,
    lucideLeaf, lucideAlertTriangle, lucideMail
  })],
  template: `
    <div class="relative" id="notification-center">

      <!-- ── Bell button ───────────────────────────────────────────── -->
      <button (click)="togglePanel()"
              id="notif-bell-btn"
              class="relative p-2 rounded-xl transition-colors text-slate-500
                     hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-300">
        <ng-icon name="lucideBell" class="text-xl"></ng-icon>

        <!-- Unread badge -->
        @if (socket.unreadCount() > 0) {
          <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                       bg-red-500 text-white text-[10px] font-black rounded-full
                       flex items-center justify-center animate-bounce leading-none z-10">
            {{ socket.unreadCount() > 99 ? '99+' : socket.unreadCount() }}
          </span>
        }
      </button>

      <!-- ── Notification Panel ──────────────────────────────────── -->
      @if (isOpen()) {
        <div id="notif-panel"
             class="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-[#131929]
                    border border-slate-200/60 dark:border-white/10 rounded-2xl
                    shadow-2xl shadow-black/20 z-50 overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-slate-800 dark:text-white text-sm">Notifications</h3>
              @if (socket.unreadCount() > 0) {
                <span class="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {{ socket.unreadCount() }}
                </span>
              }
            </div>
            <div class="flex items-center gap-1">
              <button (click)="socket.markAllRead()"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="Tout marquer comme lu">
                <ng-icon name="lucideCheckCheck" class="text-sm"></ng-icon>
              </button>
              <button (click)="socket.clearAll()"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Tout effacer">
                <ng-icon name="lucideX" class="text-sm"></ng-icon>
              </button>
            </div>
          </div>

          <!-- WS Status -->
          <div class="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-white/5">
            <div class="w-1.5 h-1.5 rounded-full"
                 [class]="socket.isConnected() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></div>
            <span class="text-[11px] text-slate-400">
              {{ socket.isConnected() ? 'Connecté en temps réel' : 'Hors ligne — reconnexion…' }}
            </span>
          </div>

          <!-- Notification list -->
          <div class="overflow-y-auto max-h-[420px] divide-y divide-slate-100 dark:divide-white/5">
            @if (socket.notifications().length === 0) {
              <div class="py-12 text-center">
                <p class="text-3xl mb-2">🔔</p>
                <p class="text-slate-400 text-sm">Aucune notification</p>
              </div>
            }
            @for (notif of socket.notifications(); track notif.id) {
              <div (click)="handleClick(notif)"
                   class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                   [class]="notif.read
                     ? 'hover:bg-slate-50 dark:hover:bg-white/3'
                     : 'bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10'">

                <!-- Icon -->
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                     [class]="iconBg(notif.type)">
                  <ng-icon [name]="iconName(notif.type)" class="text-sm"></ng-icon>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-800 dark:text-white leading-snug"
                     [class]="!notif.read ? 'font-bold' : ''">
                    {{ notif.title }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">{{ notif.message }}</p>
                  <p class="text-[10px] text-slate-300 dark:text-slate-600 mt-1">{{ notif.created_at | date:'dd MMM HH:mm' }}</p>
                </div>

                <!-- Unread dot -->
                @if (!notif.read) {
                  <div class="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2"></div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ── Live Toasts (Instant Popup on receive) ────────────────────── -->
      @if (socket.toasts().length > 0) {
        <div class="fixed top-20 right-4 md:right-8 z-[9999] flex flex-col gap-2 pointer-events-none">
          @for (toast of socket.toasts(); track toast.id) {
            <div class="w-80 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex gap-3 animate-slide-in pointer-events-auto">
              <!-- Icon -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [class]="iconBg(toast.type)">
                <ng-icon [name]="iconName(toast.type)" class="text-lg"></ng-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ toast.title }}</h4>
                  <button (click)="socket.dismissToast(toast.id)" class="text-slate-400 hover:text-red-500 p-1 -mr-2 -mt-2">
                    <ng-icon name="lucideX" class="text-sm"></ng-icon>
                  </button>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ toast.message }}</p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(100%) scale(0.9); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class NotificationCenterComponent {
  public readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);

  readonly isOpen = signal(false);

  togglePanel(): void { this.isOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }

  handleClick(notif: AppNotification): void {
    this.socket.markRead(notif.id);
    const type = notif.type;
    const userRole = localStorage.getItem('user_role') || '';
    
    // Navigate based on actual backend notification types
    if (type === 'DIAGNOSIS_VALIDATED') this.router.navigate(['/dashboard/farmer/diagnostic']);
    if (type === 'B2B_REQUEST')         this.router.navigate(['/dashboard/farmer/marketplace']);
    if (type === 'NEW_APPLICATION')     this.router.navigate(['/dashboard/farmer/erp']);
    if (type === 'PHYTO_ALERT')         this.router.navigate(['/dashboard/farmer/alerts']);
    if (type === 'disease_alert')       this.router.navigate(['/dashboard/expert/validations']);
    if (type === 'NEW_INVOICE')         this.router.navigate(['/dashboard/farmer/erp'], { queryParams: { tab: 'finance', subtab: 'invoices' } });
    
    if (type === 'CHAT_MESSAGE') {
      if (userRole === 'DRIVER') {
        this.router.navigate(['/dashboard/driver/missions']);
      } else {
        this.router.navigate(['/dashboard/farmer/erp']);
      }
    }
    if (type === 'TRANSPORT_ACCEPTED') {
      this.router.navigate(['/dashboard/farmer/erp']);
    }
    if (type === 'TRANSPORT_UPDATE') {
      if (userRole === 'DRIVER') {
        this.router.navigate(['/dashboard/driver/missions']);
      } else {
        this.router.navigate(['/dashboard/farmer/erp']);
      }
    }
    
    this.isOpen.set(false);
  }

  // ── Visual helpers ──────────────────────────────────────────────────
  iconName(type: string): string {
    const map: Record<string, string> = {
      DIAGNOSIS_VALIDATED: 'lucideCheckCheck',
      B2B_REQUEST:         'lucideShoppingBag',
      NEW_APPLICATION:     'lucideBriefcase',
      PHYTO_ALERT:         'lucideAlertTriangle',
      disease_alert:       'lucideShieldAlert',
      new_bid:             'lucideGavel',
      new_order:           'lucideShoppingBag',
      job_application:     'lucideBriefcase',
      NEW_INVOICE:         'lucideFileText',
      CHAT_MESSAGE:        'lucideMail',
      TRANSPORT_ACCEPTED:  'lucideCheckCheck',
      TRANSPORT_UPDATE:    'lucideInfo',
    };
    return map[type] ?? 'lucideInfo';
  }

  iconBg(type: string): string {
    const map: Record<string, string> = {
      DIAGNOSIS_VALIDATED: 'bg-emerald-500/10 text-emerald-500',
      B2B_REQUEST:         'bg-blue-500/10 text-blue-500',
      NEW_APPLICATION:     'bg-indigo-500/10 text-indigo-500',
      PHYTO_ALERT:         'bg-red-500/10 text-red-500',
      disease_alert:       'bg-red-500/10 text-red-500',
      new_bid:             'bg-amber-500/10 text-amber-500',
      new_order:           'bg-emerald-500/10 text-emerald-500',
      job_application:     'bg-blue-500/10 text-blue-500',
      CHAT_MESSAGE:        'bg-teal-500/10 text-teal-500',
      TRANSPORT_ACCEPTED:  'bg-emerald-500/10 text-emerald-500',
      TRANSPORT_UPDATE:    'bg-blue-500/10 text-blue-500',
    };
    return map[type] ?? 'bg-slate-500/10 text-slate-500';
  }
}
