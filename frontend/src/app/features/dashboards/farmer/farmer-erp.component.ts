import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard, lucidePackage, lucideCircleDollarSign,
  lucideSprout
} from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-erp',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NgIconComponent],
  providers: [provideIcons({
    lucideLayoutDashboard, lucidePackage, lucideCircleDollarSign, lucideSprout
  })],
  template: `
    <div class="erp-hub">
      <nav class="hub-tabs">
        <a class="hub-tab"
           routerLink="."
           routerLinkActive="active"
           [routerLinkActiveOptions]="{exact: true}">
          <span class="tab-icon"><ng-icon name="lucideLayoutDashboard"></ng-icon></span>
          <span class="tab-label">Tableau de Bord</span>
          <span class="tab-desc">Vue d'ensemble</span>
        </a>
        <a class="hub-tab"
           routerLink="stock"
           routerLinkActive="active">
          <span class="tab-icon"><ng-icon name="lucidePackage"></ng-icon></span>
          <span class="tab-label">Stock</span>
          <span class="tab-desc">Gestion des stocks</span>
        </a>
        <a class="hub-tab"
           routerLink="finance"
           routerLinkActive="active">
          <span class="tab-icon"><ng-icon name="lucideCircleDollarSign"></ng-icon></span>
          <span class="tab-label">Finances</span>
          <span class="tab-desc">Revenus & dépenses</span>
        </a>
      </nav>
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .erp-hub {
      display: flex; flex-direction: column; height: 100%;
      background: var(--bg-primary);
    }
    .hub-tabs {
      display: flex; gap: 2px; padding: 12px 16px 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .hub-tab {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 20px;
      border-radius: 12px 12px 0 0;
      text-decoration: none; color: var(--text-muted);
      transition: all 0.2s; position: relative; cursor: pointer;
      border: 1px solid transparent; border-bottom: none;
      margin-bottom: -1px;
    }
    .hub-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.03); }
    .hub-tab.active {
      color: var(--zir-emerald); background: var(--bg-primary);
      border-color: var(--border);
    }
    .hub-tab.active::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
      height: 2px; background: var(--zir-emerald);
    }
    .tab-icon ng-icon { width: 20px; height: 20px; display: block; }
    .tab-label { font-size: 0.9rem; font-weight: 700; white-space: nowrap; }
    .tab-desc { display: none; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
    .hub-tab.active .tab-desc { color: var(--text-secondary); }
    .hub-content { flex: 1; overflow: hidden; background: var(--bg-primary); }
    @media (min-width: 900px) { .hub-tab { padding: 14px 24px; } .tab-desc { display: block; } }
    @media (max-width: 600px) {
      .hub-tabs { gap: 0; padding: 8px 8px 0; }
      .hub-tab { flex: 1; justify-content: center; padding: 10px 8px; }
      .tab-label { font-size: 0.78rem; }
      .tab-icon ng-icon { width: 18px; height: 18px; }
    }
  `]
})
export class FarmerErpComponent {}
