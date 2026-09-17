import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideKanban, lucideLoader, lucideArrowRight, lucideTruck, lucideXCircle, lucideSend,
  lucideMessageSquare, lucideHandshake, lucideCheckCircle, lucideTrophy,
} from '@ng-icons/lucide';

interface Connection {
  id: string;
  listing?: { crop_type: string; seller?: { name: string }; price_per_kg: number; governorate: string };
  quantity_tonnes: number;
  proposed_price_per_kg: number;
  delivery_deadline?: string;
  status: string;
  message?: string;
  _requesting_transport?: boolean;
}

const KANBAN_STAGES = [
  { key: 'INTERESTED', label: 'Intéressé', color: '#6366f1', icon: 'lucideMessageSquare' },
  { key: 'NEGOTIATING', label: 'Négociation', color: '#f59e0b', icon: 'lucideHandshake' },
  { key: 'CONFIRMED', label: 'Confirmé', color: '#10b981', icon: 'lucideCheckCircle' },
  { key: 'IN_TRANSPORT', label: 'En Transit', color: '#3b82f6', icon: 'lucideTruck' },
  { key: 'COMPLETED', label: 'Complété', color: '#64748b', icon: 'lucideTrophy' },
];

@Component({
  selector: 'app-b2b-contracts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ 
    lucideKanban, lucideLoader, lucideArrowRight, lucideTruck, lucideXCircle, lucideSend,
    lucideMessageSquare, lucideHandshake, lucideCheckCircle, lucideTrophy
  })],
  templateUrl: './b2b-contracts.component.html',
  styleUrl: './b2b-contracts.component.scss',
})
export class B2bContractsComponent implements OnInit {
  private http = inject(HttpClient);

  connections = signal<Connection[]>([]);
  isLoading = signal(true);

  showTransportModal = false;
  selectedConnection: Connection | null = null;
  transportForm = { origin_governorate: '', destination_governorate: '', cargo_description: '', quantity_tons: 0, pickup_date: '', budget_tnd: 0 };
  isRequestingTransport = signal(false);

  readonly stages = KANBAN_STAGES;

  getByStatus(status: string) {
    return this.connections().filter(c => c.status === status);
  }

  ngOnInit() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.http.get<Connection[]>(`${environment.apiUrl}/marketplace/connections/me?buyer=true`).subscribe({
      next: (data) => { this.connections.set(Array.isArray(data) ? data : []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  moveCard(connection: Connection, toStatus: string) {
    const oldStatus = connection.status;
    this.connections.update(list => list.map(c => c.id === connection.id ? { ...c, status: toStatus } : c));
    this.http.patch(`${environment.apiUrl}/marketplace/connections/${connection.id}/status`, { status: toStatus }).subscribe({
      error: () => {
        this.connections.update(list => list.map(c => c.id === connection.id ? { ...c, status: oldStatus } : c));
      },
    });
  }

  openTransportModal(connection: Connection) {
    this.selectedConnection = connection;
    this.transportForm = {
      origin_governorate: connection.listing?.governorate ?? '',
      destination_governorate: '',
      cargo_description: `${connection.listing?.crop_type ?? 'Marchandise'} — ${connection.quantity_tonnes}T`,
      quantity_tons: connection.quantity_tonnes,
      pickup_date: connection.delivery_deadline ?? '',
      budget_tnd: 0,
    };
    this.showTransportModal = true;
  }

  requestTransport() {
    if (!this.selectedConnection) return;
    this.isRequestingTransport.set(true);
    this.http.post(`${environment.apiUrl}/drivers/requests`, this.transportForm).subscribe({
      next: () => {
        this.showTransportModal = false;
        this.isRequestingTransport.set(false);
        this.moveCard(this.selectedConnection!, 'IN_TRANSPORT');
      },
      error: () => this.isRequestingTransport.set(false),
    });
  }

  getNextStageKey(current: string): string {
    const idx = KANBAN_STAGES.findIndex(s => s.key === current);
    return idx < KANBAN_STAGES.length - 1 ? KANBAN_STAGES[idx + 1].key : '';
  }
}
