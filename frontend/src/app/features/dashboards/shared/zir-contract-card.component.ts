import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideFileText, lucideCheckCircle, lucideAlertTriangle, lucideDownload,
  lucideFlag, lucideClock, lucideShield, lucideXCircle, lucideTruck,
  lucideBriefcase, lucideWrench, lucideMessageSquare, lucidePen, lucidePlayCircle,
} from '@ng-icons/lucide';
import { ContractsApiService, MissionContract, ContractStatus } from '../../../core/services/contracts-api.service';

@Component({
  selector: 'zir-contract-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideFileText, lucideCheckCircle, lucideAlertTriangle, lucideDownload,
    lucideFlag, lucideClock, lucideShield, lucideXCircle, lucideTruck,
    lucideBriefcase, lucideWrench, lucideMessageSquare, lucidePen, lucidePlayCircle,
  })],
  template: `
    <div class="contract-card" [class]="'contract-card--' + statusClass(contract.status)">
      <!-- Header -->
      <div class="contract-card__header">
        <div class="contract-card__type-badge">
          <ng-icon [name]="typeIcon(contract.contract_type)" size="14"></ng-icon>
          <span>{{ typeLabel(contract.contract_type) }}</span>
        </div>
        <div class="contract-card__status-badge" [class]="'status-' + statusClass(contract.status)">
          <ng-icon [name]="statusIcon(contract.status)" size="12"></ng-icon>
          {{ statusLabel(contract.status) }}
        </div>
      </div>

      <!-- Body -->
      <div class="contract-card__body">
        <div class="contract-card__amounts">
          <div class="amount-block">
            <span class="amount-label">Montant total</span>
            <span class="amount-value">{{ fmt(contract.total_amount_tnd) }} <em>TND</em></span>
          </div>
          <div class="amount-block">
            <span class="amount-label">Commission ZirIA</span>
            <span class="amount-value commission">−{{ fmt(contract.commission_amount_tnd) }} <em>TND</em></span>
          </div>
          <div class="amount-block amount-block--net">
            <span class="amount-label">Montant net</span>
            <span class="amount-value net">{{ fmt(contract.total_amount_tnd - contract.commission_amount_tnd) }} <em>TND</em></span>
          </div>
        </div>

        <div class="contract-card__meta">
          <span>Créé le {{ contract.created_at | date:'dd/MM/yyyy' }}</span>
          @if (contract.accepted_at) {
            <span>Accepté le {{ contract.accepted_at | date:'dd/MM/yyyy' }}</span>
          }
        </div>
      </div>

      <!-- Actions -->
      <div class="contract-card__actions">
        @if (contract.status === 'PENDING_ACCEPTANCE' && showAccept) {
          <button class="btn-accept" (click)="onAccept()" [disabled]="loading()">
            <ng-icon name="lucideCheckCircle" size="14"></ng-icon>
            {{ loading() ? 'Traitement…' : 'Accepter le contrat' }}
          </button>
        }

        @if (contract.status === 'ACTIVE' && showDispute) {
          <button class="btn-dispute" (click)="onDispute()">
            <ng-icon name="lucideFlag" size="14"></ng-icon>
            Signaler un litige
          </button>
        }

        <button class="btn-pdf" (click)="downloadPdf()">
          <ng-icon name="lucideDownload" size="14"></ng-icon>
          PDF
        </button>
      </div>
    </div>
  `,
  styles: [`
    .contract-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .contract-card--active   { border-color: rgba(34,197,94,0.25); }
    .contract-card--pending  { border-color: rgba(245,158,11,0.25); }
    .contract-card--disputed { border-color: rgba(239,68,68,0.30); }
    .contract-card--completed{ border-color: rgba(59,130,246,0.25); }

    .contract-card__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .contract-card__type-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #94a3b8;
    }

    .contract-card__status-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 4px 10px; border-radius: 999px; letter-spacing: 0.05em;
    }
    .status-active    { background: rgba(34,197,94,0.15);  color: #4ade80; }
    .status-pending   { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .status-disputed  { background: rgba(239,68,68,0.15);  color: #f87171; }
    .status-completed { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .status-resolved  { background: rgba(139,92,246,0.15); color: #a78bfa; }
    .status-cancelled { background: rgba(107,114,128,0.15);color: #9ca3af; }

    .contract-card__body { padding: 16px 18px; }

    .contract-card__amounts {
      display: grid; grid-template-columns: repeat(3,1fr); gap: 12px;
      margin-bottom: 12px;
    }
    .amount-block { display: flex; flex-direction: column; gap: 2px; }
    .amount-block--net {
      background: rgba(34,197,94,0.06); border-radius: 8px; padding: 6px 10px;
    }
    .amount-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .amount-value { font-size: 15px; font-weight: 700; color: #e2e8f0; }
    .amount-value em { font-size: 10px; font-style: normal; color: #64748b; }
    .amount-value.commission { color: #f87171; }
    .amount-value.net { color: #4ade80; }

    .contract-card__meta {
      display: flex; gap: 16px; flex-wrap: wrap;
      font-size: 11px; color: #64748b;
    }

    .contract-card__actions {
      display: flex; gap: 8px; padding: 12px 18px;
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
    }

    button {
      display: flex; align-items: center; gap: 6px; padding: 7px 14px;
      border-radius: 8px; font-size: 12px; font-weight: 600;
      border: none; cursor: pointer; transition: opacity 0.15s;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-accept  { background: #22c55e; color: #fff; }
    .btn-dispute { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .btn-pdf     { background: rgba(255,255,255,0.06); color: #94a3b8; margin-left: auto; }
    button:hover:not(:disabled) { opacity: 0.85; }
  `]
})
export class ZirContractCardComponent {
  @Input({ required: true }) contract!: MissionContract;
  @Input() showAccept = false;
  @Input() showDispute = false;
  @Output() accepted = new EventEmitter<MissionContract>();
  @Output() disputed = new EventEmitter<string>();

  private readonly api = inject(ContractsApiService);
  loading = signal(false);

  statusClass(s: ContractStatus): string {
    const map: Record<string, string> = {
      PENDING_ACCEPTANCE: 'pending',
      ACTIVE: 'active',
      COMPLETED: 'completed',
      DISPUTED: 'disputed',
      RESOLVED: 'resolved',
      CANCELLED: 'cancelled',
      OUVERTE: 'pending',
      EN_ATTENTE: 'pending',
      NEGOCIATION: 'pending',
      EN_ATTENTE_SIGNATURE: 'pending',
      EN_COURS: 'active',
      TERMINEE: 'completed',
      ANNULEE: 'cancelled',
    };
    return map[s] ?? 'pending';
  }

  statusLabel(s: ContractStatus): string {
    const map: Record<string, string> = {
      PENDING_ACCEPTANCE: 'En attente',
      ACTIVE: 'Actif',
      COMPLETED: 'Terminé',
      DISPUTED: 'En litige',
      RESOLVED: 'Résolu',
      CANCELLED: 'Annulé',
      OUVERTE: 'Ouverte',
      EN_ATTENTE: 'En attente',
      NEGOCIATION: 'En négociation',
      EN_ATTENTE_SIGNATURE: 'Signature en attente',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[s] ?? s;
  }

  statusIcon(s: ContractStatus): string {
    const map: Record<string, string> = {
      PENDING_ACCEPTANCE: 'lucideClock',
      ACTIVE: 'lucideCheckCircle',
      COMPLETED: 'lucideShield',
      DISPUTED: 'lucideAlertTriangle',
      RESOLVED: 'lucideCheckCircle',
      CANCELLED: 'lucideXCircle',
      OUVERTE: 'lucideFileText',
      EN_ATTENTE: 'lucideClock',
      NEGOCIATION: 'lucideMessageSquare',
      EN_ATTENTE_SIGNATURE: 'lucidePen',
      EN_COURS: 'lucidePlayCircle',
      TERMINEE: 'lucideShield',
      ANNULEE: 'lucideXCircle',
    };
    return map[s] ?? 'lucideClock';
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT: 'Transport',
      JOB: 'Mission Agricole',
      EQUIPMENT_RENTAL: 'Location Matériel',
    };
    return map[t] ?? t;
  }

  typeIcon(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT: 'lucideTruck',
      JOB: 'lucideBriefcase',
      EQUIPMENT_RENTAL: 'lucideWrench',
    };
    return map[t] ?? 'lucideFileText';
  }

  fmt(n: number | string): string {
    return Number(n ?? 0).toLocaleString('fr-TN', {
      minimumFractionDigits: 3, maximumFractionDigits: 3
    });
  }

  onAccept(): void {
    this.loading.set(true);
    this.api.acceptContract(this.contract.id).subscribe({
      next: c => { this.accepted.emit(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onDispute(): void {
    const reason = prompt('Décrivez le motif du litige:');
    if (!reason?.trim()) return;
    this.api.raiseDispute(this.contract.id, reason).subscribe(c => {
      this.disputed.emit(c.id);
    });
  }

  downloadPdf(): void {
    this.api.downloadPdf(this.contract.id);
  }
}
