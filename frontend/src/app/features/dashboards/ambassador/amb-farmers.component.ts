import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSearch, lucideUsers, lucideLoader, lucideLock, lucideUser, lucideGlobe,
  lucideX, lucidePhone, lucideMessageSquare, lucideChevronRight, lucidePackage,
  lucideMapPin, lucideAlertTriangle, lucideCheckCircle
} from '@ng-icons/lucide';
import { AmbassadorApiService, ZoneFarmer } from '../../../core/services/ambassador-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  selector: 'app-amb-farmers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideSearch, lucideUsers, lucideLoader, lucideLock, lucideUser, lucideGlobe,
    lucideX, lucidePhone, lucideMessageSquare, lucideChevronRight, lucidePackage,
    lucideMapPin, lucideAlertTriangle, lucideCheckCircle
  })],
  templateUrl: './amb-farmers.component.html',
  styleUrl: './amb-farmers.component.scss',
})
export class AmbFarmersComponent implements OnInit {
  private readonly api = inject(AmbassadorApiService);

  farmers = signal<ZoneFarmer[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeFilter = signal('all');
  viewMode = signal<'table' | 'cards'>('table');
  selectedFarmer = signal<ZoneFarmer | null>(null);
  panelTab = signal<'parcelles' | 'historique' | 'actions'>('parcelles');

  readonly filters = [
    { key: 'all',      label: 'Tous' },
    { key: 'active',   label: 'Actifs' },
    { key: 'critical', label: 'Alertes critiques' },
  ];

  readonly filteredFarmers = computed(() => {
    let list = this.farmers();
    const q = this.searchQuery().toLowerCase();
    if (q) list = list.filter(f => f.display_name.toLowerCase().includes(q));
    const filter = this.activeFilter();
    if (filter === 'active') list = list.filter(f => f.alert_level !== 'NONE');
    if (filter === 'critical') list = list.filter(f => f.alert_level === 'CRITICAL');
    return list;
  });

  private readonly notifs = inject(NotificationStore);

  ngOnInit() {
    // Default to card view on mobile (≤767px)
    if (window.innerWidth <= 767) {
      this.viewMode.set('cards');
    }
    this.api.getZoneFarmers().subscribe(f => { this.farmers.set(f); this.isLoading.set(false); });
  }

  onProxyAction(farmerId: string, type: string) {
    this.api.proxyAction({
      farmer_id: farmerId,
      action_type: type,
      payload: { timestamp: new Date().toISOString() }
    }).subscribe({
      next: () => this.notifs.showSuccess(`Action ${type} simulée avec succès pour l'agriculteur.`),
      error: () => this.notifs.showError('Erreur lors de l\'exécution de l\'action proxy')
    });
  }

  selectFarmer(f: ZoneFarmer) { this.selectedFarmer.set(f); this.panelTab.set('parcelles'); }
  closePanel() { this.selectedFarmer.set(null); }

  privacyIcon(level: string): string {
    return level === 'ANONYMOUS' ? 'lucideLock' : level === 'SEMI_PUBLIC' ? 'lucideUser' : 'lucideGlobe';
  }
  privacyLabel(level: string): string {
    return level === 'ANONYMOUS' ? 'Anonyme' : level === 'SEMI_PUBLIC' ? 'Semi-public' : 'Ouvert';
  }
  alertClass(level: string): string {
    return level === 'CRITICAL' ? 'alert-crit' : level === 'WARNING' ? 'alert-warn' : 'alert-none';
  }
}
