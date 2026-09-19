import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSnowflake, lucideMapPin, lucideSearch, lucideBox, lucideCalendar, lucideCheckCircle2, lucideX, lucideThermometer, lucideWarehouse, lucideDollarSign, lucideChevronRight, lucideFilter, lucideCpu, lucideZap, lucideExpand, lucideStar } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

@Component({
  selector: 'app-farmer-services-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ lucideSnowflake, lucideMapPin, lucideSearch, lucideBox, lucideCalendar, lucideCheckCircle2, lucideX, lucideThermometer, lucideWarehouse, lucideDollarSign, lucideChevronRight, lucideFilter, lucideCpu, lucideZap, lucideExpand, lucideStar })],
  template: `
    <div class="cs">
      <!-- Header -->
      <div class="cs__head">
        <div class="cs__head-icon"><ng-icon name="lucideSnowflake"></ng-icon></div>
        <div>
          <h2>Chambres Froides</h2>
          <p>Espaces de stockage frigorifique à proximité de vos cultures</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="cs__filters">
        <div class="cs__filter">
          <ng-icon name="lucideMapPin"></ng-icon>
          <select [(ngModel)]="filters.governorate" (change)="onSearch()">
            <option value="">Tous les gouvernorats</option>
            <option *ngFor="let g of governorates" [value]="g">{{ g }}</option>
          </select>
        </div>
        <div class="cs__filter">
          <ng-icon name="lucideThermometer"></ng-icon>
          <select [(ngModel)]="filters.room_type" (change)="onSearch()">
            <option value="">Tous types</option>
            <option value="Chambre positive (0°C à +12°C)">Positive (+0 à +12°C)</option>
            <option value="Chambre négative (-18°C)">Négative (−18°C)</option>
            <option value="Stockage sec">Stockage sec</option>
          </select>
        </div>
        <div class="cs__filter">
          <ng-icon name="lucideBox"></ng-icon>
          <input type="number" [(ngModel)]="filters.min_capacity" placeholder="Capacité min. m³" (change)="onSearch()" />
        </div>
        <button class="cs__search-btn" (click)="onSearch()">
          <ng-icon name="lucideSearch"></ng-icon>
        </button>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="cs__list">
          @for (i of [1,2,3]; track i) {
            <div class="skel-fac">
              <div class="skel-fac__head">
                <div class="skel skel--icon"></div>
                <div><div class="skel skel--title"></div><div class="skel skel--sub"></div></div>
              </div>
              <div class="skel-fac__rooms">
                @for (j of [1,2,3]; track j) {
                  <div class="skel-room"></div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="cs__list">
          @for (fac of facilities(); track fac.id) {
            <div class="fac">
              <div class="fac__head">
                <div class="fac__icon"><ng-icon name="lucideWarehouse"></ng-icon></div>
                <div class="fac__meta">
                  <h3>{{ fac.name }}</h3>
                  <span><ng-icon name="lucideMapPin"></ng-icon> {{ fac.governorate }}, {{ fac.delegation }}</span>
                </div>
                <span class="fac__owner">{{ fac.owner?.name }}</span>
              </div>

              <div class="fac__rooms">
                @for (room of fac.rooms; track room.id) {
                  <div class="rm">
                    <!-- Room Header -->
                    <div class="rm__head" [style.--accent]="room.color_hex || '#0ea5e9'">
                      <div class="rm__temp">
                        <ng-icon name="lucideSnowflake"></ng-icon>
                        <span>{{ getTempLabel(room.room_type) }}</span>
                      </div>
                      <span class="rm__avail">{{ getAvailable(room) }} m³</span>
                    </div>

                    <!-- Room Name -->
                    <h4 class="rm__name">{{ room.name }}</h4>

                    <!-- Price -->
                    <div class="rm__price">
                      @if (room.pricing_mode === 'PAR_M3_JOUR') {
                        <strong>{{ room.price_per_m3_day }} TND</strong>
                        <span>/{{ getUnitLabel(room.pricing_unit) }}/jour</span>
                      } @else {
                        <strong>{{ formatPrice(room.flat_price) }} TND</strong>
                        <span>forfait</span>
                      }
                    </div>

                    <!-- Compact Specs -->
                    <div class="rm__specs">
                      <span><ng-icon name="lucideExpand"></ng-icon> {{ room.total_capacity || room.capacity_m3 }} m³</span>
                      <span><ng-icon name="lucideCpu"></ng-icon> {{ room.compressor_power_kw }} kW</span>
                      <span><ng-icon name="lucideZap"></ng-icon> {{ formatElec(room) }}</span>
                    </div>

                    <!-- Equipment Tags (only first 3) -->
                    @if (room.equipment_badges?.length) {
                      <div class="rm__tags">
                        @for (tag of room.equipment_badges.slice(0, 3); track tag) {
                          <span class="rm__tag">{{ cleanTag(tag) }}</span>
                        }
                        @if (room.equipment_badges.length > 3) {
                          <span class="rm__tag rm__tag--more">+{{ room.equipment_badges.length - 3 }}</span>
                        }
                      </div>
                    }

                    <!-- Book Button -->
                    <button class="rm__book" (click)="openBookingModal(room, fac)">
                      Réserver <ng-icon name="lucideChevronRight"></ng-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          @if (facilities().length === 0) {
            <div class="cs__empty">
              <ng-icon name="lucideSnowflake"></ng-icon>
              <p>Aucune chambre froide trouvée</p>
              <span>Modifiez vos filtres de recherche</span>
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="cs__pager">
            <button [disabled]="page() === 1" (click)="changePage(page() - 1)">← Préc</button>
            <span>{{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() === totalPages()" (click)="changePage(page() + 1)">Suiv →</button>
          </div>
        }
      }

      <!-- Modal -->
      @if (showModal()) {
        <div class="overlay" (click)="closeModal()"></div>
        <div class="modal">
          <div class="modal__head">
            <div class="modal__icon"><ng-icon name="lucideSnowflake"></ng-icon></div>
            <div>
              <h3>Réserver</h3>
              <span *ngIf="selectedRoom()">{{ selectedRoom().name }}</span>
            </div>
            <button class="modal__x" (click)="closeModal()"><ng-icon name="lucideX"></ng-icon></button>
          </div>
          <div class="modal__body" *ngIf="selectedRoom()">
            <div class="modal__info">
              <span>{{ selectedRoom().room_type }}</span>
              <span>{{ getAvailable(selectedRoom()) }} m³ disponibles</span>
            </div>
            <div class="field">
              <label>Volume (m³)</label>
              <input type="number" [(ngModel)]="bookingPayload.occupied_capacity" [max]="getAvailable(selectedRoom())" />
            </div>
            <div class="field-row">
              <div class="field">
                <label>Date début</label>
                <input type="date" [(ngModel)]="bookingPayload.start_date" />
              </div>
              <div class="field">
                <label>Date fin</label>
                <input type="date" [(ngModel)]="bookingPayload.end_date" />
              </div>
            </div>
          </div>
          <div class="modal__foot">
            <button class="btn-cancel" (click)="closeModal()">Annuler</button>
            <button class="btn-confirm" (click)="submitBooking()">
              <ng-icon name="lucideCheckCircle2"></ng-icon> Confirmer
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cs { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; height: 100%; overflow-y: auto; font-family: 'Inter', system-ui, sans-serif; }

    /* ── Header ──────────────────────────────────── */
    .cs__head { display: flex; align-items: center; gap: 14px; }
    .cs__head-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #22c55e); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cs__head-icon ng-icon { width: 22px; height: 22px; color: #fff; }
    .cs__head h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); }
    .cs__head p { margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted); }

    /* ── Filters ─────────────────────────────────── */
    .cs__filters { display: flex; gap: 8px; align-items: center; }
    .cs__filter { display: flex; align-items: center; gap: 8px; padding: 9px 14px; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 10px; flex: 1; }
    .cs__filter ng-icon { width: 15px; height: 15px; color: var(--text-muted); flex-shrink: 0; }
    .cs__filter select, .cs__filter input { border: none; background: transparent; color: var(--text-primary); font-size: 0.82rem; font-family: inherit; width: 100%; outline: none; }
    .cs__filter select option { background: var(--bg-card); color: var(--text-primary); }
    .cs__search-btn { width: 40px; height: 40px; border-radius: 10px; border: none; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: transform 0.15s; }
    .cs__search-btn:hover { transform: scale(1.05); }
    .cs__search-btn ng-icon { width: 17px; height: 17px; }

    /* ── Facility Card ────────────────────────────── */
    .cs__list { display: flex; flex-direction: column; gap: 20px; }
    .fac { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); overflow: hidden; }
    .fac__head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: linear-gradient(90deg, rgba(34,197,94,0.04), transparent); border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.04)); }
    .fac__icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .fac__icon ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .fac__meta { flex: 1; }
    .fac__meta h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    .fac__meta span { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .fac__meta span ng-icon { width: 12px; height: 12px; }
    .fac__owner { font-size: 0.72rem; font-weight: 600; color: var(--zir-emerald); background: rgba(34,197,94,0.08); padding: 4px 10px; border-radius: 6px; }

    /* ── Room Card ────────────────────────────────── */
    .fac__rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; padding: 16px 20px; }
    .rm { display: flex; flex-direction: column; padding: 16px; background: var(--bg-secondary, #0c1829); border-radius: 14px; border: 1px solid var(--border-color, rgba(255,255,255,0.04)); transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
    .rm:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.2); border-color: rgba(34,197,94,0.15); }

    .rm__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .rm__temp { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--accent, #0ea5e9); }
    .rm__temp ng-icon { width: 13px; height: 13px; }
    .rm__avail { font-size: 0.7rem; font-weight: 700; color: #22c55e; background: rgba(34,197,94,0.1); padding: 3px 8px; border-radius: 6px; }

    .rm__name { margin: 0 0 8px; font-size: 0.92rem; font-weight: 700; color: var(--text-primary); line-height: 1.3; }

    .rm__price { margin-bottom: 10px; }
    .rm__price strong { font-size: 1.1rem; font-weight: 800; color: var(--zir-emerald); }
    .rm__price span { font-size: 0.72rem; color: var(--text-muted); margin-left: 2px; }

    .rm__specs { display: flex; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); margin-bottom: 10px; }
    .rm__specs span { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--text-muted); }
    .rm__specs ng-icon { width: 12px; height: 12px; color: var(--accent, #0ea5e9); }

    .rm__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
    .rm__tag { font-size: 0.65rem; font-weight: 600; padding: 3px 8px; border-radius: 5px; background: rgba(56,189,248,0.06); color: rgba(56,189,248,0.8); }
    .rm__tag--more { background: rgba(255,255,255,0.05); color: var(--text-muted); }

    .rm__book { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; border: none; border-radius: 10px; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; font-size: 0.8rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; margin-top: auto; }
    .rm__book:hover { box-shadow: 0 4px 16px rgba(34,197,94,0.3); }
    .rm__book ng-icon { width: 14px; height: 14px; }

    /* ── Empty ────────────────────────────────────── */
    .cs__empty { text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: 16px; }
    .cs__empty ng-icon { width: 40px; height: 40px; color: var(--text-muted); margin-bottom: 12px; }
    .cs__empty p { margin: 0; font-weight: 700; color: var(--text-primary); }
    .cs__empty span { font-size: 0.82rem; color: var(--text-muted); }

    /* ── Pagination ───────────────────────────────── */
    .cs__pager { display: flex; justify-content: center; align-items: center; gap: 16px; }
    .cs__pager button { padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); background: var(--bg-card); color: var(--text-primary); font-size: 0.8rem; font-family: inherit; cursor: pointer; }
    .cs__pager button:disabled { opacity: 0.3; }
    .cs__pager span { font-size: 0.8rem; color: var(--text-muted); }

    /* ── Skeleton ─────────────────────────────────── */
    .skel-fac { background: var(--bg-card); border-radius: 16px; padding: 20px; }
    .skel-fac__head { display: flex; gap: 12px; margin-bottom: 16px; }
    .skel { border-radius: 8px; background: linear-gradient(90deg, var(--bg-card-hover, #162a48) 25%, var(--bg-secondary, #0c1829) 50%, var(--bg-card-hover, #162a48) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .skel--icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; }
    .skel--title { width: 180px; height: 14px; margin-bottom: 6px; }
    .skel--sub { width: 120px; height: 10px; }
    .skel-fac__rooms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .skel-room { height: 200px; border-radius: 14px; background: linear-gradient(90deg, var(--bg-card-hover, #162a48) 25%, var(--bg-secondary, #0c1829) 50%, var(--bg-card-hover, #162a48) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Modal ─────────────────────────────────────── */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 99; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 440px; max-width: 95vw; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 18px; box-shadow: 0 24px 64px rgba(0,0,0,0.4); z-index: 100; }
    .modal__head { display: flex; align-items: center; gap: 12px; padding: 20px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .modal__icon { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0ea5e9, #22c55e); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .modal__icon ng-icon { width: 18px; height: 18px; color: #fff; }
    .modal__head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .modal__head span { font-size: 0.75rem; color: var(--text-muted); }
    .modal__x { position: absolute; top: 16px; right: 16px; width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .modal__x:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
    .modal__x ng-icon { width: 15px; height: 15px; }
    .modal__body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .modal__info { display: flex; gap: 8px; padding: 10px 14px; background: rgba(56,189,248,0.06); border-radius: 10px; font-size: 0.8rem; }
    .modal__info span { color: #38bdf8; font-weight: 600; }
    .modal__info span:last-child { margin-left: auto; color: var(--text-muted); }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
    .field input { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); background: var(--bg-secondary, #0c1829); color: var(--text-primary); font-size: 0.85rem; font-family: inherit; }
    .field input:focus { outline: none; border-color: var(--zir-emerald); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal__foot { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.04); }
    .btn-cancel { padding: 9px 18px; border-radius: 10px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); background: transparent; color: var(--text-muted); font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    .btn-cancel:hover { background: rgba(255,255,255,0.03); }
    .btn-confirm { display: flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; font-size: 0.82rem; font-weight: 700; font-family: inherit; cursor: pointer; }
    .btn-confirm:hover { box-shadow: 0 4px 16px rgba(34,197,94,0.3); }
    .btn-confirm ng-icon { width: 15px; height: 15px; }

    /* ── Responsive ────────────────────────────────── */
    @media (max-width: 768px) {
      .cs__filters { flex-wrap: wrap; }
      .cs__filter { min-width: 140px; }
      .fac__rooms { grid-template-columns: 1fr; }
      .skel-fac__rooms { grid-template-columns: 1fr; }
    }
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

  ngOnInit() { this.onSearch(); }

  getAvailable(room: any): number {
    return room.available_capacity ?? room.available_m3 ?? room.capacity_m3 ?? 0;
  }

  getTempLabel(type: string): string {
    if (type.includes('-18')) return '−18°C';
    if (type.includes('0°C')) return '+0 à +12°C';
    return 'Sec';
  }

  getUnitLabel(unit: string): string {
    const map: Record<string, string> = { M3: 'm³', TONNE: 't', KG: 'kg', LITRE: 'L', CAJOT: 'cajot', PALETTE: 'pal', FORFAIT: 'forf.' };
    return map[unit] || unit;
  }

  cleanTag(tag: string): string {
    return tag.replace(/_/g, ' ');
  }

  formatPrice(n: number): string {
    return n != null ? Number(n).toLocaleString('fr-TN', { maximumFractionDigits: 0 }) : '—';
  }

  formatElec(room: any): string {
    return room.electricity_billing_mode === 'TARIF_KWH'
      ? `${room.electricity_rate} TND/kWh`
      : `${room.electricity_rate} TND/mois`;
  }

  onSearch() {
    this.isLoading.set(true);
    this.cdr.markForCheck();
    let url = `${environment.apiUrl}/storage/facilities/search?page=${this.page()}&limit=${this.limit()}`;
    if (this.filters.governorate) url += `&governorate=${encodeURIComponent(this.filters.governorate)}`;
    if (this.filters.room_type) url += `&room_type=${encodeURIComponent(this.filters.room_type)}`;
    if (this.filters.min_capacity) url += `&min_capacity=${this.filters.min_capacity}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.facilities.set(res.items || res.data || []);
        this.total.set(res.total || 0);
        this.totalPages.set(Math.ceil((res.total || 0) / this.limit()) || 1);
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
    if (p >= 1 && p <= this.totalPages()) { this.page.set(p); this.onSearch(); }
  }

  openBookingModal(room: any, facility: any) {
    this.selectedRoom.set(room);
    this.selectedFacility.set(facility);
    this.bookingPayload.room_id = room.id;
    this.bookingPayload.occupied_capacity = Math.min(10, this.getAvailable(room));
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
        this.toast.success('Demande envoyée', 'Le propriétaire a été notifié.');
        this.closeModal();
        this.onSearch();
      },
      error: (err) => {
        this.toast.error('Erreur', err.error?.message || 'Impossible d\'envoyer la demande.');
      }
    });
  }
}
