import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideActivity, lucideMap, lucideHeart, lucideBell,
  lucideTreePine, lucideAlertTriangle, lucidePackage, lucideUserPlus,
  lucideArrowRight, lucideSun, lucideCloud, lucideCloudRain, lucideZap, lucideShoppingBag
} from '@ng-icons/lucide';
import { AmbassadorApiService, ZoneStats, ZoneAlert, ActivityFeedItem } from '../../../core/services/ambassador-api.service';

@Component({
  selector: 'app-amb-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NgIconComponent],
  providers: [provideIcons({
    lucideUsers, lucideActivity, lucideMap, lucideHeart, lucideBell,
    lucideTreePine, lucideAlertTriangle, lucidePackage, lucideUserPlus,
    lucideArrowRight, lucideSun, lucideCloud, lucideCloudRain, lucideZap, lucideShoppingBag
  })],
  templateUrl: './amb-overview.component.html',
  styleUrl: './amb-overview.component.scss',
})
export class AmbOverviewComponent implements OnInit {
  private readonly api = inject(AmbassadorApiService);

  stats = signal<ZoneStats | null>(null);
  alerts = signal<ZoneAlert[]>([]);
  expertAlerts = signal<any[]>([]);
  activityFeed = signal<ActivityFeedItem[]>([]);
  isLoading = signal(true);

  readonly kpiCards = [
    { key: 'total_farmers',          label: 'Total Agriculteurs',  icon: 'lucideUsers',        color: 'emerald' },
    { key: 'active_farmers_this_week', label: 'Actifs cette semaine', icon: 'lucideActivity',   color: 'teal' },
    { key: 'total_area_ha',          label: 'Surface Totale (ha)',  icon: 'lucideMap',           color: 'blue' },
    { key: 'zone_health_score',      label: 'Score Santé Zone',    icon: 'lucideHeart',          color: 'dynamic' },
    { key: 'alerts',                 label: 'Alertes Actives',     icon: 'lucideBell',           color: 'red' },
  ];

  ngOnInit(): void {
    this.api.getZoneStats().subscribe(s => { this.stats.set(s); this.isLoading.set(false); });
    this.api.getZoneAlerts().subscribe(a => this.alerts.set(a.slice(0, 5)));
    this.api.getExpertAlerts().subscribe(a => this.expertAlerts.set(a.slice(0, 3)));
    this.api.getActivityFeed().subscribe(f => this.activityFeed.set(f));
  }

  getKpiValue(key: string): string | number {
    const s = this.stats();
    if (!s) return '—';
    if (key === 'total_farmers') return s.total_farmers;
    if (key === 'active_farmers_this_week') return s.active_farmers_this_week;
    if (key === 'total_area_ha') return s.total_area_ha.toFixed(1) + ' ha';
    if (key === 'zone_health_score') return `${s.zone_health_score}/100`;
    if (key === 'alerts') return `${s.active_alerts.critical} crit. / ${s.active_alerts.warning} aver.`;
    return '—';
  }

  healthColor(): string {
    const score = this.stats()?.zone_health_score ?? 100;
    if (score >= 70) return 'emerald';
    if (score >= 50) return 'amber';
    return 'red';
  }

  etaColor(days: number): string {
    if (days <= 3) return 'chip-red';
    if (days <= 7) return 'chip-orange';
    return 'chip-green';
  }

  severityClass(s: string): string {
    return s === 'CRITICAL' ? 'sev-critical' : s === 'WARNING' ? 'sev-warning' : 'sev-normal';
  }

  feedItemIcon(type: string): string {
    const map: Record<string, string> = {
      DISEASE: 'lucideAlertTriangle',
      JOB_OFFER: 'lucideUsers',
      MARKETPLACE: 'lucideShoppingBag',
    };
    return map[type] || 'lucideZap';
  }

  feedItemColor(type: string): string {
    const map: Record<string, string> = {
      DISEASE: '#ef4444',
      JOB_OFFER: '#3b82f6',
      MARKETPLACE: '#22c55e',
    };
    return map[type] || 'var(--zir-emerald)';
  }

  formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffHrs = Math.floor((now - then) / 3600000);
    if (diffHrs < 1) return 'Il y a moins d\'1h';
    if (diffHrs < 24) return `Il y a ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Il y a ${diffDays}j`;
  }
}
