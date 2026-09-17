import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideFileText, lucideTrash2, lucideDownload, lucideCheckCircle2, lucideX } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-supplier-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [DatePipe, provideIcons({ lucidePlus, lucideFileText, lucideTrash2, lucideDownload, lucideCheckCircle2, lucideX })],
  templateUrl: './supplier-invoices.component.html',
  styleUrls: ['./supplier-invoices.component.scss']
})
export class SupplierInvoicesComponent implements OnInit {
  private http = inject(HttpClient);
  
  invoices: any[] = [];
  stats: any = null;
  loading = true;
  
  showDrawer = false;
  showPdfModal = false;
  selectedInvoice: any = null;
  
  newInvoice: any = {
    buyer_name: '',
    buyer_phone: '',
    buyer_address: '',
    tax_rate: 19,
    notes: '',
    due_date: null,
    items_json: []
  };

  newItem = { description: '', quantity: 1, unit_price: 0 };
  creating = false;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/supplier/invoices/stats`).subscribe(res => this.stats = res);
    this.http.get<any[]>(`${environment.apiUrl}/supplier/invoices`).subscribe({
      next: (res) => {
        this.invoices = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  addItem() {
    if (!this.newItem.description || this.newItem.quantity <= 0 || this.newItem.unit_price <= 0) return;
    this.newInvoice.items_json.push({ ...this.newItem, total: this.newItem.quantity * this.newItem.unit_price });
    this.newItem = { description: '', quantity: 1, unit_price: 0 };
  }

  removeItem(index: number) {
    this.newInvoice.items_json.splice(index, 1);
  }

  calculateNewSubtotal() {
    return this.newInvoice.items_json.reduce((sum: number, item: any) => sum + item.total, 0);
  }

  createInvoice() {
    if (!this.newInvoice.buyer_name || this.newInvoice.items_json.length === 0) return;
    this.creating = true;
    this.http.post(`${environment.apiUrl}/supplier/invoices`, this.newInvoice).subscribe({
      next: () => {
        this.creating = false;
        this.showDrawer = false;
        this.resetForm();
        this.loadData();
      },
      error: (err) => {
        this.creating = false;
        alert(err.error?.message || 'Erreur lors de la création.');
      }
    });
  }

  resetForm() {
    this.newInvoice = {
      buyer_name: '', buyer_phone: '', buyer_address: '', tax_rate: 19, notes: '', due_date: null, items_json: []
    };
  }

  markAsPaid(id: string) {
    this.http.patch(`${environment.apiUrl}/supplier/invoices/${id}/status`, { status: 'PAID', paid_at: new Date().toISOString() }).subscribe(() => this.loadData());
  }

  deleteInvoice(id: string) {
    if(confirm('Supprimer cette facture brouillon ?')) {
      this.http.delete(`${environment.apiUrl}/supplier/invoices/${id}`).subscribe(() => this.loadData());
    }
  }

  viewPdf(inv: any) {
    this.selectedInvoice = inv;
    this.showPdfModal = true;
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'PAID': return 'bg-green-900/50 text-green-400 border-green-800';
      case 'SENT': return 'bg-blue-900/50 text-blue-400 border-blue-800';
      case 'DRAFT': return 'bg-gray-800 text-gray-400 border-gray-700';
      case 'CANCELLED': return 'bg-red-900/50 text-red-400 border-red-800';
      default: return 'bg-gray-800 text-gray-400';
    }
  }
}
