import { Component, input, output, effect, ElementRef, ViewChild, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-slide-in-panel',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideX })],
  template: `
    @if (isOpen()) {
      <div class="panel-overlay" (click)="close.emit()" [class.panel-overlay-enter]="true"></div>
      <div class="panel-container" [class.panel-enter]="true">
        <div class="panel-header">
          <h3 class="panel-title">{{ title() }}</h3>
          <button class="panel-close-btn" (click)="close.emit()">
            <ng-icon name="lucideX"></ng-icon>
          </button>
        </div>
        <div class="panel-body">
          <ng-content></ng-content>
        </div>
        <div class="panel-footer">
          <ng-content select="[panelFooter]"></ng-content>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .panel-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
      animation: overlayFadeIn 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    .panel-container {
      position: fixed;
      top: 0;
      right: 0;
      height: 100%;
      width: v-bind(width());
      max-width: 100vw;
      background: var(--bg-primary);
      border-left: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      z-index: 201;
      display: flex;
      flex-direction: column;
      animation: panelSlideIn 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    .panel-header {
      padding: 20px 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      height: 64px;
    }

    .panel-title {
      font-weight: 800;
      color: var(--text-primary);
      font-size: 1.1rem;
      margin: 0;
    }

    .panel-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      color: var(--text-muted);
      padding: 0;
      flex-shrink: 0;
    }

    .panel-close-btn:hover {
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .panel-close-btn ng-icon {
      width: 14px;
      height: 14px;
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .panel-footer {
      position: sticky;
      bottom: 0;
      background: var(--bg-card);
      border-top: 1px solid var(--border);
      padding: 16px 20px;
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes panelSlideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @media (max-width: 768px) {
      .panel-container {
        width: 100vw;
      }
    }
  `]
})
export class SlideInPanelComponent {
  readonly isOpen = input<boolean>(false);
  readonly width = input<string>('520px');
  readonly title = input<string>('');
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isOpen()) {
      this.close.emit();
    }
  }
}
