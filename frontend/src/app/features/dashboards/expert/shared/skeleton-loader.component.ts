import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    <div class="skeleton-block"
         [style.width]="width()"
         [style.height]="height()"
         [style.border-radius]="borderRadius()">
    </div>
  `,
  styles: [`
    .skeleton-block {
      background: var(--bg-card);
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `]
})
export class SkeletonLoaderComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('16px');
  readonly borderRadius = input<string>('4px');
}
