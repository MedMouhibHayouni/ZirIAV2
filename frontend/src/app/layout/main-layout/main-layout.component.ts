import { Component, signal, ChangeDetectionStrategy, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastComponent } from '../../features/dashboards/expert/shared/toast.component';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { EXPERT_TYPE_IDENTITY } from '../sidebar/sidebar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  fullBleed = signal(false);
  navOpen   = signal(false);

  private authService = inject(AuthService);
  private platformId  = inject(PLATFORM_ID);

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.updateFullBleed();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateFullBleed();
      // Auto-close mobile nav on route change
      this.navOpen.set(false);
    });

    // Sprint 6: apply expert-type accent CSS variable platform-wide
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const user = this.authService.currentUser();
        const root = document.documentElement;
        if (user?.role === 'EXPERT' && user?.expert_type) {
          const id = EXPERT_TYPE_IDENTITY[user.expert_type];
          if (id) {
            root.style.setProperty('--expert-accent', id.color);
            root.style.setProperty('--expert-accent-bg', id.bg);
            root.setAttribute('data-expert-type', user.expert_type.toLowerCase());
            return;
          }
        }
        root.style.removeProperty('--expert-accent');
        root.style.removeProperty('--expert-accent-bg');
        root.removeAttribute('data-expert-type');
      });
    }
  }

  toggleNav() {
    this.navOpen.set(!this.navOpen());
  }

  closeNav() {
    this.navOpen.set(false);
  }

  private updateFullBleed() {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    const data = route?.snapshot?.data;
    this.fullBleed.set(!!data?.['fullBleed']);
  }
}
