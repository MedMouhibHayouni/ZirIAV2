import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShoppingCart, lucideSearch, lucideFilter, lucidePackage,
  lucideTruck, lucideInfo, lucideCheckCircle, lucideLoader, lucideMapPin,
  lucideChevronRight, lucideStar, lucideTrendingUp, lucideDollarSign,
  lucideSprout, lucideShield, lucideShoppingBag, lucideCircleDot, lucideClock,
  lucideX, lucideRefreshCcw, lucideGlobe
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SupplierApiService, SupplierProduct } from '../../../core/services/supplier-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { environment } from '../../../../environments/environment';

interface MyOrder {
  id: string;
  quantity_ordered: number;
  unit_price_tnd: number;
  total_tnd: number;
  status: string;
  ordered_at: string;
  product_name: string;
  unit: string;
  category: string;
  photo_url: string | null;
  supplier_name: string;
  supplier_phone: string | null;
  supplier_governorate: string | null;
  supplier_id: string;
}

type SuppliesTab = 'boutique' | 'commandes';

@Component({
  selector: 'app-farmer-supplies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterLink],
  providers: [provideIcons({
    lucideShoppingCart, lucideSearch, lucideFilter, lucidePackage,
    lucideTruck, lucideInfo, lucideCheckCircle, lucideLoader, lucideMapPin,
    lucideChevronRight, lucideStar, lucideTrendingUp, lucideDollarSign,
    lucideSprout, lucideShield, lucideShoppingBag, lucideCircleDot, lucideClock,
    lucideX, lucideRefreshCcw, lucideGlobe
  })],
  templateUrl: './farmer-supplies.component.html',
  styleUrl: './farmer-supplies.component.scss'
})
export class FarmerSuppliesComponent implements OnInit {
  private readonly supplierApi = inject(SupplierApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);

  activeTab = signal<SuppliesTab>('boutique');

  // ── Boutique ─────────────────────────────────────────────────────────────
  products = signal<SupplierProduct[]>([]);
  isLoading = signal(true);
  isOrdering = signal(false);

  searchQuery = signal('');
  selectedCategory = signal<string>('ALL');
  selectedSupplierId = signal<string>('ALL');

  readonly categories = [
    { id: 'ALL',        label: 'Tous',              icon: 'lucidePackage'    },
    { id: 'FERTILIZER', label: 'Engrais',            icon: 'lucideTrendingUp' },
    { id: 'SEED',       label: 'Semences',           icon: 'lucideSprout'     },
    { id: 'TOOL',       label: 'Matériel & Équip.', icon: 'lucideTruck'      },
    { id: 'PESTICIDE',  label: 'Protec. Cultures',  icon: 'lucideShield'     },
  ];

  suppliersList = computed(() => {
    const list = this.products();
    const unique: Record<string, { id: string; name: string }> = {};
    for (const p of list) {
      const sid = p.supplier_id;
      const sname = p.supplier_business_name || p.supplier_name || 'Fournisseur';
      if (sid) {
        unique[sid] = { id: sid, name: sname };
      }
    }
    return Object.values(unique);
  });

  filteredProducts = computed(() => {
    let list = this.products();
    const query = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    const supId = this.selectedSupplierId();

    if (cat !== 'ALL') {
      list = list.filter((p: SupplierProduct) => p.category === cat);
    }
    if (supId !== 'ALL') {
      list = list.filter((p: SupplierProduct) => p.supplier_id === supId);
    }
    if (query) {
      list = list.filter((p: SupplierProduct) =>
        p.name.toLowerCase().includes(query) ||
        (p.description?.toLowerCase().includes(query) ?? false) ||
        (p.supplier_name?.toLowerCase().includes(query) ?? false) ||
        (p.supplier_business_name?.toLowerCase().includes(query) ?? false)
      );
    }
    return list;
  });

  // ── Mes Commandes (Sprint 8) ──────────────────────────────────────────────
  myOrders = signal<MyOrder[]>([]);
  isLoadingOrders = signal(false);

  pendingOrderCount = computed(() =>
    this.myOrders().filter(o => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)).length
  );

  ngOnInit(): void {
    this.loadProducts();
    this.loadMyOrders();
  }

  switchTab(tab: SuppliesTab) {
    this.activeTab.set(tab);
    this.cdr.markForCheck();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.supplierApi.searchProducts(35.1676, 8.8365, 100).subscribe({
      next: (data: SupplierProduct[]) => {
        this.products.set(data || []);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading.set(false);
        this.notifs.showError('Erreur lors du chargement de la boutique.');
        this.cdr.markForCheck();
      }
    });
  }

  loadMyOrders(): void {
    this.isLoadingOrders.set(true);
    this.http.get<MyOrder[]>(`${environment.apiUrl}/supplier/orders/my-purchases`).subscribe({
      next: (data) => {
        this.myOrders.set(data || []);
        this.isLoadingOrders.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingOrders.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Cart & Drawer ────────────────────────────────────────────────────────
  cart = signal<Record<string, { product: SupplierProduct; quantity: number }>>({});
  isCartOpen = signal(false);

  cartItems = computed(() => Object.values(this.cart()));
  cartCount = computed(() => this.cartItems().length);
  cartTotal = computed(() => this.cartItems().reduce((sum, item) => sum + (item.product.price_tnd * item.quantity), 0));

  cartGroupedBySupplier = computed(() => {
    const items = Object.values(this.cart());
    const grouped: Record<string, { 
      supplierId: string; 
      supplierName: string; 
      supplierPhoto: string | null; 
      items: Array<{ product: SupplierProduct; quantity: number }> 
    }> = {};

    for (const item of items) {
      const sid = item.product.supplier_id || 'unknown';
      const sname = item.product.supplier_business_name || item.product.supplier_name || 'Fournisseur';
      const sphoto = item.product.supplier_photo_url || null;

      if (!grouped[sid]) {
        grouped[sid] = {
          supplierId: sid,
          supplierName: sname,
          supplierPhoto: sphoto,
          items: []
        };
      }
      grouped[sid].items.push(item);
    }
    return Object.values(grouped);
  });

  getCartQuantity(productId: string): number {
    return this.cart()[productId]?.quantity || 0;
  }

  updateQuantity(product: SupplierProduct, delta: number) {
    const current = this.cart();
    const qty = (current[product.id]?.quantity || 0) + delta;

    if (qty <= 0) {
      const { [product.id]: _, ...rest } = current;
      this.cart.set(rest);
    } else {
      this.cart.set({
        ...current,
        [product.id]: { product, quantity: qty }
      });
    }
  }

  toggleCart() {
    this.isCartOpen.set(!this.isCartOpen());
  }

  checkoutBulk() {
    const items = this.cartItems().map(c => ({ product_id: c.product.id, quantity: c.quantity }));
    if (items.length === 0) return;

    this.isOrdering.set(true);
    this.supplierApi.createBulkOrder({
      items,
      notes: 'Commande groupée depuis le dashboard agriculteur.'
    }).subscribe({
      next: (res) => {
        this.notifs.showSuccess(`Commande groupée réussie (Batch: ${res.batchId})`);
        this.cart.set({});
        this.isCartOpen.set(false);
        this.isOrdering.set(false);
        this.loadMyOrders();
        this.switchTab('commandes');
      },
      error: (err: { error?: { message?: string } }) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de la commande groupée.');
        this.isOrdering.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  getCategoryIcon(cat: string): string {
    const found = this.categories.find(c => c.id === cat);
    return found ? found.icon : 'lucidePackage';
  }

  // Sprint 8: Status timeline helpers
  getOrderStatusDotClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'dot-amber', CONFIRMED: 'dot-blue', PREPARING: 'dot-purple',
      SHIPPED: 'dot-sky', DELIVERED: 'dot-green', CANCELLED: 'dot-red'
    };
    return map[status] || 'dot-amber';
  }

  getOrderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'En préparation',
      SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée'
    };
    return map[status] || status;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
  }

  formatNumber(n: number | string): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n));
  }
}
