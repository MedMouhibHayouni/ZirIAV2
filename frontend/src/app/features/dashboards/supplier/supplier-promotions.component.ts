import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePlus, lucideTag, lucideLoader, lucideCheckCircle, lucideXCircle,
  lucideCalendar, lucidePercent, lucideMapPin, lucideTrash2, lucideTrendingUp,
  lucideGlobe, lucideAlertCircle
} from '@ng-icons/lucide';
import { SupplierApiService, SupplierProduct } from '../../../core/services/supplier-api.service';
import { NotificationStore } from '../../../core/state/notification.store';

@Component({
  selector: 'app-supplier-promotions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucidePlus, lucideTag, lucideLoader, lucideCheckCircle, lucideXCircle,
    lucideCalendar, lucidePercent, lucideMapPin, lucideTrash2, lucideTrendingUp,
    lucideGlobe, lucideAlertCircle
  })],
  templateUrl: './supplier-promotions.component.html',
  styleUrl: './supplier-promotions.component.scss'
})
export class SupplierPromotionsComponent implements OnInit {
  private readonly api = inject(SupplierApiService);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);

  promotions = signal<any[]>([]);
  products = signal<SupplierProduct[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  showModal = false;

  readonly governorates = ['Tunis','Sfax','Sousse','Kasserine','Kairouan','Gafsa','Sidi Bouzid','Béja','Jendouba','Nabeul','Bizerte'];

  // Premium computed stats
  activePromotionsCount = computed(() => this.promotions().filter(p => p.is_active).length);
  maxDiscount = computed(() => {
    const activePromos = this.promotions().filter(p => p.is_active);
    return activePromos.length ? Math.max(...activePromos.map(p => Number(p.discount_pct))) : 0;
  });
  uniqueRegions = computed(() => {
    const activePromos = this.promotions().filter(p => p.is_active);
    const set = new Set(activePromos.map(p => p.governorate_target || 'Tunisie (Tout le pays)'));
    return set.size;
  });

  form = {
    product_id: '',
    discount_pct: 10,
    governorate_target: '',
    valid_from: '',
    valid_until: '',
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.cdr.markForCheck();
    this.api.getPromotions().subscribe({
      next: (p) => { this.promotions.set(p); this.isLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.isLoading.set(false); this.cdr.markForCheck(); }
    });
    this.api.getMyProducts().subscribe({
      next: (p) => { this.products.set(p); this.cdr.markForCheck(); }
    });
  }

  openModal(): void {
    const today = new Date().toISOString().split('T')[0];
    const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    this.form = { product_id: '', discount_pct: 10, governorate_target: '', valid_from: today, valid_until: plus30 };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  closeModal(): void { this.showModal = false; this.cdr.markForCheck(); }

  submit(): void {
    if (!this.form.product_id || !this.form.valid_from || !this.form.valid_until) return;
    this.isSubmitting.set(true);
    this.api.createPromotion(this.form).subscribe({
      next: (promo) => {
        this.promotions.update(list => [promo, ...list]);
        this.notifs.showSuccess('Promotion lancée avec succès !');
        this.showModal = false;
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      },
      error: (err: { error?: { message?: string } }) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de la création.');
        this.isSubmitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  deletePromo(id: string): void {
    if (confirm('Voulez-vous vraiment annuler/supprimer cette offre promotionnelle ?')) {
      this.api.deletePromotion(id).subscribe({
        next: () => {
          this.promotions.update(list => list.filter(p => p.id !== id));
          this.notifs.showSuccess('Promotion supprimée avec succès.');
          this.cdr.markForCheck();
        },
        error: (err: { error?: { message?: string } }) => {
          this.notifs.showError(err?.error?.message || 'Erreur lors de la suppression.');
        }
      });
    }
  }

  productName(id: string): string {
    return this.products().find(p => p.id === id)?.name ?? id;
  }

  getProductById(id: string): SupplierProduct | undefined {
    return this.products().find(p => p.id === id);
  }
}
