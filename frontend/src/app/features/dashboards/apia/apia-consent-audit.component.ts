import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import {
  lucideLock,
  lucideShield,
  lucideFileText,
  lucideClock,
  lucideUser,
  lucideGlobe,
} from '@ng-icons/lucide';
import { NgIconComponent, provideIcons } from '@ng-icons/core';

interface AccessLog {
  id: string;
  actorUserId: string;
  farmerId: string;
  scope: string;
  action: string;
  recordId?: string;
  ipAddress?: string;
  createdAt: string;
  actorUser?: { name: string };
}

@Component({
  selector: 'app-apia-consent-audit',
  standalone: true,
  imports: [CommonModule, NgIconComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideLock,
      lucideShield,
      lucideFileText,
      lucideClock,
      lucideUser,
      lucideGlobe,
    }),
  ],
  template: `
    <div class="inst-page">

      <!-- Header -->
      <div class="inst-header">
        <div class="inst-header__left">
          <div class="inst-header__icon inst-header__icon--amber">
            <ng-icon name="lucideLock" style="font-size: 20px"></ng-icon>
          </div>
          <div>
            <h1 class="inst-header__title">Journal d'Audit — Accès aux Données</h1>
            <p class="inst-header__sub">Traçabilité immuable des accès · Protégé par triggers PostgreSQL</p>
          </div>
        </div>
      </div>

      <!-- Immutability Badge -->
      <div class="inst-badge inst-badge--emerald">
        <ng-icon name="lucideShield" style="font-size: 14px"></ng-icon>
        Journal Immuable — Chaque entrée est protégée par un trigger PostgreSQL
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="sk-row">
          @for (row of [1,2,3,4,5]; track row) {
            <div class="sk sk--h36 sk--full"></div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && logs().length === 0) {
        <div class="inst-card">
          <div class="inst-empty">
            <ng-icon name="lucideFileText"></ng-icon>
            <p>Aucun accès aux données enregistré</p>
          </div>
        </div>
      }

      <!-- Log Table -->
      @if (!loading() && logs().length > 0) {
        <div class="inst-card">
          <div class="inst-card__head">
            <h2 class="inst-card__title">
              <ng-icon name="lucideClock"></ng-icon>
              Entrées d'audit
            </h2>
            <span class="status-pill status-pill--emerald">
              <span class="status-pill__dot"></span>
              {{ logs().length }} entrée(s)
            </span>
          </div>
          <div class="inst-table-wrap">
            <table class="inst-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Acteur</th>
                  <th>Portée</th>
                  <th>Action</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr>
                    <td>
                      <span class="inst-table__name">
                        {{ log.createdAt | date:'dd/MM/yy HH:mm:ss' }}
                      </span>
                    </td>
                    <td>
                      {{ log.actorUser?.name || log.actorUserId.substring(0,8) + '…' }}
                    </td>
                    <td>
                      <span class="status-pill status-pill--blue">
                        <ng-icon name="lucideGlobe" style="font-size: 10px"></ng-icon>
                        {{ log.scope }}
                      </span>
                    </td>
                    <td>
                      <span class="status-pill" [class]="log.action === 'READ' ? 'status-pill--emerald' : 'status-pill--amber'">
                        <ng-icon name="lucideUser" style="font-size: 10px"></ng-icon>
                        {{ log.action }}
                      </span>
                    </td>
                    <td style="font-family: monospace; color: var(--text-muted)">
                      {{ log.ipAddress || '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

    </div>
  `,
})
export class ApiaConsentAuditComponent implements OnInit {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);

  logs = signal<AccessLog[]>([]);
  loading = signal(true);

  private get headers() { return { Authorization: `Bearer ${this.authStore.token()}` }; }

  ngOnInit() {
    this.http.get<AccessLog[]>(
      `${environment.apiUrl}/privacy/institution/access-logs`,
      { headers: this.headers }
    ).subscribe({
      next: (data) => { this.logs.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
