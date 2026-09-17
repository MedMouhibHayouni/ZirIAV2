import {  Component, computed, inject, signal, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMap, lucideAlertTriangle
} from '@ng-icons/lucide';
import { AmbassadorApiService, ZoneStats } from '../../../core/services/ambassador-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ambassador-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NgIconComponent],
  providers: [provideIcons({
    lucideMap, lucideAlertTriangle
  
})],
  template: `
    <div class="amb-sub-shell">
      <!-- Zone Banner - Specific to Ambassador -->
      @if (stats()?.zone) {
        <div class="amb-zone-banner">
          <div class="banner-left">
            <ng-icon name="lucideMap"></ng-icon>
            <span class="zone-name">{{ stats()!.zone.name }}</span>
            <span class="zone-meta">{{ stats()!.zone.delegation }} · {{ stats()!.zone.governorate }}</span>
          </div>
          
          @if (criticalCount() > 0) {
            <span class="zone-alert-chip">
              <ng-icon name="lucideAlertTriangle"></ng-icon>
              {{ criticalCount() }} alerte{{ criticalCount() > 1 ? 's' : '' }} critique{{ criticalCount() > 1 ? 's' : '' }}
            </span>
          }
        </div>
      }

      <div class="amb-content-wrap">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .amb-sub-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-primary);
    }
    .amb-zone-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 32px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      color: var(--zir-emerald);
      box-shadow: var(--shadow-sm);
    }
    .banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .zone-name { font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }
    .zone-meta { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; }
    .zone-alert-chip {
      background: var(--error);
      color: white;
      padding: 5px 14px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      animation: pulse 2s infinite;
    }
    .amb-content-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class AmbassadorShellComponent implements OnInit {
  private readonly api = inject(AmbassadorApiService);
  private readonly auth = inject(AuthService);

  stats = signal<ZoneStats | null>(null);
  criticalCount = signal(0);

  readonly user = computed(() => this.auth.currentUser());

  ngOnInit(): void {
    this.api.getZoneStats().subscribe(s => {
      if (s) {
        this.stats.set(s);
        this.criticalCount.set(s.active_alerts?.critical ?? 0);
      }
    });
  }
}
