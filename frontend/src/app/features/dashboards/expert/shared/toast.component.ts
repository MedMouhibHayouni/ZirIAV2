import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideXCircle, lucideInfo } from '@ng-icons/lucide';
import { ToastService } from './toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideCheckCircle, lucideXCircle, lucideInfo })],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [class]="'toast-item toast-item--' + toast.type">
          @switch (toast.type) {
            @case ('success') {
              <ng-icon name="lucideCheckCircle" class="toast-icon toast-icon--success"></ng-icon>
            }
            @case ('error') {
              <ng-icon name="lucideXCircle" class="toast-icon toast-icon--error"></ng-icon>
            }
            @case ('info') {
              <ng-icon name="lucideInfo" class="toast-icon toast-icon--info"></ng-icon>
            }
          }
          <div class="toast-text">
            <span class="toast-title">{{ toast.title }}</span>
            @if (toast.message) {
              <span class="toast-message">{{ toast.message }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: all;
      min-width: 300px;
      max-width: 380px;
      background: var(--bg-card);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: var(--shadow-lg);
      display: flex;
      gap: 10px;
      align-items: flex-start;
      animation: toastEnter 250ms ease-out forwards;
    }

    .toast-item--success { border-left: 4px solid var(--zir-emerald); }
    .toast-item--error   { border-left: 4px solid var(--danger); }
    .toast-item--info    { border-left: 4px solid var(--info); }

    .toast-icon { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .toast-icon--success { color: var(--zir-emerald); }
    .toast-icon--error   { color: var(--danger); }
    .toast-icon--info    { color: var(--info); }

    .toast-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .toast-title {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .toast-message {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    @keyframes toastEnter {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .toast-container {
        left: 12px;
        right: 12px;
        bottom: 16px;
      }
      .toast-item { min-width: 0; max-width: 100%; }
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
