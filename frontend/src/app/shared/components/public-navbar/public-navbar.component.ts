import { Component, input, inject, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideLeaf, lucideMenu, lucideX, lucideUser, lucideSparkles } from '@ng-icons/lucide';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  providers: [provideIcons({ lucideLeaf, lucideMenu, lucideX, lucideUser, lucideSparkles })],
  template: `
    <header class="public-navbar" [class.scrolled]="showScrollEffect() && navScrolled()">
      <div class="public-navbar__container">

        <a routerLink="/" class="public-navbar__logo" (click)="closeMobileMenu()">
          <img src="assets/ziria-logo-main.png" alt="ZirIA" class="public-navbar__logo-img" />
          @if (showScrollEffect()) {
            <span class="public-navbar__logo-badge">
              <ng-icon name="lucideLeaf" size="10"></ng-icon>
              AgriTech
            </span>
          }
        </a>

        <nav class="public-navbar__links">
          <a routerLink="/marketplace" routerLinkActive="active" class="public-navbar__link">Marketplace</a>
          <a routerLink="/know-my-plant" routerLinkActive="active" class="public-navbar__link">
            <ng-icon name="lucideSparkles" size="13"></ng-icon>
            Identifier Plante
          </a>
          @if (scrollToFeatures()) {
            <button (click)="scrollToFeatures()!(); closeMobileMenu()" class="public-navbar__link">Fonctionnalités</button>
          } @else {
            <a routerLink="/" fragment="features" routerLinkActive="active" class="public-navbar__link">Fonctionnalités</a>
          }
          @if (scrollToPricing()) {
            <button (click)="scrollToPricing()!(); closeMobileMenu()" class="public-navbar__link">Tarifs</button>
          } @else {
            <a routerLink="/" fragment="pricing" routerLinkActive="active" class="public-navbar__link">Tarifs</a>
          }
        </nav>

        <div class="public-navbar__actions">
          @if (!auth.isAuthenticated()) {
            <a routerLink="/login" class="public-navbar__btn-login">Connexion</a>
            <a routerLink="/register" class="public-navbar__btn-register">S'inscrire</a>
          } @else {
            <a [routerLink]="auth.dashboardRoute()" class="public-navbar__btn-profile">
              <ng-icon name="lucideUser" class="profile-icon"></ng-icon>
              <span class="profile-name">{{ auth.currentUser()?.name }}</span>
            </a>
          }
          <button class="public-navbar__toggle" (click)="toggleMobileMenu()" aria-label="Menu">
            <ng-icon [name]="mobileMenuOpen() ? 'lucideX' : 'lucideMenu'" size="20"></ng-icon>
          </button>
        </div>
      </div>

      @if (mobileMenuOpen()) {
        <div class="public-navbar__mobile-panel">
          <div class="public-navbar__mobile-header">
            <img src="assets/ziria-logo-main.png" alt="ZirIA" class="public-navbar__mobile-logo" />
          </div>

          <div class="public-navbar__mobile-nav">
            <div class="public-navbar__mobile-section-label">Navigation</div>
            <a routerLink="/marketplace" routerLinkActive="active" (click)="closeMobileMenu()" class="public-navbar__mobile-link">Marketplace</a>
            <a routerLink="/know-my-plant" routerLinkActive="active" (click)="closeMobileMenu()" class="public-navbar__mobile-link public-navbar__mobile-link--accent">
              <ng-icon name="lucideSparkles" size="14"></ng-icon>
              Identifier Plante
            </a>
            @if (scrollToFeatures()) {
              <button (click)="scrollToFeatures()!(); closeMobileMenu()" class="public-navbar__mobile-link">Fonctionnalités</button>
            } @else {
              <a routerLink="/" fragment="features" (click)="closeMobileMenu()" class="public-navbar__mobile-link">Fonctionnalités</a>
            }
            @if (scrollToPricing()) {
              <button (click)="scrollToPricing()!(); closeMobileMenu()" class="public-navbar__mobile-link">Tarifs</button>
            } @else {
              <a routerLink="/" fragment="pricing" (click)="closeMobileMenu()" class="public-navbar__mobile-link">Tarifs</a>
            }
          </div>

          <div class="public-navbar__mobile-divider"></div>

          <div class="public-navbar__mobile-actions">
            <div class="public-navbar__mobile-section-label">{{ auth.isAuthenticated() ? 'Compte' : 'Accès' }}</div>
            @if (!auth.isAuthenticated()) {
              <a routerLink="/login" (click)="closeMobileMenu()" class="public-navbar__mobile-btn-login">Connexion</a>
              <a routerLink="/register" (click)="closeMobileMenu()" class="public-navbar__mobile-btn-register">S'inscrire</a>
            } @else {
              <a [routerLink]="auth.dashboardRoute()" (click)="closeMobileMenu()" class="public-navbar__mobile-btn-profile">
                <ng-icon name="lucideUser"></ng-icon>
                {{ auth.currentUser()?.name }}
              </a>
            }
          </div>
        </div>
      }
    </header>
  `,
})
export class PublicNavbarComponent {
  auth = inject(AuthService);

  showScrollEffect = input(false);
  scrollToFeatures = input<(() => void) | undefined>(undefined);
  scrollToPricing = input<(() => void) | undefined>(undefined);

  mobileMenuOpen = signal(false);
  navScrolled = signal(false);

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.showScrollEffect()) {
      this.navScrolled.set(window.scrollY > 40);
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
