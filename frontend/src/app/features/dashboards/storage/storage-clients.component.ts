import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers, lucideSearch, lucidePhoneCall, lucideAlertTriangle,
  lucideCheckCircle2, lucideRefreshCw, lucideChevronDown, lucideChevronUp,
  lucideDollarSign, lucideZap, lucideAlertCircle, lucideClock, lucideCreditCard, lucideCheck, lucideX, lucideBox
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-storage-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideUsers, lucideSearch, lucidePhoneCall, lucideAlertTriangle,
    lucideCheckCircle2, lucideRefreshCw, lucideChevronDown, lucideChevronUp,
    lucideDollarSign, lucideZap, lucideAlertCircle, lucideClock, lucideCreditCard, lucideCheck, lucideX, lucideBox
  })],
  templateUrl: './storage-clients.component.html',
  styleUrls: ['./storage-clients.component.scss']
})
export class StorageClientsComponent implements OnInit {
  loading = signal(true);
  clients = signal<any[]>([]);
  searchQuery = signal('');
  filterTab = signal<'ALL' | 'OVERDUE_60' | 'OVERDUE_30' | 'OK'>('ALL');
  expandedPhone = signal<string | null>(null);

  paymentModal = signal<{ client: any; reservation: any } | null>(null);
  paymentAmount = signal(0);
  paymentNote = signal('');
  paymentLoading = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/storage/clients`).subscribe({
      next: (data) => {
        this.clients.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  get filteredClients() {
    const q = this.searchQuery().toLowerCase().trim();
    const tab = this.filterTab();

    return this.clients().filter(client => {
      const matchSearch = !q || (client.client_name?.toLowerCase().includes(q) || client.phone?.includes(q));
      if (!matchSearch) return false;

      if (tab === 'OVERDUE_60') return client.max_days_overdue >= 60;
      if (tab === 'OVERDUE_30') return client.max_days_overdue >= 30 && client.max_days_overdue < 60;
      if (tab === 'OK') return !client.has_overdue && client.total_unpaid_tnd <= 0;
      return true;
    });
  }

  get totalUnpaid() {
    return this.clients().reduce((sum, c) => sum + Number(c.total_unpaid_tnd || 0), 0);
  }

  get overdue60Count() {
    return this.clients().filter(c => c.max_days_overdue >= 60).length;
  }

  get overdue30Count() {
    return this.clients().filter(c => c.max_days_overdue >= 30 && c.max_days_overdue < 60).length;
  }

  toggleExpand(phone: string) {
    this.expandedPhone.update(curr => curr === phone ? null : phone);
  }

  openPaymentModal(client: any, reservation: any) {
    this.paymentModal.set({ client, reservation });
    this.paymentAmount.set(Number(reservation.amount_due_tnd || 0));
    this.paymentNote.set('');
  }

  closePaymentModal() {
    this.paymentModal.set(null);
    this.paymentLoading.set(false);
  }

  submitPayment() {
    const modal = this.paymentModal();
    if (!modal || this.paymentAmount() <= 0) return;

    this.paymentLoading.set(true);
    this.http.post(`${environment.apiUrl}/storage/reservations/${modal.reservation.reservation_id}/record-payment`, {
      amount: this.paymentAmount(),
      note: this.paymentNote()
    }).subscribe({
      next: () => {
        this.paymentLoading.set(false);
        this.closePaymentModal();
        this.loadClients();
      },
      error: () => this.paymentLoading.set(false)
    });
  }

  callClient(phone: string) {
    window.open(`tel:${phone}`, '_self');
  }

  getOverdueBadge(days: number): { label: string; class: string } {
    if (days >= 60) return { label: `${days} jours (60+d)`, class: 'badge-danger-60' };
    if (days >= 30) return { label: `${days} jours (30+d)`, class: 'badge-warning-30' };
    if (days > 0) return { label: `${days} jours`, class: 'badge-warning' };
    return { label: 'À jour', class: 'badge-ok' };
  }

  trackByPhone(_: number, c: any) { return c.phone; }
}
