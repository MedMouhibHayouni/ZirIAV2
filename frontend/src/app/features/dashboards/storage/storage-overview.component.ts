import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard, lucideBox, lucideZap, lucideUsers,
  lucideAlertTriangle, lucideTrendingUp, lucideCheck, lucideInfo,
  lucideRefreshCw, lucideChevronRight, lucideThermometer, lucideDollarSign,
  lucideBuilding2, lucidePalette, lucideAlertCircle, lucideArrowUp, lucideArrowDown, lucideCheckCircle
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-storage-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent],
  viewProviders: [provideIcons({
    lucideLayoutDashboard, lucideBox, lucideZap, lucideUsers,
    lucideAlertTriangle, lucideTrendingUp, lucideCheck, lucideInfo,
    lucideRefreshCw, lucideChevronRight, lucideThermometer, lucideDollarSign,
    lucideBuilding2, lucidePalette, lucideAlertCircle, lucideArrowUp, lucideArrowDown, lucideCheckCircle
  })],
  templateUrl: './storage-overview.component.html',
  styleUrls: ['./storage-overview.component.scss']
})
export class StorageOverviewComponent implements OnInit {
  loading = signal(true);
  revenue = signal<any>(null);
  rooms = signal<any[]>([]);
  facilities = signal<any[]>([]);
  selectedFacilityId = signal<string>('');

  designMode = signal(false);

  ROOM_COLORS = [
    { hex: '#0ea5e9', label: 'Négatif (Froide)' },
    { hex: '#10b981', label: 'Positif (Frais)' },
    { hex: '#f59e0b', label: 'Fruits & Lègumes' },
    { hex: '#8b5cf6', label: 'Stockage Liquides' },
    { hex: '#ec4899', label: 'Chambre Spéciale' },
    { hex: '#64748b', label: 'Stockage Sec' },
  ];

  BADGES = ['Double Compresseur', 'Humidificateur Auto', 'Groupe de Secours', 'Dégivrage Gaz Chaud', 'Sonde IoT', 'Alarme Porte', 'Cuves Inox', 'Système Azote', 'Ventilation Forte'];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/my`).subscribe({
      next: (facilities) => {
        this.facilities.set(facilities);
        if (facilities.length > 0) {
          const fid = facilities[0].id;
          this.selectedFacilityId.set(fid);
          this.loadRooms(fid);
          this.loadRevenue();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  loadRooms(facilityId: string) {
    this.http.get<any[]>(`${environment.apiUrl}/storage/facilities/${facilityId}/rooms`).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadRevenue() {
    this.http.get<any>(`${environment.apiUrl}/storage/revenue/summary`).subscribe({
      next: (rev) => this.revenue.set(rev)
    });
  }

  get totalCapacity() {
    return this.rooms().reduce((sum, r) => sum + Number(r.total_capacity || r.capacity_m3 || 0), 0);
  }

  get totalOccupied() {
    return this.rooms().reduce((sum, r) => sum + Number(r.occupied_capacity || 0), 0);
  }

  get globalOccupancyRate() {
    const total = this.totalCapacity;
    const occ = this.totalOccupied;
    return total > 0 ? Math.min(100, Math.round((occ / total) * 100)) : 0;
  }

  get overdueCount() {
    return this.revenue()?.overdue_clients_count || 0;
  }

  getRoomFillPercent(room: any): number {
    const tc = Number(room.total_capacity || room.capacity_m3 || 100);
    const occ = Number(room.occupied_capacity || 0);
    return tc > 0 ? Math.min(100, Math.round((occ / tc) * 100)) : 0;
  }

  getUnitLabel(unit: string): string {
    const map: Record<string, string> = { M3: 'm³', CAJOT: 'cajots', KG: 'kg', LITRE: 'L', FORFAIT: 'forfait' };
    return map[unit] || unit;
  }

  toggleDesignMode() {
    this.designMode.update(v => !v);
  }

  updateRoomColor(room: any, colorHex: string) {
    this.http.patch(`${environment.apiUrl}/storage/rooms/${room.id}/design`, { color_hex: colorHex }).subscribe({
      next: () => {
        const rooms = this.rooms().map(r => r.id === room.id ? { ...r, color_hex: colorHex } : r);
        this.rooms.set(rooms);
      }
    });
  }

  toggleBadge(room: any, badge: string) {
    const badges = room.equipment_badges || [];
    const newBadges = badges.includes(badge) ? badges.filter((b: string) => b !== badge) : [...badges, badge];
    this.http.patch(`${environment.apiUrl}/storage/rooms/${room.id}/design`, { equipment_badges: newBadges }).subscribe({
      next: () => {
        const rooms = this.rooms().map(r => r.id === room.id ? { ...r, equipment_badges: newBadges } : r);
        this.rooms.set(rooms);
      }
    });
  }

  moveRoom(room: any, direction: 1 | -1) {
    const roomsList = [...this.rooms()];
    const idx = roomsList.findIndex(r => r.id === room.id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= roomsList.length) return;

    [roomsList[idx], roomsList[newIdx]] = [roomsList[newIdx], roomsList[idx]];
    roomsList.forEach((r, i) => r.grid_order = i);
    this.rooms.set(roomsList);

    this.http.patch(`${environment.apiUrl}/storage/rooms/${room.id}/design`, { grid_order: newIdx }).subscribe();
  }

  getAdviceIcon(type: string): string {
    const map: Record<string, string> = { DANGER: '🚨', WARNING: '⚠️', TIP: '💡' };
    return map[type] || '💡';
  }

  trackByRoomId(_: number, room: any) { return room.id; }
}
