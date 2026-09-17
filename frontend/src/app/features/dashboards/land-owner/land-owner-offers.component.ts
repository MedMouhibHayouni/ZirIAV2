import {  Component, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideUser, lucideMapPin, lucideCalendar, lucideHandshake, lucideCheckCircle, lucideXCircle } from '@ng-icons/lucide';

interface LandOffer {
  id: string;
  land_name: string;
  applicant_name: string;
  duration_months: number;
  proposed_price: number;
  date: string;
  applicant_rating: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-land-owner-offers',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideFileText, lucideUser, lucideMapPin, lucideCalendar, lucideHandshake, lucideCheckCircle, lucideXCircle 
})],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-bold text-white">Demandes de Location</h1>
        <p class="text-slate-400">Pétitions entrantes pour l'exploitation de vos terres.</p>
      </header>

      <div class="space-y-4">
        <div *ngFor="let offer of offers()" 
             class="glass-panel p-6 rounded-3xl border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col md:flex-row items-center gap-6">
          
          <div class="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
             <ng-icon name="lucideHandshake" class="text-3xl"></ng-icon>
          </div>

          <div class="flex-1 space-y-2 text-center md:text-left">
            <h3 class="text-base font-bold text-white mb-1">
              {{ offer.applicant_name }} <span class="text-xs text-slate-500 font-normal">veut louer</span> {{ offer.land_name }}
            </h3>
            <div class="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-400 lowercase">
               <span class="flex items-center gap-1"><ng-icon name="lucideCalendar" class="text-indigo-500"></ng-icon> {{ offer.duration_months }} mois</span>
               <span class="flex items-center gap-1 font-bold text-green-400"><ng-icon name="lucideFileText"></ng-icon> {{ offer.proposed_price }} TND</span>
               <span class="flex items-center gap-1"><ng-icon name="lucideUser" class="text-yellow-500"></ng-icon> Score IA: {{ offer.applicant_rating }}/5</span>
            </div>
            <p class="text-[10px] text-slate-600 uppercase tracking-widest pt-1">Reçu le {{ offer.date }}</p>
          </div>

          <div class="flex gap-2 w-full md:w-auto">
             <button class="flex-1 md:flex-none px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <ng-icon name="lucideXCircle" class="text-lg"></ng-icon>
             </button>
             <button class="flex-1 md:flex-none px-6 py-3 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30 font-bold transition-all flex items-center gap-2">
                <ng-icon name="lucideCheckCircle" class="text-lg"></ng-icon>
                Accepter
             </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LandOwnerOffersComponent {
  offers = signal<LandOffer[]>([
    { id: 'O-1', land_name: 'Plaine du Kef A1', applicant_name: 'Sami Gharbi (SMSA)', duration_months: 12, proposed_price: 4800, date: 'Hier', applicant_rating: 4.5 },
    { id: 'O-2', land_name: 'Parcelle Béja Nord', applicant_name: 'Youssef AgriService', duration_months: 6, proposed_price: 3500, date: '21 Avr', applicant_rating: 4.1 },
  ]);
}
