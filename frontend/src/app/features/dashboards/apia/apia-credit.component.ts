import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideCreditCard,
  lucideTrendingUp,
  lucideCheckCircle,
  lucideAlertTriangle,
  lucideClock,
  lucideBanknote,
  lucideFileText,
  lucideChevronRight,
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';

interface Dossier {
  id: string;
  referenceNumber: string;
  programName: string;
  requestedAmountTnd: number;
  approvedAmountTnd?: number;
  status: string;
  farmer?: { name: string; phone: string; governorate: string };
}

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountTnd: number;
  status: 'PENDING' | 'PAID_DECLARED' | 'PAID_CONFIRMED' | 'LATE' | 'RESCHEDULED';
  paymentProofUrl?: string;
  farmerDeclarationNote?: string;
}

interface CreditDetails {
  id: string;
  dossierId: string;
  financingInstitution: string;
  requestedAmountTnd: number;
  approvedAmountTnd?: number;
  status: string;
  interestRatePct: number;
  durationMonths: number;
  installments?: Installment[];
}

const STATUS_MAP: Record<string, { label: string; variant: string; color: string; bg: string }> = {
  PAID_CONFIRMED: { label: 'Confirmé', variant: 'emerald', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  PAID_DECLARED:  { label: 'Déclaré',  variant: 'amber',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  LATE:           { label: 'En retard', variant: 'red',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  PENDING:        { label: 'En attente', variant: 'blue',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  RESCHEDULED:    { label: 'Reporté',   variant: 'violet',  color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' },
};

@Component({
  selector: 'app-apia-credit',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({
    lucideCreditCard,
    lucideTrendingUp,
    lucideCheckCircle,
    lucideAlertTriangle,
    lucideClock,
    lucideBanknote,
    lucideFileText,
    lucideChevronRight,
  })],
  template: `
    <div class="inst-page">

      <!-- ── Header ─────────────────────────────────────────── -->
      <header class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon">
            <ng-icon name="lucideCreditCard"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Crédit & Financement Agricole</h1>
            <p class="inst-header__sub">Suivi des dossiers de financement bancaire et échéanciers de remboursement</p>
          </div>
        </div>
      </header>

      <!-- ── Pipeline KPI Cards ─────────────────────────────── -->
      <div class="inst-kpi-grid">
        <div class="inst-kpi">
          <div class="inst-kpi__row">
            <p class="inst-kpi__label">Total en cours</p>
            <div class="inst-kpi__icon-wrap">
              <ng-icon name="lucideBanknote"></ng-icon>
            </div>
          </div>
          @if (loadingDossiers()) {
            <div class="sk sk--h20 sk--w60"></div>
          } @else {
            <p class="inst-kpi__value">
              {{ totalRequested() | number:'1.3-3' }}
              <span class="inst-kpi__unit">TND</span>
            </p>
          }
        </div>

        <div class="inst-kpi">
          <div class="inst-kpi__row">
            <p class="inst-kpi__label">Financements validés</p>
            <div class="inst-kpi__icon-wrap inst-kpi__icon-wrap--emerald">
              <ng-icon name="lucideCheckCircle"></ng-icon>
            </div>
          </div>
          @if (loadingDossiers()) {
            <div class="sk sk--h20 sk--w40"></div>
          } @else {
            <p class="inst-kpi__value">{{ approvedCount() }} <span class="inst-kpi__unit">dossiers</span></p>
          }
        </div>

        <div class="inst-kpi">
          <div class="inst-kpi__row">
            <p class="inst-kpi__label">Paiements déclarés</p>
            <div class="inst-kpi__icon-wrap inst-kpi__icon-wrap--amber">
              <ng-icon name="lucideClock"></ng-icon>
            </div>
          </div>
          @if (loadingDossiers()) {
            <div class="sk sk--h20 sk--w40"></div>
          } @else {
            <p class="inst-kpi__value">{{ declaredPayments().length }} <span class="inst-kpi__unit">en attente</span></p>
          }
        </div>

        <div class="inst-kpi">
          <div class="inst-kpi__row">
            <p class="inst-kpi__label">Échéances en retard</p>
            <div class="inst-kpi__icon-wrap inst-kpi__icon-wrap--red">
              <ng-icon name="lucideAlertTriangle"></ng-icon>
            </div>
          </div>
          @if (loadingDossiers()) {
            <div class="sk sk--h20 sk--w40"></div>
          } @else {
            <p class="inst-kpi__value">{{ lateCount() }}</p>
          }
        </div>
      </div>

      <!-- ── Main Grid ──────────────────────────────────────── -->
      <div class="inst-grid--sidebar">

        <!-- Dossiers sidebar -->
        <div class="inst-card">
          <div class="inst-card__head">
            <h3 class="inst-card__title">
              <ng-icon name="lucideFileText"></ng-icon>
              Dossiers éligibles crédit
            </h3>
            <span class="inst-badge inst-badge--emerald">{{ dossiers().length }}</span>
          </div>
          <div class="inst-card__body">
            @if (loadingDossiers()) {
              @for (i of [1,2,3,4]; track i) {
                <div class="sk-row">
                  <div class="sk sk--h12 sk--w40"></div>
                  <div class="sk sk--h12 sk--w60"></div>
                  <div class="sk sk--h12 sk--w40"></div>
                </div>
              }
            } @else if (dossiers().length === 0) {
              <div class="inst-empty">
                <ng-icon name="lucideFileText"></ng-icon>
                <span>Aucun dossier éligible trouvé.</span>
              </div>
            } @else {
              @for (d of dossiers(); track d.id) {
                <div class="dossier-row"
                     [class.dossier-row--active]="selectedDossier()?.id === d.id"
                     (click)="selectDossier(d)">
                  <div class="dossier-row__top">
                    <span class="dossier-row__ref">{{ d.referenceNumber }}</span>
                    <span class="status-pill status-pill--emerald">
                      <span class="status-pill__dot"></span>
                      {{ d.status }}
                    </span>
                  </div>
                  <p class="dossier-row__name">{{ d.programName }}</p>
                  <div class="dossier-row__bottom">
                    <span class="dossier-row__amount">{{ d.requestedAmountTnd | number:'1.3-3' }} TND</span>
                    <ng-icon name="lucideChevronRight" class="dossier-row__arrow"></ng-icon>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Credit details -->
        <div class="inst-card">
          @if (!selectedDossier()) {
            <div class="inst-empty">
              <ng-icon name="lucideCreditCard"></ng-icon>
              <span>Sélectionnez un dossier pour consulter son plan de financement et échéancier.</span>
            </div>
          } @else {
            <div class="inst-card__head">
              <div>
                <h3 class="inst-card__title">
                  <ng-icon name="lucideCreditCard"></ng-icon>
                  {{ selectedDossier()!.programName }}
                </h3>
                <p class="inst-header__sub" style="margin-top:4px">Réf: {{ selectedDossier()!.referenceNumber }}</p>
              </div>
              <button class="inst-btn inst-btn--primary" (click)="openScheduleModal()">
                <ng-icon name="lucideFileText"></ng-icon>
                Générer Échéancier
              </button>
            </div>
            <div class="inst-card__body">
              @if (credit() && credit()!.installments && credit()!.installments!.length > 0) {
                <div class="inst-table-wrap">
                  <table class="inst-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Échéance</th>
                        <th>Montant (TND)</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (inst of credit()!.installments; track inst.id) {
                        <tr>
                          <td class="inst-table__mono">{{ inst.installmentNumber }}</td>
                          <td>{{ inst.dueDate | date:'dd/MM/yyyy' }}</td>
                          <td class="inst-table__name">{{ inst.amountTnd | number:'1.3-3' }}</td>
                          <td>
                            <span class="status-pill"
                                  [class]="statusPillClass(inst.status)">
                              <span class="status-pill__dot"></span>
                              {{ statusLabel(inst.status) }}
                            </span>
                          </td>
                          <td>
                            @if (inst.status === 'PAID_DECLARED') {
                              <button class="inst-btn inst-btn--primary inst-btn--sm" (click)="confirmPayment(inst.id)">
                                <ng-icon name="lucideCheckCircle"></ng-icon>
                                Confirmer Paiement
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="inst-empty">
                  <ng-icon name="lucideClock"></ng-icon>
                  <span>Aucun échéancier généré pour ce dossier. Cliquez sur « Générer Échéancier ».</span>
                </div>
              }
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .inst-kpi__row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .inst-kpi__icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--zir-emerald) 12%, transparent);
      color: var(--zir-emerald);
      flex-shrink: 0;
    }

    .inst-kpi__icon-wrap--emerald { background: rgba(34,197,94,0.12); color: #22c55e; }
    .inst-kpi__icon-wrap--amber   { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .inst-kpi__icon-wrap--red     { background: rgba(239,68,68,0.12);  color: #ef4444; }

    .inst-kpi__unit {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: 3px;
    }

    .dossier-row {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      cursor: pointer;
      transition: all 0.15s;
    }

    .dossier-row:hover {
      border-color: color-mix(in srgb, var(--zir-emerald) 30%, transparent);
      background: var(--bg-card-hover);
    }

    .dossier-row--active {
      border-color: var(--zir-emerald);
      background: color-mix(in srgb, var(--zir-emerald) 8%, transparent);
    }

    .dossier-row__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .dossier-row__ref {
      font-size: 0.72rem;
      font-weight: 700;
      font-family: monospace;
      color: var(--zir-emerald);
    }

    .dossier-row__name {
      margin: 0 0 6px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dossier-row__bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dossier-row__amount {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .dossier-row__arrow {
      width: 14px;
      height: 14px;
      color: var(--text-muted);
      transition: transform 0.15s;
    }

    .dossier-row:hover .dossier-row__arrow {
      transform: translateX(3px);
      color: var(--zir-emerald);
    }

    .inst-table__mono {
      font-family: monospace;
      color: var(--text-muted);
    }

    .inst-btn--sm {
      padding: 5px 10px;
      font-size: 0.72rem;
      border-radius: 8px;
    }

    .inst-btn--sm ng-icon {
      width: 13px;
      height: 13px;
    }
  `]
})
export class ApiaCreditComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  dossiers = signal<Dossier[]>([]);
  selectedDossier = signal<Dossier | null>(null);
  credit = signal<CreditDetails | null>(null);
  loadingDossiers = signal(true);

  private get headers() {
    return { Authorization: `Bearer ${this.authStore.token()}` };
  }

  totalRequested = () => this.dossiers().reduce((sum, d) => sum + Number(d.requestedAmountTnd || 0), 0);
  approvedCount = () => this.dossiers().filter(d => d.status === 'APPROVED').length;
  declaredPayments = () => (this.credit()?.installments || []).filter(i => i.status === 'PAID_DECLARED');
  lateCount = () => (this.credit()?.installments || []).filter(i => i.status === 'LATE').length;

  statusLabel(s: string): string {
    return STATUS_MAP[s]?.label ?? s;
  }

  statusPillClass(s: string): string {
    const v = STATUS_MAP[s]?.variant ?? 'gray';
    return `status-pill status-pill--${v}`;
  }

  ngOnInit() {
    this.loadDossiers();
  }

  loadDossiers() {
    const instId = (this.authStore.currentUser() as any)?.institutionMember?.institutionId;
    if (!instId) {
      this.loadingDossiers.set(false);
      return;
    }

    this.http.get<{ data: Dossier[]; total: number }>(
      `${environment.apiUrl}/dossiers/institution/${instId}?limit=50`,
      { headers: this.headers }
    ).subscribe({
      next: res => {
        this.dossiers.set(res.data);
        this.loadingDossiers.set(false);
      },
      error: () => this.loadingDossiers.set(false),
    });
  }

  selectDossier(d: Dossier) {
    this.selectedDossier.set(d);
    this.http.get<CreditDetails>(
      `${environment.apiUrl}/dossiers/${d.id}/credit`,
      { headers: this.headers }
    ).subscribe({
      next: c => this.credit.set(c),
      error: () => this.credit.set(null),
    });
  }

  openScheduleModal() {
    const d = this.selectedDossier();
    if (!d) return;
    const c = this.credit();

    if (!c) {
      this.http.post<CreditDetails>(
        `${environment.apiUrl}/dossiers/credit`,
        {
          dossierId: d.id,
          financingInstitution: 'BNA - Banque Nationale Agricole',
          requestedAmountTnd: d.requestedAmountTnd,
        },
        { headers: this.headers }
      ).subscribe(newCredit => {
        this.credit.set(newCredit);
        this.generateDefaultSchedule(newCredit.id);
      });
    } else {
      this.generateDefaultSchedule(c.id);
    }
  }

  private generateDefaultSchedule(creditId: string) {
    this.http.post<Installment[]>(
      `${environment.apiUrl}/dossiers/credit/${creditId}/schedule`,
      {
        installmentsCount: 12,
        firstDueDate: new Date().toISOString(),
      },
      { headers: this.headers }
    ).subscribe(() => {
      if (this.selectedDossier()) this.selectDossier(this.selectedDossier()!);
    });
  }

  confirmPayment(installmentId: string) {
    this.http.patch(
      `${environment.apiUrl}/dossiers/installments/${installmentId}/confirm-payment`,
      {},
      { headers: this.headers }
    ).subscribe(() => {
      if (this.selectedDossier()) this.selectDossier(this.selectedDossier()!);
    });
  }
}
