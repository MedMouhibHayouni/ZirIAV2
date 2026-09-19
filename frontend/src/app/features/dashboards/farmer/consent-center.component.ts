import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-consent-center',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Centre de Confidentialité & Consentements</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Gérez la portée de vos autorisations et consultez l'historique d'accès à vos données</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button 
          (click)="activeTab.set('consents')"
          [class.border-emerald-500]="activeTab() === 'consents'"
          [class.text-emerald-600]="activeTab() === 'consents'"
          class="pb-3 text-sm font-semibold border-b-2 transition-colors">
          Mes Consentements Actifs
        </button>
        <button 
          (click)="activeTab.set('audit')"
          [class.border-emerald-500]="activeTab() === 'audit'"
          [class.text-emerald-600]="activeTab() === 'audit'"
          class="pb-3 text-sm font-semibold border-b-2 text-slate-500 hover:text-slate-700 transition-colors">
          Qui a consulté mes données ? (Journal Inviolable)
        </button>
      </div>

      @if (activeTab() === 'consents') {
        <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p class="text-sm text-slate-500 dark:text-slate-400">Aucun consentement actif accordé. Vos données individuelles restent totalement invisibles aux organismes d'État.</p>
        </div>
      } @else {
        <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Journal d'accès en lecture/écriture enregistré en temps réel. Cette table est historisée de façon inaltérable.</p>
          <div class="text-xs text-slate-400">Aucun accès enregistré à ce jour.</div>
        </div>
      }
    </div>
  `
})
export class ConsentCenterComponent {
  activeTab = signal<'consents' | 'audit'>('consents');
}
