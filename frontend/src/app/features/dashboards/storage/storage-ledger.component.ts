import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucidePhoneCall, lucideAlertTriangle, lucideCheck, lucideRefreshCw, lucideChevronDown, lucideChevronUp, lucideBox, lucideCreditCard, lucideX } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-storage-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({ lucideSearch, lucidePhoneCall, lucideAlertTriangle, lucideCheck, lucideRefreshCw, lucideChevronDown, lucideChevronUp, lucideBox, lucideCreditCard, lucideX })],
  templateUrl: './storage-ledger.component.html',
  styleUrls: ['./storage-ledger.component.scss']
})
export class StorageLedgerComponent implements OnInit {
  loading = signal(true);
  clients = signal<any[]>([]);
  searchQuery = signal('');
  expandedClient = signal<string | null>(null);

  paymentModal = signal<{ client: any; reservation: any } | null>(null);
  paymentAmount = signal(0);
  paymentNote = signal('');
  paymentLoading = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadLedger(); }

  loadLedger() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/storage/reports/client-ledger`).subscribe({
      next: (data) => { this.clients.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  get filteredClients() {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      c.client_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }

  get totalUnpaid() {
    return this.clients().reduce((sum, c) => sum + Number(c.total_unpaid_tnd || 0), 0);
  }

  get overdueCount() {
    return this.clients().filter(c => c.has_overdue).length;
  }

  toggleExpand(phone: string) {
    this.expandedClient.update(v => v === phone ? null : phone);
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
        this.loadLedger();
      },
      error: () => this.paymentLoading.set(false)
    });
  }

  getPaymentStatusLabel(status: string): string {
    const map: Record<string, string> = { A_JOUR: '✅ À Jour', EN_RETARD: '🚨 En Retard', PAYE_PARTIEL: '⚠️ Partiel' };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = { A_JOUR: 'ok', EN_RETARD: 'overdue', PAYE_PARTIEL: 'partial' };
    return map[status] || '';
  }

  callClient(phone: string) {
    window.open(`tel:${phone}`, '_self');
  }

  trackByPhone(_: number, c: any) { return c.phone; }
}
