import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import {
  lucideUsers,
  lucideSearch,
  lucideFileText,
  lucideDownload,
  lucideBan,
  lucidePhone,
  lucideMapPin,
  lucideX,
  lucideCheck,
  lucideFilter,
} from '@ng-icons/lucide';
import { NgIconComponent, provideIcons } from '@ng-icons/core';

interface LinkedFarmer {
  id: string;
  name: string;
  phone: string;
  governorate: string;
  dossiersCount: number;
  lastActive: string;
  consentActive: boolean;
}

@Component({
  selector: 'app-apia-porteurs',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideUsers, lucideSearch, lucideFileText, lucideDownload,
    lucideBan, lucidePhone, lucideMapPin, lucideX, lucideCheck, lucideFilter,
  })],
  styleUrl: './apia-porteurs.component.scss',
  template: `
    <div class="inst-page">
      <div class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--emerald">
            <ng-icon name="lucideUsers" size="20"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Porteurs de Projets Partenaires</h1>
            <p class="inst-header__sub">
              Agriculteurs titulaires d'un dossier actif ou consentement formel
            </p>
          </div>
        </div>

        <div class="inst-header__actions">
          <button
            class="inst-btn inst-btn--ghost"
            (click)="exportCsv()"
            [disabled]="farmers().length === 0"
          >
            <ng-icon name="lucideDownload" size="15"></ng-icon>
            Exporter CSV
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="sk sk__toolbar"></div>
        <div class="card-grid">
          @for (i of skeletonCards; track i) {
            <div class="inst-card sk sk__card"></div>
          }
        </div>
      } @else if (filteredFarmers().length === 0) {
        <div class="inst-card empty-state">
          <ng-icon name="lucideUsers" size="48" style="color: var(--text-muted); opacity: 0.3"></ng-icon>
          <p class="empty-state__title">Aucun porteur trouvé</p>
          <p class="empty-state__sub">
            Les porteurs apparaîtront dès qu'un dossier d'investissement sera soumis ou accepté.
          </p>
        </div>
      } @else {
        <div class="toolbar">
          <div class="search">
            <ng-icon name="lucideSearch" size="15" class="search__icon"></ng-icon>
            <input
              class="search__input"
              type="text"
              placeholder="Rechercher par nom, téléphone ou gouvernorat…"
              [value]="searchQuery()"
              (input)="onSearch($event)"
            />
            @if (searchQuery()) {
              <button class="search__clear" (click)="clearSearch()">
                <ng-icon name="lucideX" size="14"></ng-icon>
              </button>
            }
          </div>
          <div class="chips">
            @for (g of governorates(); track g) {
              <button
                class="inst-chip"
                [class.inst-chip--active]="selectedGovernorate() === g"
                (click)="toggleGovernorate(g)"
              >
                {{ g }}
              </button>
            }
          </div>
        </div>

        <div class="card-grid">
          @for (f of filteredFarmers(); track f.id) {
            <div class="inst-card porteur-card">
              <div class="porteur-card__head">
                <div class="porteur-card__avatar">
                  {{ f.name.charAt(0) }}
                </div>
                <span class="status-pill" [class.status-pill--emerald]="f.consentActive" [class.status-pill--red]="!f.consentActive">
                  <span class="status-pill__dot"></span>
                  {{ f.consentActive ? 'Consentement actif' : 'Consentement révoqué' }}
                </span>
              </div>

              <h3 class="porteur-card__name">{{ f.name }}</h3>
              <div class="porteur-card__meta">
                <span class="porteur-card__detail">
                  <ng-icon name="lucidePhone" size="13"></ng-icon>
                  {{ f.phone }}
                </span>
                <span class="porteur-card__detail">
                  <ng-icon name="lucideMapPin" size="13"></ng-icon>
                  {{ f.governorate }}
                </span>
              </div>

              <div class="porteur-card__stats">
                <span class="status-pill status-pill--blue">
                  <ng-icon name="lucideFileText" size="10"></ng-icon>
                  {{ f.dossiersCount }} dossier(s)
                </span>
                <span class="porteur-card__last-active">
                  {{ formatDate(f.lastActive) }}
                </span>
              </div>

              <div class="porteur-card__actions">
                <button class="inst-btn inst-btn--ghost" (click)="viewDossiers(f)">
                  <ng-icon name="lucideFileText" size="14"></ng-icon>
                  Dossiers
                </button>
                @if (f.consentActive) {
                  <button class="inst-btn inst-btn--danger" (click)="openRevokeModal(f)">
                    <ng-icon name="lucideBan" size="14"></ng-icon>
                    Révoquer
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showRevokeModal()) {
        <div class="inst-modal-backdrop" (click)="closeRevokeModal()">
          <div class="inst-card modal" (click)="$event.stopPropagation()">
            <div class="modal__head">
              <h2 class="modal__title">
                <ng-icon name="lucideBan" size="18"></ng-icon>
                Révoquer le consentement
              </h2>
              <button class="inst-btn inst-btn--ghost" (click)="closeRevokeModal()">
                <ng-icon name="lucideX" size="16"></ng-icon>
              </button>
            </div>
            <div class="modal__body">
              @if (revoking()) {
                <div class="sk sk__block"></div>
              } @else {
                <p class="modal__text">
                  Vous êtes sur le point de révoquer le consentement de
                  <strong>{{ farmerToRevoke()?.name }}</strong>.
                  Cette action est irréversible.
                </p>
                <div class="form-field">
                  <label class="form-label">Motif de la révocation</label>
                  <textarea
                    class="form-textarea"
                    rows="3"
                    placeholder="Indiquez le motif…"
                    [value]="revokeReason()"
                    (input)="onReasonInput($event)"
                  ></textarea>
                </div>
              }
            </div>
            <div class="modal__footer">
              <button class="inst-btn inst-btn--ghost" (click)="closeRevokeModal()" [disabled]="revoking()">
                Annuler
              </button>
              <button
                class="inst-btn inst-btn--danger"
                (click)="confirmRevoke()"
                [disabled]="revoking() || !revokeReason()"
              >
                <ng-icon name="lucideCheck" size="14"></ng-icon>
                Confirmer la révocation
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ApiaPorteursComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  farmers = signal<LinkedFarmer[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedGovernorate = signal<string | null>(null);
  showRevokeModal = signal(false);
  farmerToRevoke = signal<LinkedFarmer | null>(null);
  revokeReason = signal('');
  revoking = signal(false);

  readonly skeletonCards = Array.from({ length: 6 });

  governorates = computed(() => {
    const set = new Set(this.farmers().map((f) => f.governorate));
    return Array.from(set).sort();
  });

  filteredFarmers = computed(() => {
    let list = this.farmers();
    const query = this.searchQuery().toLowerCase().trim();
    const gov = this.selectedGovernorate();
    if (gov) list = list.filter((f) => f.governorate === gov);
    if (query) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.phone.includes(query) ||
          f.governorate.toLowerCase().includes(query)
      );
    }
    return list;
  });

  private get headers() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  ngOnInit() {
    const instId = (this.authStore.currentUser() as any)?.institutionMember?.institutionId;
    if (!instId) {
      this.loading.set(false);
      return;
    }

    this.http
      .get<{ data: any[] }>(`${environment.apiUrl}/dossiers/institution/${instId}?limit=100`, {
        headers: this.headers,
      })
      .subscribe({
        next: (res) => {
          const map = new Map<string, LinkedFarmer>();
          for (const d of res.data) {
            if (!d.farmer) continue;
            const fid = d.farmer.id;
            if (map.has(fid)) {
              map.get(fid)!.dossiersCount++;
              if (d.updatedAt > map.get(fid)!.lastActive) map.get(fid)!.lastActive = d.updatedAt;
            } else {
              map.set(fid, {
                id: fid,
                name: d.farmer.name,
                phone: d.farmer.phone || 'Non renseigné',
                governorate: d.farmer.governorate || 'Région',
                dossiersCount: 1,
                lastActive: d.updatedAt,
                consentActive: d.farmer.consentActive ?? true,
              });
            }
          }
          this.farmers.set(Array.from(map.values()));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  toggleGovernorate(g: string) {
    this.selectedGovernorate.update((curr) => (curr === g ? null : g));
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  viewDossiers(farmer: LinkedFarmer) {
    console.log('Navigate to dossiers for farmer', farmer.id);
  }

  openRevokeModal(farmer: LinkedFarmer) {
    this.farmerToRevoke.set(farmer);
    this.revokeReason.set('');
    this.showRevokeModal.set(true);
  }

  closeRevokeModal() {
    this.showRevokeModal.set(false);
    this.farmerToRevoke.set(null);
    this.revokeReason.set('');
  }

  onReasonInput(event: Event) {
    this.revokeReason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmRevoke() {
    const farmer = this.farmerToRevoke();
    const reason = this.revokeReason();
    if (!farmer || !reason) return;

    this.revoking.set(true);
    this.http
      .post(
        `${environment.apiUrl}/privacy/consent/revoke`,
        { farmerId: farmer.id, reason },
        { headers: this.headers }
      )
      .subscribe({
        next: () => {
          this.farmers.update((list) =>
            list.map((f) => (f.id === farmer.id ? { ...f, consentActive: false } : f))
          );
          this.revoking.set(false);
          this.closeRevokeModal();
        },
        error: () => this.revoking.set(false),
      });
  }

  exportCsv() {
    const rows = this.filteredFarmers();
    if (!rows.length) return;

    const header = 'Nom,Téléphone,Gouvernorat,Dossiers,Dernière activité,Consentement';
    const csv = [
      header,
      ...rows.map(
        (f) =>
          `"${f.name}","${f.phone}","${f.governorate}",${f.dossiersCount},"${this.formatDate(f.lastActive)}","${f.consentActive ? 'Actif' : 'Révoqué'}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porteurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
