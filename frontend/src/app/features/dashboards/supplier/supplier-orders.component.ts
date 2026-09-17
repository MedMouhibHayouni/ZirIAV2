import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLoader, lucideShoppingBag, lucideArrowRight, lucideCheckCircle,
  lucideTruck, lucideCircleDollarSign, lucideClock, lucidePackage, lucideUser,
  lucideFileText
} from '@ng-icons/lucide';
import { SupplierApiService, SupplierOrder, SupplierOrderStatus } from '../../../core/services/supplier-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

type KanbanCol = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED';

const COL_META: Record<KanbanCol, { label: string; color: string; next: KanbanCol | null }> = {
  PENDING:   { label: 'En attente',       color: '#f59e0b', next: 'CONFIRMED' },
  CONFIRMED: { label: 'Confirmée',        color: '#3b82f6', next: 'PREPARING' },
  PREPARING: { label: 'En préparation',   color: '#8b5cf6', next: 'SHIPPED' },
  SHIPPED:   { label: 'Expédiée',         color: '#0ea5e9', next: 'DELIVERED' },
  DELIVERED: { label: 'Livrée',           color: '#16a34a', next: null },
};

@Component({
  selector: 'app-supplier-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideLoader, lucideShoppingBag, lucideArrowRight, lucideCheckCircle,
    lucideTruck, lucideCircleDollarSign, lucideClock, lucidePackage, lucideUser,
    lucideFileText
  })],
  templateUrl: './supplier-orders.component.html',
  styleUrl: './supplier-orders.component.scss'
})
export class SupplierOrdersComponent implements OnInit {
  private readonly api = inject(SupplierApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);

  orders = signal<SupplierOrder[]>([]);
  isLoading = signal(true);
  processingId = signal<string | null>(null);

  readonly cols: KanbanCol[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'];
  readonly colMeta = COL_META;

  ngOnInit(): void {
    this.api.getOrders().subscribe({
      next: (data) => { this.orders.set(data); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  ordersFor(col: KanbanCol): SupplierOrder[] {
    return this.orders().filter(o => o.status === col);
  }

  totalFor(col: KanbanCol): number {
    return this.ordersFor(col).reduce((sum, o) => sum + Number(o.total_tnd), 0);
  }

  advance(order: SupplierOrder): void {
    const next = COL_META[order.status as KanbanCol]?.next;
    if (!next) return;
    this.processingId.set(order.id);
    this.api.updateOrderStatus(order.id, next).subscribe({
      next: (updated) => {
        this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.processingId.set(null);
        this.notifs.showSuccess(`Commande avancée à "${COL_META[next].label}"`);
        this.cdr.markForCheck();
      },
      error: () => { this.processingId.set(null); this.cdr.markForCheck(); }
    });
  }

  generateInvoice(order: any): void {
    this.processingId.set(order.id);
    this.api.http.post<any>(`${this.api.apiUrl}/supplier/invoices/from-order/${order.id}`, {}).subscribe({
      next: (invoice) => {
        this.notifs.showSuccess('Facture générée avec succès');
        this.orders.update(list => list.map(o => o.id === order.id ? { ...o, invoice_id: invoice.id, invoice_number: invoice.invoice_number } : o));
        this.processingId.set(null);
        this.cdr.markForCheck();
      },
      error: () => {
        this.notifs.showError('Erreur lors de la génération de la facture');
        this.processingId.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  viewInvoice(invoiceId: string): void {
    this.api.http.get(`${this.api.apiUrl}/supplier/invoices/${invoiceId}/pdf`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
