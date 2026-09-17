import {  Component, inject , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideHome, lucideScanLine, lucideUserCircle2 } from '@ng-icons/lucide';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pwa-mobile-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NgIconComponent],
  providers: [provideIcons({ lucideHome, lucideScanLine, lucideUserCircle2 
})],
  templateUrl: './pwa-mobile-layout.component.html',
  styleUrl: './pwa-mobile-layout.component.scss'
})
export class PwaMobileLayoutComponent {
  theme  = inject(ThemeService);
  auth   = inject(AuthService);

  get userName() { return this.auth.currentUser()?.name ?? 'Agriculteur'; }
}
