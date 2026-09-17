import {  Component , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideMicroscope } from '@ng-icons/lucide';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-amb-diagnostics',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideMicroscope 
})],
  template: `
<div style="padding:32px">
  <h2 style="font-size:1.875rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:12px;margin-bottom:24px">
    <ng-icon name="lucideMicroscope" style="color:#10b981"></ng-icon> Diagnostics Terrain
  </h2>
  <div style="background:white;border-radius:16px;padding:40px;text-align:center;color:#94a3b8;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <ng-icon name="lucideMicroscope" style="font-size:48px;color:#cbd5e1;margin-bottom:16px"></ng-icon>
    <p>Interface de soumission de diagnostics disponible prochainement</p>
  </div>
</div>`,
})
export class AmbDiagnosticsComponent {}
