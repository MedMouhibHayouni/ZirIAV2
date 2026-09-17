import {
  Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogisticsApiService, FreightMission } from '../../../core/services/logistics-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ContractsApiService, MissionContract } from '../../../core/services/contracts-api.service';
import { GpsTrackingService } from '../../../core/services/gps-tracking.service';
import {
  lucideTruck, lucideArrowRight, lucideCheckCircle, lucideLoader,
  lucideClock, lucideMapPin, lucidePackage, lucideX, lucidePhone,
  lucideWeight, lucideAlertCircle, lucidePlay, lucideDollarSign,
  lucideNavigation, lucideNavigationOff,
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-current',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  providers: [provideIcons({
    lucideTruck, lucideArrowRight, lucideCheckCircle, lucideLoader,
    lucideClock, lucideMapPin, lucidePackage, lucideX, lucidePhone,
    lucideWeight, lucideAlertCircle, lucidePlay, lucideDollarSign,
    lucideNavigation, lucideNavigationOff,
  })],
  templateUrl: './driver-current.component.html',
  styleUrl: './driver-current.component.scss'
})
export class DriverCurrentComponent implements OnInit, OnDestroy {
  private api = inject(LogisticsApiService);
  private notifs = inject(NotificationStore);
  private cdr = inject(ChangeDetectorRef);
  private contractsApi = inject(ContractsApiService);
  readonly gps = inject(GpsTrackingService);

  mission = this.api.activeMission;
  isLoading = this.api.isLoadingActive;
  isUpdating = signal(false);
  isStartingTracking = signal(false);
  activeContract = signal<MissionContract | null>(null);

  ngOnInit() {
    this.api.fetchMyActiveMission().subscribe({
      next: () => {
        this.loadContractForActiveMission();
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  loadContractForActiveMission() {
    const active = this.mission();
    if (!active) {
      this.activeContract.set(null);
      return;
    }
    this.contractsApi.getMyContracts().subscribe(contracts => {
      const match = contracts.find(c => c.reference_id === active.id);
      this.activeContract.set(match || null);
      this.cdr.markForCheck();
    });
  }

  startTransit() {
    const m = this.mission();
    if (!m) return;
    this.isUpdating.set(true);
    this.api.updateTransportStatus(m.id, 'IN_TRANSIT').subscribe({
      next: () => {
        this.notifs.showSuccess('Mission démarrée ! Bon trajet 🚛');
        this.isUpdating.set(false);
        this.api.fetchMyActiveMission().subscribe(() => this.cdr.markForCheck());
      },
      error: (err: any) => {
        this.notifs.showError(err?.error?.message || 'Erreur.');
        this.isUpdating.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  completeMission() {
    const m = this.mission();
    if (!m) return;
    this.isUpdating.set(true);
    this.api.completeMission(m.id).subscribe({
      next: () => {
        this.gps.stopTracking();
        this.notifs.showSuccess('Mission complétée ! Paiement en cours de traitement.');
        this.isUpdating.set(false);
        this.api.fetchMyActiveMission().subscribe(() => this.cdr.markForCheck());
      },
      error: (err: any) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de la complétion.');
        this.isUpdating.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  async toggleTracking() {
    const m = this.mission();
    if (!m) return;

    if (this.gps.isTracking()) {
      this.gps.stopTracking();
      this.notifs.showSuccess('Partage de position arrêté.');
      this.cdr.markForCheck();
      return;
    }

    if (!navigator.geolocation) {
      this.notifs.showError('La géolocalisation n\'est pas supportée par ce navigateur.');
      return;
    }

    this.isStartingTracking.set(true);
    try {
      await this.gps.startTracking(m.id);
      this.notifs.showSuccess('Partage de position actif. L\'agriculteur peut vous suivre en temps réel.');
    } catch {
      this.notifs.showError('Impossible de démarrer le suivi GPS.');
    } finally {
      this.isStartingTracking.set(false);
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    // Don't auto-stop tracking on component destroy (user may navigate away briefly)
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente de démarrage',
      'ACCEPTED': 'Acceptée — Prête',
      'IN_TRANSIT': 'En transit 🚛',
      'DELIVERED': 'Livrée ✓',
      'CANCELLED': 'Annulée'
    };
    return labels[status] || status;
  }

  getContractStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING_ACCEPTANCE': 'En attente d\'acceptation',
      'ACTIVE': 'Contrat Actif',
      'COMPLETED': 'Contrat Terminé',
      'DISPUTED': 'En litige ⚠️',
      'RESOLVED': 'Litige Résolu',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getContractStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING_ACCEPTANCE': 'zir-badge--info',
      'ACTIVE': 'zir-badge--success',
      'COMPLETED': 'zir-badge--default',
      'DISPUTED': 'zir-badge--danger',
      'RESOLVED': 'zir-badge--success',
      'CANCELLED': 'zir-badge--default'
    };
    return classes[status] || '';
  }
}
