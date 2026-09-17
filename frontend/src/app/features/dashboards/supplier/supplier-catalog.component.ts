import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucidePackage, lucidePencil, lucideTrash2, lucideLoader,
  lucideCheckCircle, lucideXCircle, lucideTag, lucideImage, lucideSearch,
  lucideAlertTriangle, lucideToggleLeft, lucideToggleRight, lucideShield
} from '@ng-icons/lucide';
import { SupplierApiService, SupplierProduct, CreateProductDto } from '../../../core/services/supplier-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

type CatalogFilter = 'ALL' | 'FERTILIZER' | 'SEED' | 'TOOL' | 'PESTICIDE' | 'FUNGICIDE' | 'HERBICIDE' | 'OTHER';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  FERTILIZER: { label: 'Engrais',       color: '#16a34a' },
  SEED:       { label: 'Semences',      color: '#0ea5e9' },
  TOOL:       { label: 'Matériel',      color: '#8b5cf6' },
  PESTICIDE:  { label: 'Insecticide',   color: '#f59e0b' },
  FUNGICIDE:  { label: 'Fongicide',     color: '#06b6d4' },
  HERBICIDE:  { label: 'Herbicide',     color: '#ef4444' },
  OTHER:      { label: 'Autre',         color: '#64748b' },
};

@Component({
  selector: 'app-supplier-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucidePlus, lucidePackage, lucidePencil, lucideTrash2, lucideLoader,
    lucideCheckCircle, lucideXCircle, lucideTag, lucideImage, lucideSearch,
    lucideAlertTriangle, lucideToggleLeft, lucideToggleRight, lucideShield
  })],
  templateUrl: './supplier-catalog.component.html',
  styleUrl: './supplier-catalog.component.scss'
})
export class SupplierCatalogComponent implements OnInit {
  private readonly api = inject(SupplierApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);

  products = signal<SupplierProduct[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);

  // Modal state
  showModal = false;
  isEditMode = false;
  editingId: string | null = null;

  // Filter
  searchQuery = '';
  activeFilter: CatalogFilter = 'ALL';

  readonly categories: CatalogFilter[] = ['ALL', 'FERTILIZER', 'SEED', 'TOOL', 'PESTICIDE', 'FUNGICIDE', 'HERBICIDE', 'OTHER'];
  readonly categoryMeta = CATEGORY_META;
  readonly units = ['kg', 'litre', 'sac 50kg', 'sachet 10g', 'unité', 'rouleau 100m', 'lot 100 pcs', 'journée', 'tonne'];
  readonly governorates = ['Tunis','Sfax','Sousse','Kasserine','Kairouan','Gafsa','Sidi Bouzid','Béja','Jendouba','Nabeul','Bizerte'];

  form: CreateProductDto & { id?: string } = this.emptyForm();

  private emptyForm() {
    return {
      name: '', category: 'FERTILIZER', description: '', price_tnd: 0,
      unit: 'kg', stock_qty: 0, min_stock_alert_qty: 5,
      governorate_target: '', photo_url: ''
    };
  }

  get filtered(): SupplierProduct[] {
    let list = this.products();
    if (this.activeFilter !== 'ALL') list = list.filter(p => p.category === this.activeFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.api.getMyProducts().subscribe({
      next: (p) => { this.products.set(p); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.isEditMode = false;
    this.editingId = null;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEdit(p: SupplierProduct): void {
    this.form = {
      name: p.name, category: p.category, description: p.description ?? '',
      price_tnd: p.price_tnd, unit: p.unit, stock_qty: p.stock_qty,
      min_stock_alert_qty: p.min_stock_alert_qty,
      governorate_target: p.governorate_target ?? '', photo_url: p.photo_url ?? ''
    };
    this.isEditMode = true;
    this.editingId = p.id;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  closeModal(): void { this.showModal = false; this.cdr.markForCheck(); }

  submit(): void {
    if (!this.form.name || this.form.price_tnd <= 0) return;
    this.isSubmitting.set(true);
    const dto = { ...this.form };

    const req = this.isEditMode && this.editingId
      ? this.api.updateProduct(this.editingId, dto)
      : this.api.createProduct(dto);

    req.subscribe({
      next: (saved) => {
        if (this.isEditMode) {
          this.products.update(list => list.map(p => p.id === saved.id ? saved : p));
          this.notifs.showSuccess('Produit mis à jour.');
        } else {
          this.products.update(list => [saved, ...list]);
          this.notifs.showSuccess('Produit ajouté au catalogue.');
        }
        this.showModal = false;
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      },
      error: (err: { error?: { message?: string } }) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de l\'enregistrement.');
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  toggle(p: SupplierProduct): void {
    this.api.toggleProduct(p.id).subscribe({
      next: (res) => {
        this.products.update(list => list.map(x => x.id === p.id ? { ...x, is_active: res.is_active } : x));
        this.cdr.markForCheck();
      }
    });
  }

  remove(p: SupplierProduct): void {
    if (!confirm(`Supprimer "${p.name}" définitivement ?`)) return;
    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.products.update(list => list.filter(x => x.id !== p.id));
        this.notifs.showSuccess('Produit supprimé.');
        this.cdr.markForCheck();
      },
      error: (err: { error?: { message?: string } }) => {
        this.notifs.showError(err?.error?.message || 'Impossible de supprimer.');
      }
    });
  }

  catLabel(cat: string): string { return CATEGORY_META[cat]?.label ?? cat; }
  catColor(cat: string): string { return CATEGORY_META[cat]?.color ?? '#64748b'; }

  stockPercent(p: SupplierProduct): number {
    if (!p.min_stock_alert_qty) return 100;
    return Math.min(100, (p.stock_qty / (p.min_stock_alert_qty * 5)) * 100);
  }
}
