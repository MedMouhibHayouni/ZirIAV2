import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePackage, lucidePlus, lucideTag, lucideScale, lucideCheck, lucideX, lucideHandshake } from '@ng-icons/lucide';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-smsa-marketplace',
  standalone: true,
  imports: [CommonModule, NgIconComponent, FormsModule],
  providers: [provideIcons({ lucidePackage, lucidePlus, lucideTag, lucideScale, lucideCheck, lucideX, lucideHandshake 
})],
  templateUrl: './smsa-marketplace.component.html',
  styleUrl: './smsa-marketplace.component.scss'
})
export class SmsaMarketplaceComponent implements OnInit {
  private marketplaceService = inject(MarketplaceService);
  private notificationStore = inject(NotificationStore);

  activeTab: 'LISTINGS' | 'REQUESTS' | 'NEGOTIATIONS' = 'LISTINGS';

  readonly listings = this.marketplaceService.listings;
  readonly isLoading = this.marketplaceService.isLoading;
  readonly hasError = this.marketplaceService.hasError;

  connections = signal<any[]>([]);
  isLoadingConnections = signal(false);

  showCreateModal = false;
  newListing = { crop_type: '', quantity_tonnes: 0, price_per_kg: 0, harvest_prediction_date: '' };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    if (this.activeTab === 'LISTINGS') {
      this.marketplaceService.fetchListings({ cooperativeId: 'me' });
    } else {
      this.fetchConnections();
    }
  }

  switchTab(tab: 'LISTINGS' | 'REQUESTS' | 'NEGOTIATIONS') {
    this.activeTab = tab;
    this.loadData();
  }

  fetchConnections() {
    this.isLoadingConnections.set(true);
    this.marketplaceService.getConnections().subscribe({
      next: (data) => {
        this.connections.set(Array.isArray(data) ? data : []);
        this.isLoadingConnections.set(false);
      },
      error: () => {
        this.isLoadingConnections.set(false);
      }
    });
  }

  createListing() {
    this.marketplaceService.createListing(this.newListing).subscribe({
      next: () => {
        this.notificationStore.showSuccess('Annonce créée avec succès.');
        this.showCreateModal = false;
        this.loadData();
      },
      error: () => {
        this.notificationStore.showError("Erreur lors de la création de l'annonce.");
      }
    });
  }

  respond(connectionId: string, action: 'CONFIRM' | 'REJECT') {
    this.marketplaceService.respondToConnection(connectionId, action).subscribe({
      next: () => {
        this.notificationStore.showSuccess(`Demande ${action === 'CONFIRM' ? 'confirmée' : 'rejetée'}.`);
        this.fetchConnections();
      },
      error: () => this.notificationStore.showError('Erreur.')
    });
  }

  // Helpers
  getPendingConnections() {
    return this.connections().filter(c => c.status === 'PENDING');
  }

  getNegotiationsByStatus(status: string) {
    return this.connections().filter(c => c.status === status);
  }
}
