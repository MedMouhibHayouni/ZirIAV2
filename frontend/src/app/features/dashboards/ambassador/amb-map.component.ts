import {  Component , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMap } from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-amb-map',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideMap 
})],
  template: `
<div style="padding:32px;height:calc(100vh - 130px);display:flex;flex-direction:column">
  <h2 style="font-size:1.875rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:12px;margin-bottom:24px">
    <ng-icon name="lucideMap" style="color:#10b981"></ng-icon> Carte de Zone
  </h2>
  <div style="flex:1;background:linear-gradient(135deg,#0d2818,#134a27);border-radius:16px;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 4px 20px rgba(0,0,0,0.15)">
    <div style="text-align:center">
      <ng-icon name="lucideMap" style="font-size:64px;color:#10b981;margin-bottom:16px;display:block"></ng-icon>
      <p style="font-size:1.25rem;font-weight:600;margin:0">Carte Leaflet de la Zone</p>
      <p style="color:rgba(255,255,255,0.6);margin-top:8px">Toutes les parcelles avec masquage de confidentialité</p>
    </div>
  </div>
</div>`,
})
export class AmbMapComponent {}
