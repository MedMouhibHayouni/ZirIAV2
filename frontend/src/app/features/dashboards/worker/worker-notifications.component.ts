import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgriJobApiService, AppNotification } from '../../../core/services/agrijob-api.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { Router } from '@angular/router';
import {
  lucideBell, lucideCheckCircle, lucideInfo, lucideArrowRight,
  lucideAward, lucideDollarSign, lucideBriefcase, lucideClock,
  lucideTrash2, lucideSparkles, lucideAlertTriangle
} from '@ng-icons/lucide';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-worker-notifications',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideBell, lucideCheckCircle, lucideInfo, lucideArrowRight,
    lucideAward, lucideDollarSign, lucideBriefcase, lucideClock,
    lucideTrash2, lucideSparkles, lucideAlertTriangle
  })],
  templateUrl: './worker-notifications.component.html',
  styleUrl: './worker-notifications.component.scss'
})
export class WorkerNotificationsComponent implements OnInit {
  private api = inject(AgriJobApiService);
  private notifs = inject(NotificationStore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  notifications = signal<AppNotification[]>([]);

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.api.getNotifications(1, 50).subscribe({
      next: (res) => {
        const items = res?.items || res || [];
        this.notifications.set(items);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead() {
    this.api.markAllAsRead().subscribe({
      next: () => {
        this.notifs.showSuccess('Toutes les notifications ont été marquées comme lues.');
        this.notifications.update(list => list.map(n => ({ ...n, is_read: true })));
        this.cdr.markForCheck();
      }
    });
  }

  handleNotificationClick(notif: AppNotification) {
    if (!notif.is_read) {
      this.api.markAsRead(notif.id).subscribe({
        next: () => {
          this.notifications.update(list =>
            list.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
          );
          this.cdr.markForCheck();
        }
      });
    }

    // Direct routing based on payload types
    const type = notif.payload?.type;
    if (type) {
      if (type.includes('EARNING') || type.includes('PAYMENT')) {
        this.router.navigate(['/dashboard/worker/earnings']);
      } else if (type.includes('CERTIF')) {
        this.router.navigate(['/dashboard/worker/profile']);
      } else if (type.includes('APPLICATION') || type.includes('JOB')) {
        this.router.navigate(['/dashboard/worker/missions']);
      }
    }
  }

  getNotificationIcon(payloadType?: string): string {
    if (!payloadType) return 'lucideBell';
    if (payloadType.includes('EARNING') || payloadType.includes('PAYMENT')) {
      return 'lucideDollarSign';
    }
    if (payloadType.includes('CERTIF')) {
      return 'lucideAward';
    }
    if (payloadType.includes('APPLICATION') || payloadType.includes('JOB')) {
      return 'lucideBriefcase';
    }
    return 'lucideBell';
  }
}
