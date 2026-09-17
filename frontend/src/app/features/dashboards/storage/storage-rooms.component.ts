import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2, lucideSettings, lucideRefreshCw, lucideZap, lucideThermometer, lucideBuilding2, lucideCheck, lucideX, lucideEdit3 } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-storage-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2, lucideSettings, lucideRefreshCw, lucideZap, lucideThermometer, lucideBuilding2, lucideCheck, lucideX, lucideEdit3 })],
  templateUrl: './storage-rooms.component.html',
  styleUrls: ['./storage-rooms.component.scss']
})
export class StorageRoomsComponent implements OnInit {
  loading = signal(true);
  rooms = signal<any[]>([]);
  facilityId = signal<string>('');
  showAddModal = signal(false);
  saving = signal(false);

  newRoom = signal({
    name: '',
    room_type: 'Chambre positive (0°C à +12°C)',
    capacity_m3: 100,
    total_capacity: 100,
    pricing_unit: 'M3',
    unit_price: 1.5,
    compressor_power_kw: 15,
    color_hex: '#10b981',
    equipment_badges: [] as string[],
    initial_occupant_label: '',
    client_phone: '',
    initial_occupied_capacity: 0,
  });

  readonly ROOM_TYPES = [
    'Chambre positive (0°C à +12°C)',
    'Chambre négative (-18°C)',
    'Chambre positive fruits (0°C à +5°C)',
    'Stockage sec',
    'Stockage liquides',
    'Chambre de maturation',
  ];

  readonly PRICING_UNITS = [
    { value: 'M3', label: 'm³ (Mètre Cube)' },
    { value: 'CAJOT', label: 'Cajot (Caisse)' },
    { value: 'KG', label: 'KG (Kilogramme)' },
    { value: 'LITRE', label: 'Litre' },
    { value: 'FORFAIT', label: 'Forfait Mensuel' },
  ];

  readonly COLORS = [
    { hex: '#0ea5e9', label: 'Bleu Négatif' },
    { hex: '#10b981', label: 'Vert Positif' },
    { hex: '#f59e0b', label: 'Amber Fruits' },
    { hex: '#8b5cf6', label: 'Violet Liquides' },
    { hex: '#ec4899', label: 'Rose Spéciaux' },
    { hex: '#64748b', label: 'Gris Sec' },
  ];

  readonly ALL_BADGES = ['Double Compresseur', 'Humidificateur Auto', 'Groupe de Secours', 'Dégivrage Gaz Chaud', 'Sonde IoT', 'Alarme Porte', 'Cuves Inox', 'Système Azote', 'Ventilation Forte', 'Anti-Rongeurs'];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/my`).subscribe({
      next: (facs) => {
        if (facs.length > 0) {
          this.facilityId.set(facs[0].id);
          this.loadRooms(facs[0].id);
        } else { this.loading.set(false); }
      },
      error: () => this.loading.set(false)
    });
  }

  loadRooms(facilityId: string) {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/${facilityId}/rooms`).subscribe({
      next: (rooms) => { this.rooms.set(rooms); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getUnitLabel(unit: string): string {
    const map: Record<string, string> = { M3: 'm³', CAJOT: 'cajots', KG: 'kg', LITRE: 'L', FORFAIT: 'forfait' };
    return map[unit] || unit;
  }

  getPricingLabel(unit: string): string {
    const found = this.PRICING_UNITS.find(u => u.value === unit);
    return found?.label || unit;
  }

  getRoomFillPercent(room: any): number {
    const tc = Number(room.total_capacity || 100);
    if (room.pricing_unit === 'FORFAIT') return Number(room.occupied_capacity || 0) > 0 ? 100 : 0;
    return tc > 0 ? Math.min(100, Math.round((Number(room.occupied_capacity || 0) / tc) * 100)) : 0;
  }

  toggleNewRoomBadge(badge: string) {
    const current = { ...this.newRoom() };
    const badges = current.equipment_badges;
    current.equipment_badges = badges.includes(badge) ? badges.filter(b => b !== badge) : [...badges, badge];
    this.newRoom.set(current);
  }

  updateNewRoom(field: string, value: any) {
    this.newRoom.set({ ...this.newRoom(), [field as keyof typeof this.newRoom]: value });
  }

  saveRoom() {
    if (!this.facilityId() || !this.newRoom().name.trim()) return;
    this.saving.set(true);

    const payload = {
      facility_id: this.facilityId(),
      ...this.newRoom(),
      price_per_m3_day: this.newRoom().unit_price,
    };

    this.http.post(`${environment.apiUrl}/storage/rooms`, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAddModal.set(false);
        this.resetNewRoom();
        this.loadRooms(this.facilityId());
      },
      error: () => this.saving.set(false)
    });
  }

  resetNewRoom() {
    this.newRoom.set({
      name: '', room_type: 'Chambre positive (0°C à +12°C)',
      capacity_m3: 100, total_capacity: 100, pricing_unit: 'M3', unit_price: 1.5,
      compressor_power_kw: 15, color_hex: '#10b981', equipment_badges: [],
      initial_occupant_label: '', client_phone: '', initial_occupied_capacity: 0,
    });
  }

  toggleRoomAvailability(room: any) {
    this.http.patch(`${environment.apiUrl}/storage/rooms/${room.id}/toggle-availability`, {}).subscribe({
      next: () => this.loadRooms(this.facilityId())
    });
  }

  trackById(_: number, r: any) { return r.id; }
}
