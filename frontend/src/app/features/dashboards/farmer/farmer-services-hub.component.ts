import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUsers, lucideTractor, lucideTruck, lucideBriefcase, lucideSnowflake } from '@ng-icons/lucide';
import { FarmerServicesLabourComponent } from './farmer-services-labour.component';
import { FarmerServicesEquipmentComponent } from './farmer-services-equipment.component';
import { FarmerServicesTransportComponent } from './farmer-services-transport.component';
import { FarmerServicesStorageComponent } from './farmer-services-storage.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    FarmerServicesLabourComponent,
    FarmerServicesEquipmentComponent,
    FarmerServicesTransportComponent,
    FarmerServicesStorageComponent
  ],
  providers: [provideIcons({ lucideUsers, lucideTractor, lucideTruck, lucideBriefcase, lucideSnowflake })],
  template: `
    <div class="services-page">
      <div class="services-header">
        <h2><ng-icon name="lucideBriefcase"></ng-icon> Services</h2>
      </div>
      <div class="services-tabs">
        <button class="st" [class.active]="tab() === 'labour'" (click)="tab.set('labour')">
          <ng-icon name="lucideUsers"></ng-icon>
          Main d'œuvre
        </button>
        <button class="st" [class.active]="tab() === 'equipment'" (click)="tab.set('equipment')">
          <ng-icon name="lucideTractor"></ng-icon>
          Matériel
        </button>
        <button class="st" [class.active]="tab() === 'transport'" (click)="tab.set('transport')">
          <ng-icon name="lucideTruck"></ng-icon>
          Transport
        </button>
        <button class="st" [class.active]="tab() === 'storage'" (click)="tab.set('storage')">
          <ng-icon name="lucideSnowflake"></ng-icon>
          Chambre Froide
        </button>
      </div>
      <div class="services-content">
        @if (tab() === 'labour') { <app-farmer-services-labour /> }
        @else if (tab() === 'equipment') { <app-farmer-services-equipment /> }
        @else if (tab() === 'transport') { <app-farmer-services-transport /> }
        @else if (tab() === 'storage') { <app-farmer-services-storage /> }
      </div>
    </div>
  `,
  styles: [`
    .services-page { display: flex; flex-direction: column; height: 100%; }
    .services-header { padding: 16px 20px 0; }
    .services-header h2 { font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .services-header ng-icon { width: 22px; height: 22px; color: var(--zir-emerald); }
    .services-tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: 10px; padding: 3px; margin: 12px 20px; flex-wrap: wrap; }
    .st { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; border: none; border-radius: 8px; background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: all 0.15s; min-width: 120px; }
    .st.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .st ng-icon { width: 16px; height: 16px; }
    .services-content { flex: 1; overflow: hidden; }
    .services-content > * { height: 100%; overflow-y: auto; }
  `]
})
export class FarmerServicesHubComponent {
  readonly tab = signal<'labour' | 'equipment' | 'transport' | 'storage'>('labour');
}
