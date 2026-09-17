import {  Component, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideDollarSign, lucideTrendingUp, lucideArrowUpRight, lucideCalendar, lucideActivity } from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-role-earnings',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideDollarSign, lucideTrendingUp, lucideArrowUpRight, lucideCalendar, lucideActivity 
})],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-bold text-white">Suivi des Revenus</h1>
        <p class="text-slate-400">Gérez votre portefeuille et vos gains financiers.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-600/10 to-transparent">
           <header class="flex justify-between items-start mb-4">
              <div class="p-2 bg-green-500/20 rounded-lg text-green-400"><ng-icon name="lucideDollarSign"></ng-icon></div>
              <span class="text-xs font-bold text-green-500 flex items-center gap-1">
                 <ng-icon name="lucideArrowUpRight"></ng-icon> +12.5%
              </span>
           </header>
           <p class="text-xs text-slate-500 uppercase font-black tracking-widest">Balance Actuelle</p>
           <h3 class="text-3xl font-black text-white mt-1">1,450.00 <span class="text-sm font-normal text-slate-400">TND</span></h3>
        </div>

        <div class="glass-panel p-6 rounded-2xl border border-white/10">
           <header class="mb-4">
              <div class="p-2 bg-blue-500/20 rounded-lg text-blue-400 w-fit"><ng-icon name="lucideCalendar"></ng-icon></div>
           </header>
           <p class="text-xs text-slate-500 uppercase font-black tracking-widest">Revenus ce mois</p>
           <h3 class="text-3xl font-black text-white mt-1">820.00 <span class="text-sm font-normal text-slate-400">TND</span></h3>
        </div>

        <div class="glass-panel p-6 rounded-2xl border border-white/10">
           <header class="mb-4">
              <div class="p-2 bg-purple-500/20 rounded-lg text-purple-400 w-fit"><ng-icon name="lucideActivity"></ng-icon></div>
           </header>
           <p class="text-xs text-slate-500 uppercase font-black tracking-widest">Missions payées</p>
           <h3 class="text-3xl font-black text-white mt-1">14</h3>
        </div>
      </div>

      <!-- Chart Mockup -->
      <div class="glass-panel p-8 rounded-3xl border border-white/10 h-80 relative overflow-hidden flex flex-col justify-end">
          <div class="absolute top-8 left-8 text-white font-bold">Historique de paiement</div>
          
          <div class="flex items-end gap-2 h-40">
             <div *ngFor="let v of [30, 50, 40, 80, 60, 95, 70, 85, 45, 90, 65, 80]" 
                  class="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-400/40 border-t border-blue-400/30 rounded-t-lg transition-all hover:to-blue-400"
                  [style.height.%]="v"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-600 pt-4 uppercase font-bold tracking-tighter">
             <span>Jan</span><span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Juin</span>
             <span>Juil</span><span>Août</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Déc</span>
          </div>
      </div>
    </div>
  `
})
export class RoleEarningsComponent {}
