import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FinancialBreakdown {
  gross_amount: number;
  rate: number;
}

@Component({
  selector: 'zir-financial-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="breakdown-card" [class.payer]="mode === 'payer'" [class.payee]="mode === 'payee'">
      <h4 class="title">💵 Détails financiers de la transaction</h4>
      
      <div class="row">
        <span class="label">Montant convenu</span>
        <span class="val">{{ gross.toFixed(3) }} TND</span>
      </div>

      <ng-container *ngIf="mode === 'payer'">
        <div class="row">
          <span class="label">Frais de service ({{ ratePct }}%)</span>
          <span class="val">{{ fee.toFixed(3) }} TND</span>
        </div>
        <div class="divider"></div>
        <div class="row total">
          <span class="label">Total à payer</span>
          <span class="val highlight">{{ totalPay.toFixed(3) }} TND</span>
        </div>
      </ng-container>

      <ng-container *ngIf="mode === 'payee'">
        <div class="row">
          <span class="label">Commission ZirIA ({{ ratePct }}%)</span>
          <span class="val negative">-{{ fee.toFixed(3) }} TND</span>
        </div>
        <div class="divider"></div>
        <div class="row total">
          <span class="label">Montant net (crédité)</span>
          <span class="val highlight">{{ netPay.toFixed(3) }} TND</span>
        </div>
        <p class="notice">🚨 Remarque: Le montant net sera d'abord placé sur votre solde en attente (sécurisé) et libéré automatiquement dès que la mission sera validée ou après un délai de 48h.</p>
      </ng-container>
    </div>
  `,
  styles: [`
    .breakdown-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: var(--shadow-sm);
      margin: 16px 0;
    }
    .breakdown-card.payer {
      border-left: 4px solid var(--zir-emerald);
    }
    .breakdown-card.payee {
      border-left: 4px solid var(--info);
    }
    .title {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .val {
      color: var(--text-primary);
      font-weight: 700;
    }
    .val.negative {
      color: var(--zir-red, #ef4444);
    }
    .divider {
      height: 1px;
      background: var(--border);
      margin: 4px 0;
    }
    .total {
      font-size: 1.05rem;
    }
    .total .label {
      color: var(--text-primary);
      font-weight: 800;
    }
    .total .highlight {
      color: var(--zir-emerald);
      font-weight: 800;
      font-size: 1.15rem;
    }
    .notice {
      margin-top: 8px;
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
      font-weight: 500;
    }
  `]
})
export class ZirFinancialBreakdownComponent {
  @Input() mode: 'payer' | 'payee' = 'payer';
  @Input() breakdown!: FinancialBreakdown;

  get gross() {
    return this.breakdown?.gross_amount ?? 0;
  }

  get ratePct() {
    return (this.breakdown?.rate ?? 0) * 100;
  }

  get fee() {
    return this.gross * (this.breakdown?.rate ?? 0);
  }

  get totalPay() {
    return this.gross + this.fee;
  }

  get netPay() {
    return this.gross - this.fee;
  }
}
