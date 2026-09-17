import {  Component, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTruck, lucideMapPin, lucideNavigation, lucidePackage, lucideDollarSign, lucideCheck, lucideX } from '@ng-icons/lucide';

interface TransportMission {
  id: string;
  cargo: string;
  weight: number;
  origin: string;
  destination: string;
  estimated_gain: number;
  distance_km: number;
  status: 'PENDING' | 'ACCEPTED';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-driver-trips',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideTruck, lucideMapPin, lucideNavigation, lucidePackage, lucideDollarSign, lucideCheck, lucideX 
})],
  template: `
    <div class="space-y-6">
      <header class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">Hub Logistique</h1>
          <p class="text-slate-400">Gérez vos missions de transport et livraisons.</p>
        </div>
        <div class="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-bold text-green-400 uppercase tracking-widest">Disponible</span>
        </div>
      </header>

      <!-- Missions Feed -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div *ngFor="let mission of missions()" 
             class="glass-panel p-6 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all relative overflow-hidden group">
          
          <!-- Glass Background Accent -->
          <div class="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>

          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-white/5 rounded-2xl border border-white/10">
                <ng-icon name="lucidePackage" class="text-2xl text-blue-400"></ng-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white uppercase tracking-tight">{{ mission.cargo }}</h3>
                <p class="text-xs text-slate-400">{{ mission.weight }} Tonnes · {{ mission.distance_km }} km approx.</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500 uppercase font-bold">Gain Estimé</p>
              <p class="text-xl font-black text-green-400">{{ mission.estimated_gain }} TND</p>
            </div>
          </div>

          <!-- Route Visualization -->
          <div class="relative py-4 space-y-8">
            <div class="absolute left-3 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-white/10 ml-0.5"></div>
            
            <div class="flex items-start gap-4 relative z-10">
              <div class="p-1 bg-blue-500 rounded-full mt-1.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <div>
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">Chargement (Origine)</p>
                <p class="text-sm font-medium text-slate-200">{{ mission.origin }}</p>
              </div>
            </div>

            <div class="flex items-start gap-4 relative z-10">
              <div class="p-1 bg-red-500 rounded-full mt-1.5 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <div>
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">Livraison (Destination)</p>
                <p class="text-sm font-medium text-slate-200">{{ mission.destination }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-6">
            <button class="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-300 font-bold transition-all flex items-center justify-center gap-2 text-sm">
                <ng-icon name="lucideX"></ng-icon>
                <span>Décliner</span>
            </button>
            <button class="flex-[2] py-3 px-4 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/5">
                <ng-icon name="lucideCheck"></ng-icon>
                <span>Accepter la mission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DriverTripsComponent {
  missions = signal<TransportMission[]>([
    { id: 'TR-102', cargo: 'Tomates fraîches', weight: 4.5, origin: 'Ferme El-Amel, Béja', destination: 'Marché de Gros, Tunis', estimated_gain: 280, distance_km: 110, status: 'PENDING' },
    { id: 'TR-105', cargo: 'Semences de blé', weight: 12, origin: 'Silo COSEM, Mateur', destination: 'SMSA Jendouba', estimated_gain: 450, distance_km: 85, status: 'PENDING' },
    { id: 'TR-109', cargo: 'Agrumes', weight: 2.5, origin: 'Domaine Grombalia', destination: 'Entrepôt Sousse', estimated_gain: 150, distance_km: 65, status: 'PENDING' },
  ]);
}
