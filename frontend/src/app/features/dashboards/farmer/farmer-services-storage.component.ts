import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSnowflake, lucideMapPin, lucideSearch, lucideBox, lucideCalendar, lucideCheckCircle2, lucideX } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

@Component({
  selector: 'app-farmer-services-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideSnowflake, lucideMapPin, lucideSearch, lucideBox, lucideCalendar, lucideCheckCircle2, lucideX })],
  template: `
    <div class="farmer-storage-container">
      <!-- Search Filter Bar -->
      <div class="filter-card">
        <div class="filter-grid">
          <div class="fg">
            <label>Gouvernorat</label>
            <select [(ngModel)]="filters.governorate" (change)="onSearch()">
              <option value="">Tous les gouvernorats</option>
              <option *ngFor="let g of governorates" [value]="g">{{ g }}</option>
            </select>
          </div>

          <div class="fg">
            <label>Type de Salle</label>
            <select [(ngModel)]="filters.room_type" (change)="onSearch()">
              <option value="">Tous types</option>
              <option value="Chambre positive (0°C à +12°C)">Chambre positive (0°C à +12°C)</option>
              <option value="Chambre négative (-18°C)">Chambre négative (-18°C)</option>
              <option value="Stockage sec">Stockage sec</option>
            </select>
          </div>

          <div class="fg">
            <label>Capacité min. (m³)</label>
            <input type="number" [(ngModel)]="filters.min_capacity" placeholder="Ex: 20" (change)="onSearch()" />
          </div>

          <div class="fg btn-fg">
            <button class="btn-search" (click)="onSearch()">
              <ng-icon name="lucideSearch"></ng-icon> Rechercher
            </button>
          </div>
        </div>
      </div>

      <!-- Facilities & Available Rooms List -->
      <div class="results-list" *ngIf="!isLoading(); else loadingTpl">
        <div class="facility-card" *ngFor="let fac of facilities()">
          <div class="fac-header">
            <div class="fac-info">
              <h3>{{ fac.name }}</h3>
              <span class="fac-location"><ng-icon name="lucideMapPin"></ng-icon> {{ fac.governorate }}, {{ fac.delegation }}</span>
            </div>
            <span class="owner-name">Propriétaire: {{ fac.owner?.name }}</span>
          </div>

          <div class="rooms-subgrid">
            <div class="room-subcard" *ngFor="let room of fac.rooms">
              <div class="room-top">
                <span class="room-type"><ng-icon name="lucideSnowflake"></ng-icon> {{ room.room_type }}</span>
                <span class="avail-badge">{{ room.available_m3 }} m³ disponibles</span>
              </div>
              <h4 class="room-title">{{ room.name }}</h4>

              <div class="price-tag">
                <span *ngIf="room.pricing_mode === 'PAR_M3_JOUR'"><strong>{{ room.price_per_m3_day }} TND</strong> / m³ / jour</span>
                <span *ngIf="room.pricing_mode === 'FORFAIT_PERIODE'"><strong>{{ room.flat_price }} TND</strong> forfait</span>
              </div>

              <button class="btn-book" (click)="openBookingModal(room, fac)">Réserver Capacité</button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="facilities().length === 0">
          <p>Aucune chambre froide disponible correspondant aux filtres sélectionnés.</p>
        </div>

        <!-- Pagination Controls -->
        <div class="pagination-footer" *ngIf="totalPages() > 1">
          <button [disabled]="page() === 1" (click)="changePage(page() - 1)">Précédent</button>
          <span>Page {{ page() }} sur {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="changePage(page() + 1)">Suivant</button>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-box">Recherche des espaces frigos disponibles...</div>
      </ng-template>

      <!-- Booking Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()"></div>
      <div class="modal-card" *ngIf="showModal()">
        <div class="modal-header">
          <h3>Demande de Réservation Chambre Froide</h3>
          <button class="btn-close" (click)="closeModal()">&times;</button>
        </div>
        <div class="modal-body" *ngIf="selectedRoom()">
          <p class="summary-text"><strong>{{ selectedRoom().name }}</strong> — {{ selectedFacility()?.name }} ({{ selectedFacility()?.governorate }})</p>

          <div class="form-group">
            <label>Volume Désiré (m³) * [Disponible max: {{ selectedRoom().available_m3 }} m³]</label>
            <input type="number" [(ngModel)]="bookingPayload.occupied_capacity" [max]="selectedRoom().available_m3" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date Début *</label>
              <input type="date" [(ngModel)]="bookingPayload.start_date" />
            </div>
            <div class="form-group">
              <label>Date Fin (Optionnel)</label>
              <input type="date" [(ngModel)]="bookingPayload.end_date" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeModal()">Annuler</button>
          <button class="btn-primary" (click)="submitBooking()">Envoyer la Demande</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .farmer-storage-container { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .filter-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; }
    .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: flex-end; }
    .fg { display: flex; flex-direction: column; gap: 4px; label { font-size: 0.8rem; font-weight: 600; } input, select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); } }
    .btn-search { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .results-list { display: flex; flex-direction: column; gap: 16px; }
    .facility-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px; }
    .fac-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px; h3 { margin: 0; font-size: 1.1rem; } .fac-location { font-size: 0.8rem; color: var(--text-muted); } .owner-name { font-size: 0.8rem; font-weight: 600; color: var(--zir-emerald); } }
    .rooms-subgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .room-subcard { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .room-top { display: flex; justify-content: space-between; font-size: 0.75rem; .avail-badge { background: #d1fae5; color: #10b981; padding: 2px 6px; border-radius: 12px; font-weight: 600; } }
    .room-title { margin: 0; font-size: 0.95rem; }
    .price-tag { font-size: 0.85rem; color: var(--text-primary); }
    .btn-book { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 4px; }
    .pagination-footer { display: flex; justify-content: flex-end; align-items: center; gap: 12px; font-size: 0.85rem; button { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer; } }
    .loading-box, .empty-state { padding: 32px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99; }
    .modal-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; max-width: 95vw; background: var(--bg-card); border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 100; display: flex; flex-direction: column; }
    .modal-header { padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; h3 { margin: 0; font-size: 1.1rem; } .btn-close { background: none; border: none; font-size: 1.4rem; cursor: pointer; } }
    .modal-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .modal-footer { padding: 12px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 8px; }
    .btn-primary { background: var(--zir-emerald, #10b981); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .form-group { display: flex; flex-direction: column; gap: 4px; input { padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); } }
    .form-row { display: flex; gap: 12px; .form-group { flex: 1; } }
  `]
})
export class FarmerServicesStorageComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  facilities = signal<any[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(10);
  totalPages = signal<number>(1);
  isLoading = signal<boolean>(false);
  showModal = signal<boolean>(false);

  selectedRoom = signal<any | null>(null);
  selectedFacility = signal<any | null>(null);

  filters = {
    governorate: '',
    room_type: '',
    min_capacity: null as number | null,
  };

  bookingPayload = {
    room_id: '',
    occupied_capacity: 10,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  };

  governorates = [
    'Kasserine', 'Sidi Bouzid', 'Gafsa', 'Le Kef', 'Siliana', 'Béja', 'Jendouba',
    'Bizerte', 'Nabeul', 'Kairouan', 'Sousse', 'Monastir', 'Mahdia', 'Sfax',
    'Gabès', 'Médenine', 'Tataouine', 'Tozeur', 'Kébili', 'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Zaghouan'
  ];

  ngOnInit() {
    this.onSearch();
  }

  onSearch() {
    this.isLoading.set(true);
    let url = `${environment.apiUrl}/storage/facilities/search?page=${this.page()}&limit=${this.limit()}`;
    if (this.filters.governorate) url += `&governorate=${encodeURIComponent(this.filters.governorate)}`;
    if (this.filters.room_type) url += `&room_type=${encodeURIComponent(this.filters.room_type)}`;
    if (this.filters.min_capacity) url += `&min_capacity=${this.filters.min_capacity}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const items = res.items || res.data || [];
        const total = res.total || 0;
        this.facilities.set(items);
        this.total.set(total);
        this.totalPages.set(Math.ceil(total / this.limit()) || 1);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Erreur', 'Impossible de charger les chambres froides.');
        this.cdr.markForCheck();
      }
    });
  }

  changePage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.onSearch();
    }
  }

  openBookingModal(room: any, facility: any) {
    this.selectedRoom.set(room);
    this.selectedFacility.set(facility);
    this.bookingPayload.room_id = room.id;
    this.bookingPayload.occupied_capacity = Math.min(10, room.available_m3);
    this.showModal.set(true);
    this.cdr.markForCheck();
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedRoom.set(null);
    this.selectedFacility.set(null);
    this.cdr.markForCheck();
  }

  submitBooking() {
    if (!this.bookingPayload.occupied_capacity || this.bookingPayload.occupied_capacity <= 0) {
      this.toast.info('Capacité requise', 'Veuillez saisir un volume valide.');
      return;
    }

    this.http.post(`${environment.apiUrl}/storage/reservations`, this.bookingPayload).subscribe({
      next: () => {
        this.toast.success('Demande envoyée', 'Le propriétaire de la chambre froide a été notifié.');
        this.closeModal();
        this.onSearch();
      },
      error: (err) => {
        this.toast.error('Erreur', err.error?.message || 'Impossible d envoyer la demande.');
      }
    });
  }
}
