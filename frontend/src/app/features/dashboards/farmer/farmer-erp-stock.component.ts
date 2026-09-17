import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucidePackage, lucidePlus, lucideMinus, lucideSearch,
  lucideAlertTriangle, lucideLeaf, lucideWheat, lucideX
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucidePackage, lucidePlus, lucideMinus, lucideSearch,
    lucideAlertTriangle, lucideLeaf, lucideWheat, lucideX
  })],
  template: `
    <div class="stock-page">
      <!-- Header row -->
      <div class="stock-header">
        <div class="search-box">
          <ng-icon name="lucideSearch" class="s-icon"></ng-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher un produit..." class="s-input" />
        </div>
        <div class="header-actions">
          <button class="btn btn-in" (click)="openModal('IN')"><ng-icon name="lucidePlus"></ng-icon> Entrée</button>
          <button class="btn btn-out" (click)="openModal('OUT')"><ng-icon name="lucideMinus"></ng-icon> Sortie</button>
        </div>
      </div>

      <!-- Alerts -->
      @if (alerts().length > 0) {
        <div class="alert-banner">
          <ng-icon name="lucideAlertTriangle"></ng-icon>
          <span>{{ alerts().length }} produit(s) en stock faible</span>
        </div>
      }

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div><span>Chargement...</span></div>
      } @else if (filteredItems().length === 0) {
        <div class="empty-state">
          <ng-icon name="lucidePackage" class="empty-icon"></ng-icon>
          <h3>Aucun stock</h3>
          <p>Ajoutez votre première entrée de stock</p>
        </div>
      } @else {
        <div class="stock-grid">
          @for (item of filteredItems(); track item.id) {
            <div class="stock-card" [class.low-stock]="item.quantity_tonnes < 0.5">
              <div class="stock-color-bar" [style.background]="getColor(item.crop_type)"></div>
              <div class="stock-body">
                <div class="stock-top">
                  <span class="stock-crop">{{ item.crop_type }}</span>
                  <span class="stock-qty">{{ formatNum(item.quantity_tonnes) }} <small>t</small></span>
                </div>
                <div class="stock-bar-wrap">
                  <div class="stock-bar" [style.width.%]="Math.min(item.quantity_tonnes * 20, 100)" [style.background]="getColor(item.crop_type)"></div>
                </div>
                <div class="stock-bottom">
                  <span class="stock-date">MAJ {{ formatDate(item.updated_at) }}</span>
                  <div class="stock-actions">
                    <button class="btn-icon in" title="Entrée" (click)="openModal('IN', item)"><ng-icon name="lucidePlus"></ng-icon></button>
                    <button class="btn-icon out" title="Sortie" (click)="openModal('OUT', item)"><ng-icon name="lucideMinus"></ng-icon></button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Quick movement history -->
      @if (movements().length > 0) {
        <div class="movements-section">
          <h3>Derniers mouvements</h3>
          <div class="movements-list">
            @for (m of movements(); track m.id) {
              <div class="movement-item" [class.in]="m.type === 'IN'" [class.out]="m.type === 'OUT'">
                <div class="mov-dot"></div>
                <div class="mov-info">
                  <span class="mov-type">{{ m.type === 'IN' ? 'Entrée' : 'Sortie' }}</span>
                  <span class="mov-crop">{{ m.crop_type }}</span>
                  <span class="mov-reason">{{ m.reason }}</span>
                </div>
                <span class="mov-qty">{{ formatNum(m.quantity) }} t</span>
                <span class="mov-date">{{ formatDate(m.created_at) }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Modal -->
    @if (showModal) {
      <div class="modal-backdrop" (click)="showModal = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showModal = false"><ng-icon name="lucideX"></ng-icon></button>
          <h3>{{ modalType === 'IN' ? 'Entrée de stock' : 'Sortie de stock' }}</h3>
          <div class="modal-body">
            <label>Produit</label>
            <select [(ngModel)]="form.crop_type" class="form-select">
              <option value="">Sélectionner...</option>
              @for (c of CROP_TYPES; track c) { <option [value]="c">{{ c }}</option> }
            </select>
            <label>Quantité (tonnes)</label>
            <input type="number" [(ngModel)]="form.quantity" class="form-input" min="0" step="0.1" />
            <label>Motif</label>
            <select [(ngModel)]="form.reason" class="form-select">
              @for (r of modalType === 'IN' ? REASONS_IN : REASONS_OUT; track r) { <option [value]="r">{{ r }}</option> }
            </select>
            <button class="btn btn-primary" (click)="submit()" [disabled]="!form.crop_type || form.quantity <= 0 || submitting()">
              {{ submitting() ? 'Enregistrement...' : 'Valider' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .stock-page { padding: 20px; max-width: 900px; margin: 0 auto; }

    .stock-header { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .search-box { position: relative; flex: 1; min-width: 180px; }
    .s-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-muted); }
    .s-input {
      width: 100%; padding: 10px 12px 10px 36px;
      border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--bg-primary); color: var(--text-primary);
      font-size: 0.85rem; outline: none; font-family: inherit;
    }
    .s-input:focus { border-color: var(--zir-emerald); }

    .header-actions { display: flex; gap: 8px; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border: none; border-radius: 10px;
      font-weight: 700; font-size: 0.82rem; cursor: pointer;
      transition: all 0.15s; font-family: inherit; white-space: nowrap;
    }
    .btn-in { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .btn-in:hover { background: var(--zir-emerald); color: white; }
    .btn-out { background: rgba(239,68,68,0.1); color: #ef4444; }
    .btn-out:hover { background: #ef4444; color: white; }
    .btn-primary { width: 100%; justify-content: center; background: var(--zir-emerald); color: white; margin-top: 8px; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s; background: transparent;
    }
    .btn-icon.in:hover { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .btn-icon.out:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
    .btn-icon ng-icon { width: 16px; height: 16px; }

    .alert-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; background: rgba(245,158,11,0.1); color: #f59e0b;
      border-radius: 10px; font-size: 0.85rem; font-weight: 600; margin-bottom: 16px;
    }
    .alert-banner ng-icon { width: 18px; height: 18px; flex-shrink: 0; }

    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: var(--text-muted); gap: 12px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .empty-state p { margin: 0; font-size: 0.85rem; }

    .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stock-card {
      display: flex; background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden; transition: all 0.15s;
    }
    .stock-card:hover { border-color: var(--zir-emerald-alpha-20); }
    .stock-card.low-stock { border-color: rgba(245,158,11,0.3); }
    .stock-color-bar { width: 5px; flex-shrink: 0; }
    .stock-body { flex: 1; padding: 14px; }
    .stock-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .stock-crop { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); }
    .stock-qty { font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }
    .stock-qty small { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); }
    .stock-bar-wrap { height: 4px; background: var(--zir-emerald-alpha-10); border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
    .stock-bar { height: 100%; border-radius: 4px; transition: width 0.5s; }
    .stock-bottom { display: flex; justify-content: space-between; align-items: center; }
    .stock-date { font-size: 0.72rem; color: var(--text-muted); }
    .stock-actions { display: flex; gap: 4px; }

    .movements-section { margin-top: 8px; }
    .movements-section h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; }
    .movements-list { display: flex; flex-direction: column; gap: 6px; }
    .movement-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: 10px;
      font-size: 0.82rem;
    }
    .mov-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .movement-item.in .mov-dot { background: var(--zir-emerald); }
    .movement-item.out .mov-dot { background: #ef4444; }
    .mov-info { flex: 1; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .mov-type { font-weight: 700; }
    .movement-item.in .mov-type { color: var(--zir-emerald); }
    .movement-item.out .mov-type { color: #ef4444; }
    .mov-crop { color: var(--text-primary); }
    .mov-reason { color: var(--text-muted); font-size: 0.78rem; }
    .mov-qty { font-weight: 700; color: var(--text-primary); white-space: nowrap; }
    .mov-date { color: var(--text-muted); font-size: 0.75rem; white-space: nowrap; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .modal {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 24px; width: 380px; max-width: 90vw;
      position: relative;
    }
    .modal-close {
      position: absolute; top: 12px; right: 12px;
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; padding: 4px;
    }
    .modal-close ng-icon { width: 20px; height: 20px; }
    .modal h3 { margin: 0 0 16px; font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .modal-body { display: flex; flex-direction: column; gap: 10px; }
    .modal-body label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .form-select, .form-input {
      padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--bg-primary); color: var(--text-primary);
      font-size: 0.88rem; font-family: inherit; outline: none;
    }
    .form-select:focus, .form-input:focus { border-color: var(--zir-emerald); }
  `]
})
export class FarmerErpStockComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  readonly loading = signal(true);
  readonly items = signal<any[]>([]);
  readonly movements = signal<any[]>([]);
  readonly searchQuery = signal('');

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q ? this.items().filter(i => i.crop_type.toLowerCase().includes(q)) : this.items();
  });
  readonly alerts = computed(() => this.items().filter(i => i.quantity_tonnes < 0.5));
  readonly Math = Math;

  readonly CROP_TYPES = ['tomate', 'piment', 'oignon', 'pomme de terre', 'blé', 'orge', 'olive', 'melon', 'autre'];
  readonly REASONS_IN = ['Récolte', 'Achat', 'Transfert', 'Retour'];
  readonly REASONS_OUT = ['Vente', 'Consommation propre', 'Perte', 'Transport', 'Transfert'];

  showModal = false;
  modalType: 'IN' | 'OUT' = 'IN';
  form = { crop_type: '', quantity: 0, reason: 'Récolte' };
  readonly submitting = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/inventory/my`).subscribe({
      next: (d) => { this.items.set(d || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.http.get<any[]>(`${environment.apiUrl}/inventory/movements?limit=15`).subscribe({
      next: (d) => this.movements.set(d || [])
    });
  }

  openModal(type: 'IN' | 'OUT', item?: any) {
    this.modalType = type;
    this.form = { crop_type: item?.crop_type || '', quantity: 0, reason: type === 'IN' ? 'Récolte' : 'Vente' };
    this.showModal = true;
  }

  submit() {
    if (!this.form.crop_type || this.form.quantity <= 0) return;
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/inventory/movement`, {
      crop_type: this.form.crop_type,
      quantity: Number(this.form.quantity),
      type: this.modalType,
      reason: this.form.reason,
    }).subscribe({
      next: () => {
        this.toast.success('Stock', `${this.modalType === 'IN' ? 'Entrée' : 'Sortie'} enregistrée`);
        this.showModal = false;
        this.submitting.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Erreur lors de l\'opération');
        this.submitting.set(false);
      }
    });
  }

  getColor(type: string): string {
    const m: Record<string, string> = {
      tomate: '#e63946', piment: '#f4a261', oignon: '#e9c46a',
      'pomme de terre': '#a7c957', blé: '#f3d5a0', orge: '#d4a373',
      olive: '#6d9b3a', melon: '#ffbe0b'
    };
    return m[type?.toLowerCase()] || '#6b7280';
  }

  private nf = new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 1 });
  private df = new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' });
  formatNum(n: number): string { return this.nf.format(n || 0); }
  formatDate(d: string): string { return d ? this.df.format(new Date(d)) : '—'; }
}
