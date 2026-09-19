import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideX, lucideLock, lucideZap } from '@ng-icons/lucide';
import { UpgradeModalService } from '../../services/upgrade-modal.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NgIconComponent],
  viewProviders: [provideIcons({ lucideX, lucideLock, lucideZap })],
  template: `
    @if (modal.isOpen()) {
      <div class="upgrade-overlay" (click)="modal.close()">
        <div class="upgrade-card" (click)="$event.stopPropagation()">
          <button class="upgrade-card__close" (click)="modal.close()" aria-label="Fermer">
            <ng-icon name="lucideX" style="font-size:16px"></ng-icon>
          </button>

          <div class="upgrade-card__icon">
            <ng-icon name="lucideLock" style="font-size:26px"></ng-icon>
          </div>

          <h3 class="upgrade-card__title">Fonctionnalité Limitée</h3>

          <p class="upgrade-card__desc">
            Le module <strong class="upgrade-card__feature">{{ modal.featureName() }}</strong>
            nécessite un abonnement actif (Starter ou Pro).
          </p>

          <div class="upgrade-card__actions">
            <button (click)="modal.close()" class="upgrade-card__btn upgrade-card__btn--ghost">
              Fermer
            </button>
          <a [routerLink]="subscriptionRoute()"
             [queryParams]="{ plan: 'STARTER' }"
             (click)="modal.close()"
             class="upgrade-card__btn upgrade-card__btn--primary">
              <ng-icon name="lucideZap" style="font-size:14px"></ng-icon>
              Découvrir les Plans
            </a>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }

    .upgrade-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.4);
      animation: fadeIn 0.15s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
      .upgrade-overlay { animation: none; }
    }

    .upgrade-card {
      width: 100%;
      max-width: 380px;
      background: var(--bg-card, #1e293b);
      border: 1px solid var(--border, #334155);
      border-radius: 20px;
      padding: 32px 24px 24px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .upgrade-card { animation: none; }
    }

    .upgrade-card__close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--bg-card-hover, #2d3a4f);
      border: 1px solid var(--border, #334155);
      color: var(--text-muted, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .upgrade-card__close:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }

    .upgrade-card__icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: color-mix(in srgb, var(--zir-gold) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--zir-gold) 20%, transparent);
      color: var(--zir-gold, #d4af37);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .upgrade-card__title {
      font-size: 17px;
      font-weight: 800;
      color: var(--text-primary, #f8fafc);
      text-align: center;
      margin-bottom: 6px;
      letter-spacing: -0.02em;
    }

    .upgrade-card__desc {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary, #94a3b8);
      text-align: center;
      margin-bottom: 22px;
    }

    .upgrade-card__feature {
      color: var(--zir-emerald, #10b981);
      font-weight: 700;
    }

    .upgrade-card__actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .upgrade-card__btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 9px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
      border: none;
    }

    .upgrade-card__btn--ghost {
      background: var(--bg-card-hover, #2d3a4f);
      color: var(--text-secondary, #94a3b8);
      border: 1px solid var(--border, #334155);
    }

    .upgrade-card__btn--ghost:hover {
      color: var(--text-primary, #f8fafc);
      border-color: var(--text-muted, #64748b);
    }

    .upgrade-card__btn--primary {
      background: var(--zir-emerald, #10b981);
      color: #fff;
      box-shadow: 0 4px 14px color-mix(in srgb, var(--zir-emerald, #10b981) 30%, transparent);
    }

    .upgrade-card__btn--primary:hover {
      background: var(--zir-emerald-deep, #059669);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--zir-emerald, #10b981) 40%, transparent);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    [data-theme='light'] .upgrade-overlay {
      background: rgba(0, 0, 0, 0.25);
    }

    [data-theme='light'] .upgrade-card {
      background: var(--bg-card, #ffffff);
      border-color: var(--border, #e2e8f0);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class UpgradeModalComponent {
  modal = inject(UpgradeModalService);
  private auth = inject(AuthService);

  subscriptionRoute(): string {
    return this.auth.currentUser()?.role === 'SUPPLIER'
      ? '/dashboard/supplier/subscription'
      : '/dashboard/subscription/checkout';
  }
}
