import {  Component, OnInit, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBell, lucideCloud, lucideAlertTriangle, lucideCircleDollarSign,
  lucideBriefcase, lucideRefreshCcw, lucideCheckCheck, lucideFilter, lucideX
} from '@ng-icons/lucide';
import { FarmerApiService, AppNotification } from '../../../core/services/farmer-api.service';
import { SocketService } from '../../../core/services/socket.service';
import { NotificationStore } from '../../../core/state/notification.store';

type NotifFilter = 'ALL' | 'WEATHER' | 'DISEASE' | 'MARKET' | 'JOB';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-alerts',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideBell, lucideCloud, lucideAlertTriangle, lucideCircleDollarSign,
    lucideBriefcase, lucideRefreshCcw, lucideCheckCheck, lucideFilter, lucideX
  
})],
  templateUrl: './farmer-alerts.component.html',
  styleUrl: './farmer-alerts.component.scss'
})
export class FarmerAlertsComponent implements OnInit {
  private farmerApi = inject(FarmerApiService);
  private socket = inject(SocketService);
  private notifStore = inject(NotificationStore);

  allNotifications = signal<AppNotification[]>([]);
  isLoading = signal(true);
  activeFilter = signal<NotifFilter>('ALL');

  readonly filters: { label: string, val: NotifFilter }[] = [
    { label: 'Tout', val: 'ALL' },
    { label: 'Météo', val: 'WEATHER' },
    { label: 'Maladie', val: 'DISEASE' },
    { label: 'Marché', val: 'MARKET' },
    { label: 'Emploi', val: 'JOB' },
  ];

  filteredNotifs = computed(() => {
    const f = this.activeFilter();
    const all = this.allNotifications();
    if (f === 'ALL') return all;
    return all.filter(n => n.type?.toUpperCase().includes(f));
  });

  // Group by date
  grouped = computed(() => {
    const groups: Record<string, AppNotification[]> = {};
    this.filteredNotifs().forEach(n => {
      const key = this.getDateLabel(n.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups).map(([date, notifs]) => ({ date, notifs }));
  });

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading.set(true);
    this.farmerApi.fetchNotifications().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.items || []);
        this.allNotifications.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  markRead(notif: AppNotification) {
    if (notif.is_read) return;
    this.allNotifications.update(list =>
      list.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
    );
    this.farmerApi.markNotifRead(notif.id).subscribe();
  }

  markAllRead() {
    this.allNotifications.update(list => list.map(n => ({ ...n, is_read: true })));
    this.farmerApi.markAllNotifsRead().subscribe({
      next: () => this.notifStore.showSuccess("Toutes les alertes marquées comme lues.")
    });
  }

  setFilter(f: NotifFilter) {
    this.activeFilter.set(f);
  }

  getNotifIcon(type: string): string {
    const t = type?.toUpperCase() || '';
    if (t.includes('WEATHER')) return 'lucideCloud';
    if (t.includes('DISEASE')) return 'lucideAlertTriangle';
    if (t.includes('MARKET') || t.includes('PRICE')) return 'lucideCircleDollarSign';
    if (t.includes('JOB')) return 'lucideBriefcase';
    return 'lucideBell';
  }

  getNotifIconClass(type: string): string {
    const t = type?.toUpperCase() || '';
    if (t.includes('WEATHER')) return 'icon-weather';
    if (t.includes('DISEASE')) return 'icon-disease';
    if (t.includes('MARKET') || t.includes('PRICE')) return 'icon-market';
    if (t.includes('JOB')) return 'icon-job';
    return 'icon-default';
  }

  getTimeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)} jour(s)`;
  }

  private dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

  private getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return "Hier";

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (d > weekAgo) return "Cette semaine";

    return this.dateFormatter.format(d);
  }

  get unreadCount(): number {
    return this.allNotifications().filter(n => !n.is_read).length;
  }
}
