import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideFileText, lucideFilter, lucideRefreshCw, lucideInbox
} from '@ng-icons/lucide';
import { ContractsApiService, MissionContract, ContractStatus, ContractType } from '../../../core/services/contracts-api.service';
import { ZirContractCardComponent } from './zir-contract-card.component';

@Component({
  selector: 'zir-contract-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, ZirContractCardComponent],
  providers: [provideIcons({ lucideFileText, lucideFilter, lucideRefreshCw, lucideInbox })],
  template: `
    <div class="ch-wrapper">
      <!-- Page Header -->
      <header class="ch-header">
        <div class="ch-header__title">
          <div class="ch-header__icon">
            <ng-icon name="lucideFileText" size="20"></ng-icon>
          </div>
          <div>
            <h1>Mes Contrats</h1>
            <p>Historique de tous vos contrats de mission ZirIA</p>
          </div>
        </div>
        <button class="btn-refresh" (click)="load()">
          <ng-icon name="lucideRefreshCw" size="14"></ng-icon>
          Actualiser
        </button>
      </header>

      <!-- Filters -->
      <div class="ch-filters">
        <button
          *ngFor="let f of filters"
          class="filter-btn"
          [class.filter-btn--active]="activeFilter() === f.value"
          (click)="setFilter(f.value)">
          {{ f.label }}
          <span class="filter-count" *ngIf="countByStatus(f.value) > 0">{{ countByStatus(f.value) }}</span>
        </button>
      </div>

      <!-- Stats Row -->
      <div class="ch-stats">
        <div class="stat-card">
          <span class="stat-label">Total contrats</span>
          <span class="stat-value">{{ contracts().length }}</span>
        </div>
        <div class="stat-card stat-card--green">
          <span class="stat-label">Actifs</span>
          <span class="stat-value">{{ countByStatus('ACTIVE') }}</span>
        </div>
        <div class="stat-card stat-card--amber">
          <span class="stat-label">En attente</span>
          <span class="stat-value">{{ countByStatus('PENDING_ACCEPTANCE') }}</span>
        </div>
        <div class="stat-card stat-card--red">
          <span class="stat-label">En litige</span>
          <span class="stat-value">{{ countByStatus('DISPUTED') }}</span>
        </div>
      </div>

      <!-- Contract List -->
      <div class="ch-list" *ngIf="!isLoading(); else loadingTpl">
        <ng-container *ngIf="filtered().length > 0; else emptyTpl">
          <zir-contract-card
            *ngFor="let c of filtered(); trackBy: trackById"
            [contract]="c"
            [showAccept]="c.status === 'PENDING_ACCEPTANCE'"
            [showDispute]="c.status === 'ACTIVE'"
            (accepted)="onContractAccepted($event)"
            (disputed)="load()">
          </zir-contract-card>
        </ng-container>
      </div>

      <ng-template #loadingTpl>
        <div class="ch-loading">
          <div class="spinner"></div>
          <p>Chargement des contrats…</p>
        </div>
      </ng-template>

      <ng-template #emptyTpl>
        <div class="ch-empty">
          <ng-icon name="lucideInbox" size="48"></ng-icon>
          <h3>Aucun contrat</h3>
          <p>Vous n'avez pas encore de contrats dans cette catégorie.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .ch-wrapper { display: flex; flex-direction: column; gap: 24px; }

    .ch-header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
    }
    .ch-header__title { display: flex; align-items: center; gap: 16px; }
    .ch-header__icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1));
      border: 1px solid rgba(34,197,94,0.2);
      display: flex; align-items: center; justify-content: center; color: #4ade80;
    }
    h1 { font-size: 22px; font-weight: 700; color: #f1f5f9; margin: 0; }
    p  { font-size: 13px; color: #64748b; margin: 0; }

    .btn-refresh {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8; font-size: 12px; font-weight: 600; padding: 8px 16px;
      border-radius: 8px; cursor: pointer; transition: background 0.15s;
    }
    .btn-refresh:hover { background: rgba(255,255,255,0.1); }

    .ch-filters {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .filter-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: #64748b; cursor: pointer; transition: all 0.15s;
    }
    .filter-btn--active {
      background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #4ade80;
    }
    .filter-count {
      background: rgba(34,197,94,0.2); color: #4ade80;
      font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px;
    }

    .ch-stats {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;
    }
    .stat-card {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 14px 18px;
    }
    .stat-card--green  { border-color: rgba(34,197,94,0.2);  background: rgba(34,197,94,0.05);  }
    .stat-card--amber  { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.05); }
    .stat-card--red    { border-color: rgba(239,68,68,0.2);  background: rgba(239,68,68,0.05);  }
    .stat-label { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px; }
    .stat-value { display: block; font-size: 24px; font-weight: 800; color: #f1f5f9; }

    .ch-list { display: flex; flex-direction: column; gap: 12px; }

    .ch-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; color: #64748b; }
    .spinner {
      width: 32px; height: 32px; border: 3px solid rgba(34,197,94,0.2);
      border-top-color: #22c55e; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ch-empty {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px; color: #64748b; text-align: center;
    }
    .ch-empty h3 { color: #94a3b8; font-size: 18px; margin: 0; }
    .ch-empty p  { font-size: 13px; max-width: 280px; }
  `]
})
export class ZirContractHistoryComponent implements OnInit {
  private readonly api = inject(ContractsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = signal(true);
  contracts = signal<MissionContract[]>([]);
  activeFilter = signal<ContractStatus | 'ALL'>('ALL');

  readonly filters: Array<{ label: string; value: ContractStatus | 'ALL' }> = [
    { label: 'Tous',         value: 'ALL' },
    { label: 'En attente',   value: 'PENDING_ACCEPTANCE' },
    { label: 'Actifs',       value: 'ACTIVE' },
    { label: 'Terminés',     value: 'COMPLETED' },
    { label: 'En litige',    value: 'DISPUTED' },
    { label: 'Résolus',      value: 'RESOLVED' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.api.getMyContracts().subscribe(list => {
      this.contracts.set(list);
      this.isLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  filtered(): MissionContract[] {
    const f = this.activeFilter();
    if (f === 'ALL') return this.contracts();
    return this.contracts().filter(c => c.status === f);
  }

  setFilter(v: ContractStatus | 'ALL'): void { this.activeFilter.set(v); }

  countByStatus(s: ContractStatus | 'ALL'): number {
    if (s === 'ALL') return this.contracts().length;
    return this.contracts().filter(c => c.status === s).length;
  }

  trackById(_: number, c: MissionContract): string { return c.id; }

  onContractAccepted(updated: MissionContract): void {
    this.contracts.update(list =>
      list.map(c => c.id === updated.id ? updated : c)
    );
    this.cdr.markForCheck();
  }
}
