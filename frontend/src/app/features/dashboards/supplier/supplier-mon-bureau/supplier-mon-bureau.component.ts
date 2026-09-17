import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideReceipt, lucideShoppingCart, lucidePackage, lucideTrendingUp,
  lucidePlus, lucideEye, lucideFileText, lucideEdit, lucideTrash2,
  lucideX, lucideSave, lucideSend, lucideCheckCircle, lucideAlertTriangle,
  lucideSearch, lucideDownload, lucideFilter, lucideDollarSign,
  lucideClock, lucideCalendar, lucideUser, lucideBuilding2, lucideTag,
  lucideArrowUpRight, lucideArrowDownRight, lucideMoreVertical,
  lucideRefreshCw, lucideBoxes, lucideClipboardList, lucideBarChart3,
  lucideWallet, lucideCircleAlert, lucideCircleCheck, lucideMinus,
  lucideChevronDown, lucideChevronUp, lucideBanknote, lucideZap,
  lucideHistory, lucideArchive, lucideStar, lucideGlobe, lucidePieChart,
  lucidePhone, lucideMail, lucideMapPin, lucideSettings2
} from '@ng-icons/lucide';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-supplier-mon-bureau',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideReceipt, lucideShoppingCart, lucidePackage, lucideTrendingUp,
    lucidePlus, lucideEye, lucideFileText, lucideEdit, lucideTrash2,
    lucideX, lucideSave, lucideSend, lucideCheckCircle, lucideAlertTriangle,
    lucideSearch, lucideDownload, lucideFilter, lucideDollarSign,
    lucideClock, lucideCalendar, lucideUser, lucideBuilding2, lucideTag,
    lucideArrowUpRight, lucideArrowDownRight, lucideMoreVertical,
    lucideRefreshCw, lucideBoxes, lucideClipboardList, lucideBarChart3,
    lucideWallet, lucideCircleAlert, lucideCircleCheck, lucideMinus,
    lucideChevronDown, lucideChevronUp, lucideBanknote, lucideZap,
    lucideHistory, lucideArchive, lucideStar, lucideGlobe, lucidePieChart,
    lucidePhone, lucideMail, lucideMapPin, lucideSettings2
  })],
  templateUrl: './supplier-mon-bureau.component.html',
  styleUrls: ['./supplier-mon-bureau.component.scss']
})
export class SupplierMonBureauComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'invoices' | 'purchases' | 'stock' | 'finances' = 'invoices';

  // State
  isLoading = false;
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  // Factures Tab
  invoices: any[] = [];
  invoiceStats: any = { total_invoiced_this_month: 0, total_paid_this_month: 0, total_pending: 0, overdue_count: 0 };
  showInvoiceDrawer = false;
  invoiceMode: 'order' | 'manual' = 'manual';
  manualInvoiceForm: any = {
    client_name: '', client_phone: '', client_address: '', client_email: '', client_tax_id: '',
    items: [{ description: '', quantity: 1, unit: 'unité', unit_price: 0 }],
    discount_amount_tnd: 0, tax_rate: 19, payment_method: 'CASH', due_date: '', notes: ''
  };
  deliveredOrders: any[] = [];
  selectedOrderId = '';
  invoiceSearchTerm = '';
  invoiceStatusFilter = '';

  // Preview Invoice
  showInvoicePreview = false;
  previewInvoice: any = null;
  partialPaymentAmount = 0;
  showPartialPaymentInput = false;

  // Achats Tab
  purchases: any[] = [];
  purchaseStats: any = { spent_this_month: 0, pending_deliveries: 0, low_stock_count: 0 };
  showPurchaseDrawer = false;
  purchaseForm: any = { vendor_name: '', reference_number: '', expected_delivery_date: '', items: [{ description: '', quantity: 1, unit_price: 0 }] };
  showReceiveModal = false;
  selectedPurchaseForReceive: any = null;
  receiveFormItems: any[] = [];
  receiveNotes = '';

  // Stock Tab
  stockReport: any = { products: [], summary: { total_stock_value: 0, out_of_stock_count: 0, low_stock_count: 0 } };
  stockMovements: any[] = [];
  showStockAdjustModal = false;
  selectedStockProduct: any = null;
  stockAdjustForm: any = { new_quantity: 0, notes: '' };

  // Finances Tab
  erpDashboard: any = { revenue_this_month: 0, purchase_spending_this_month: 0, gross_margin_pct: 0, overdue_amount: 0, top_clients: [] };
  revenueChart: any;
  splitChart: any;

  get filteredInvoices() {
    return this.invoices.filter(inv => {
      const matchSearch = !this.invoiceSearchTerm ||
        inv.client_name?.toLowerCase().includes(this.invoiceSearchTerm.toLowerCase()) ||
        inv.invoice_number?.toLowerCase().includes(this.invoiceSearchTerm.toLowerCase());
      const matchStatus = !this.invoiceStatusFilter || inv.status === this.invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  ngOnInit() {
    this.loadActiveTab();
  }

  setTab(tab: 'invoices' | 'purchases' | 'stock' | 'finances') {
    this.activeTab = tab;
    this.loadActiveTab();
    this.cdr.detectChanges();
  }

  loadActiveTab() {
    this.isLoading = true;
    this.cdr.detectChanges();
    switch (this.activeTab) {
      case 'invoices': this.loadInvoices(); break;
      case 'purchases': this.loadPurchases(); break;
      case 'stock': this.loadStock(); break;
      case 'finances': this.loadFinances(); break;
    }
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    setTimeout(() => this.toastMessage = null, 4000);
  }

  getAuthHeaders() {
    return new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadInvoices() {
    this.http.get(`${this.apiUrl}/supplier/invoices/stats`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.invoiceStats = res; this.cdr.detectChanges(); }, error: () => {} });
    this.http.get(`${this.apiUrl}/supplier/invoices`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.invoices = res; this.isLoading = false; this.cdr.detectChanges(); }, error: () => { this.isLoading = false; this.cdr.detectChanges(); } });
  }

  openInvoiceDrawer() {
    this.showInvoiceDrawer = true;
    this.invoiceMode = 'manual';
    this.manualInvoiceForm = {
      client_name: '', client_phone: '', client_address: '', client_email: '', client_tax_id: '',
      items: [{ description: '', quantity: 1, unit: 'unité', unit_price: 0 }],
      discount_amount_tnd: 0, tax_rate: 19, payment_method: 'CASH', due_date: '', notes: ''
    };
    this.http.get(`${this.apiUrl}/supplier/orders/my?status=DELIVERED`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => this.deliveredOrders = res, error: () => {} });
  }

  addInvoiceItem() {
    this.manualInvoiceForm.items.push({ description: '', quantity: 1, unit: 'unité', unit_price: 0 });
  }
  removeInvoiceItem(index: number) {
    if (this.manualInvoiceForm.items.length > 1) this.manualInvoiceForm.items.splice(index, 1);
  }

  calcInvoiceTotals() {
    let subtotal = 0;
    this.manualInvoiceForm.items.forEach((item: any) => { subtotal += (item.quantity || 0) * (item.unit_price || 0); });
    const discount = this.manualInvoiceForm.discount_amount_tnd || 0;
    const tax = (subtotal - discount) * ((this.manualInvoiceForm.tax_rate || 19) / 100);
    return { subtotal, discount, tax, total: (subtotal - discount) + tax };
  }

  submitInvoice(status: string) {
    if (this.invoiceMode === 'order') {
      if (!this.selectedOrderId) return;
      this.http.post(`${this.apiUrl}/supplier/invoices/from-order/${this.selectedOrderId}`, {}, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => { this.showInvoiceDrawer = false; this.loadInvoices(); this.showToast('Facture générée avec succès'); },
          error: () => this.showToast('Erreur lors de la génération', 'error')
        });
    } else {
      const payload = { ...this.manualInvoiceForm, status };
      this.http.post(`${this.apiUrl}/supplier/invoices/manual`, payload, { headers: this.getAuthHeaders() })
        .subscribe({
          next: () => { this.showInvoiceDrawer = false; this.loadInvoices(); this.showToast('Facture créée avec succès'); },
          error: () => this.showToast('Veuillez remplir tous les champs requis', 'error')
        });
    }
  }

  viewInvoice(id: string) {
    this.http.get(`${this.apiUrl}/supplier/invoices/${id}`, { headers: this.getAuthHeaders() })
      .subscribe((res: any) => { this.previewInvoice = res; this.showInvoicePreview = true; this.showPartialPaymentInput = false; });
  }

  deleteInvoice(id: string) {
    if (confirm('Supprimer définitivement cette facture ?')) {
      this.http.delete(`${this.apiUrl}/supplier/invoices/${id}`, { headers: this.getAuthHeaders() })
        .subscribe(() => { this.loadInvoices(); this.showToast('Facture supprimée'); });
    }
  }

  downloadPdf(id: string) {
    this.http.get(`${this.apiUrl}/supplier/invoices/${id}/pdf`, { headers: this.getAuthHeaders(), responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `facture-${id}.pdf`; a.click();
        URL.revokeObjectURL(url);
        this.showToast('PDF téléchargé avec succès');
      });
  }

  markInvoicePaid(id: string, amount?: number) {
    const isPartial = amount && amount < (this.previewInvoice?.total_tnd || 0);
    const payload: any = { status: isPartial ? 'PARTIAL' : 'PAID', amount_paid_tnd: amount };
    this.http.patch(`${this.apiUrl}/supplier/invoices/${id}`, payload, { headers: this.getAuthHeaders() })
      .subscribe(() => { this.showInvoicePreview = false; this.loadInvoices(); this.showToast('Paiement enregistré'); });
  }

  // --- ACHATS ---
  loadPurchases() {
    this.http.get(`${this.apiUrl}/supplier/purchases/stats`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.purchaseStats = res; this.cdr.detectChanges(); }, error: () => {} });
    this.http.get(`${this.apiUrl}/supplier/purchases`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.purchases = res; this.isLoading = false; this.cdr.detectChanges(); }, error: () => { this.isLoading = false; this.cdr.detectChanges(); } });
  }

  openPurchaseDrawer() {
    this.showPurchaseDrawer = true;
    this.purchaseForm = { vendor_name: '', reference_number: '', expected_delivery_date: '', items: [{ description: '', quantity: 1, unit_price: 0 }] };
  }
  addPurchaseItem() { this.purchaseForm.items.push({ description: '', quantity: 1, unit_price: 0 }); }
  removePurchaseItem(index: number) { if (this.purchaseForm.items.length > 1) this.purchaseForm.items.splice(index, 1); }

  calcPurchaseTotal() {
    return this.purchaseForm.items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  }

  submitPurchase() {
    this.http.post(`${this.apiUrl}/supplier/purchases`, this.purchaseForm, { headers: this.getAuthHeaders() })
      .subscribe({
        next: () => { this.showPurchaseDrawer = false; this.loadPurchases(); this.showToast('Commande d\'achat créée'); },
        error: () => this.showToast('Erreur lors de la création', 'error')
      });
  }

  openReceiveModal(purchase: any) {
    this.selectedPurchaseForReceive = purchase;
    this.receiveFormItems = purchase.items.map((i: any) => ({ description: i.description, quantity_received: i.quantity }));
    this.receiveNotes = '';
    this.showReceiveModal = true;
  }

  submitReceive() {
    const payload = { received_items: this.receiveFormItems, notes: this.receiveNotes };
    this.http.patch(`${this.apiUrl}/supplier/purchases/${this.selectedPurchaseForReceive.id}/receive`, payload, { headers: this.getAuthHeaders() })
      .subscribe(() => { this.showReceiveModal = false; this.loadPurchases(); this.showToast('Livraison réceptionnée. Stock mis à jour.'); });
  }

  // --- STOCK ---
  loadStock() {
    this.http.get(`${this.apiUrl}/supplier/stock/report`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.stockReport = res; this.isLoading = false; this.cdr.detectChanges(); }, error: () => { this.isLoading = false; this.cdr.detectChanges(); } });
    this.http.get(`${this.apiUrl}/supplier/stock/movements`, { headers: this.getAuthHeaders() })
      .subscribe({ next: (res: any) => { this.stockMovements = res; this.cdr.detectChanges(); }, error: () => {} });
  }

  openStockAdjust(product: any) {
    this.selectedStockProduct = product;
    this.stockAdjustForm = { new_quantity: product.stock_qty, notes: '' };
    this.showStockAdjustModal = true;
  }

  submitStockAdjust() {
    if (!this.selectedStockProduct) return;
    const payload = { product_id: this.selectedStockProduct.id, new_quantity: this.stockAdjustForm.new_quantity, notes: this.stockAdjustForm.notes };
    this.http.post(`${this.apiUrl}/supplier/stock/adjust`, payload, { headers: this.getAuthHeaders() })
      .subscribe(() => { this.showStockAdjustModal = false; this.loadStock(); this.showToast('Stock ajusté avec succès'); });
  }

  getStockLevel(product: any): 'out' | 'low' | 'ok' {
    if (product.stock_qty <= 0) return 'out';
    if (product.is_low_stock) return 'low';
    return 'ok';
  }

  getMovementIcon(type: string) {
    if (type === 'PURCHASE_RECEIVED') return 'lucideArrowUpRight';
    if (type === 'SALE_DEDUCTED') return 'lucideArrowDownRight';
    return 'lucideRefreshCw';
  }

  getMovementColor(type: string) {
    if (type === 'PURCHASE_RECEIVED') return 'positive';
    if (type === 'SALE_DEDUCTED') return 'negative';
    return 'neutral';
  }

  // --- FINANCES ---
  loadFinances() {
    this.http.get(`${this.apiUrl}/supplier/erp/dashboard`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (res: any) => { this.erpDashboard = res; this.isLoading = false; this.cdr.detectChanges(); setTimeout(() => this.renderCharts(), 150); },
        error: () => { this.isLoading = false; this.cdr.detectChanges(); }
      });
  }

  renderCharts() {
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.splitChart) this.splitChart.destroy();
    if (!this.erpDashboard?.trend) return;

    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    const ctxRev = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (ctxRev) {
      this.revenueChart = new Chart(ctxRev, {
        type: 'line',
        data: {
          labels: this.erpDashboard.trend.map((t: any) => t.month),
          datasets: [{
            label: 'Chiffre d\'affaires (TND)',
            data: this.erpDashboard.trend.map((t: any) => t.revenue),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.08)',
            fill: true, tension: 0.45, pointBackgroundColor: '#22c55e',
            pointRadius: 5, pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { color: labelColor } }
          }
        }
      });
    }

    const ctxSplit = document.getElementById('splitChart') as HTMLCanvasElement;
    if (ctxSplit && this.erpDashboard.split_this_month) {
      this.splitChart = new Chart(ctxSplit, {
        type: 'doughnut',
        data: {
          labels: ['Commandes ZirIA', 'Factures Manuelles'],
          datasets: [{
            data: [this.erpDashboard.split_this_month.platform || 0, this.erpDashboard.split_this_month.manual || 0],
            backgroundColor: ['#22c55e', '#f59e0b'],
            borderWidth: 0, hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { color: labelColor, padding: 16 } } }
        }
      });
    }
  }

  getStatusConfig(status: string): { label: string; cls: string; icon: string } {
    const m: Record<string, { label: string; cls: string; icon: string }> = {
      DRAFT:            { label: 'Brouillon',  cls: 'slate',  icon: 'lucideArchive' },
      SENT:             { label: 'Envoyée',    cls: 'blue',   icon: 'lucideSend' },
      PAID:             { label: 'Payée',      cls: 'green',  icon: 'lucideCircleCheck' },
      PARTIAL:          { label: 'Partielle',  cls: 'amber',  icon: 'lucideClock' },
      CANCELLED:        { label: 'Annulée',    cls: 'red',    icon: 'lucideX' },
      ORDERED:          { label: 'Commandé',   cls: 'blue',   icon: 'lucideClipboardList' },
      RECEIVED:         { label: 'Reçu',       cls: 'green',  icon: 'lucideCircleCheck' },
      PARTIAL_RECEIVED: { label: 'Partiel',    cls: 'amber',  icon: 'lucidePackage' },
    };
    return m[status] || { label: status, cls: 'slate', icon: 'lucideCircleAlert' };
  }

  getStatusBadgeColor(status: string) { return this.getStatusConfig(status).cls; }
  getStatusLabel(status: string) { return this.getStatusConfig(status).label; }
  getStatusIcon(status: string) { return this.getStatusConfig(status).icon; }
}
