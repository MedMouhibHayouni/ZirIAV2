import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSprout, lucideMilk, lucideLeafyGreen } from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { AuthStore } from '../../../core/state/auth.store';

interface ActivityCard {
  id: 'CROP' | 'LIVESTOCK' | 'MIXED';
  label: string;
  labelAr: string;
  description: string;
  icon: string;
  emoji: string;
  gradient: string;
  accentColor: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-activity-onboarding',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ lucideSprout, lucideMilk, lucideLeafyGreen })],
  template: `
    <div class="onboarding-root">
      <!-- Background decoration -->
      <div class="bg-orb bg-orb--1"></div>
      <div class="bg-orb bg-orb--2"></div>
      <div class="bg-orb bg-orb--3"></div>

      <div class="onboarding-card">
        <!-- Header -->
        <div class="header">
          <div class="logo-ring">
            <span class="logo-emoji">🌿</span>
          </div>
          <h1 class="title">Bienvenue sur ZirIA</h1>
          <p class="subtitle">
            Dites-nous quelle est votre activité principale pour personnaliser votre tableau de bord
          </p>
        </div>

        <!-- Activity Cards -->
        <div class="cards-grid">
          @for (card of activities; track card.id) {
            <button
              class="activity-card"
              [class.selected]="selected() === card.id"
              [style.--card-accent]="card.accentColor"
              [attr.id]="'activity-btn-' + card.id.toLowerCase()"
              (click)="select(card.id)"
            >
              <div class="card-glow" [style.background]="card.gradient"></div>
              <div class="card-inner">
                <div class="card-emoji">{{ card.emoji }}</div>
                <div class="card-icon-ring">
                  <ng-icon [name]="card.icon" [size]="'22'" />
                </div>
                <h3 class="card-label">{{ card.label }}</h3>
                <p class="card-label-ar">{{ card.labelAr }}</p>
                <p class="card-desc">{{ card.description }}</p>
                <div class="card-check" [class.visible]="selected() === card.id">
                  <span>✓</span>
                </div>
              </div>
            </button>
          }
        </div>

        <!-- Error -->
        @if (error()) {
          <p class="error-msg">{{ error() }}</p>
        }

        <!-- CTA -->
        <button
          id="btn-confirm-activity"
          class="cta-btn"
          [class.loading]="loading()"
          [disabled]="loading() || !selected()"
          (click)="confirm()"
        >
          @if (loading()) {
            <span class="spinner"></span>
            <span>Enregistrement...</span>
          } @else {
            <span>Confirmer et accéder au tableau de bord</span>
            <span class="cta-arrow">→</span>
          }
        </button>

        <p class="skip-note">
          Vous pourrez modifier cela dans vos paramètres de profil à tout moment
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .onboarding-root {
      min-height: 100vh;
      background: #0a0f0d;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* Ambient orbs */
    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }
    .bg-orb--1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(45,106,79,0.35) 0%, transparent 70%);
      top: -100px; left: -100px;
    }
    .bg-orb--2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(64,145,108,0.25) 0%, transparent 70%);
      bottom: -80px; right: -80px;
    }
    .bg-orb--3 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
      top: 40%; left: 60%;
    }

    /* Main card */
    .onboarding-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 760px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 48px 40px 40px;
      backdrop-filter: blur(20px);
      box-shadow: 0 24px 80px rgba(0,0,0,0.5);
    }

    /* Header */
    .header { text-align: center; margin-bottom: 40px; }

    .logo-ring {
      width: 72px; height: 72px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #2D6A4F, #40916C);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 8px rgba(45,106,79,0.15), 0 8px 24px rgba(45,106,79,0.3);
    }
    .logo-emoji { font-size: 32px; }

    .title {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #f0fdf4;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 15px;
      color: rgba(255,255,255,0.55);
      margin: 0;
      line-height: 1.6;
    }

    /* Cards grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .activity-card {
      position: relative;
      background: rgba(255,255,255,0.05);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      padding: 0;
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
      text-align: center;
    }
    .activity-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255,255,255,0.18);
      box-shadow: 0 12px 32px rgba(0,0,0,0.3);
    }
    .activity-card.selected {
      border-color: var(--card-accent);
      box-shadow: 0 0 0 1px var(--card-accent), 0 12px 40px rgba(0,0,0,0.4);
      transform: translateY(-4px);
    }

    .card-glow {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .activity-card.selected .card-glow { opacity: 0.08; }

    .card-inner {
      position: relative;
      padding: 28px 20px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .card-emoji { font-size: 36px; line-height: 1; }

    .card-icon-ring {
      width: 44px; height: 44px;
      background: rgba(255,255,255,0.07);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: var(--card-accent);
      transition: background 0.2s;
    }
    .activity-card.selected .card-icon-ring { background: rgba(255,255,255,0.12); }

    .card-label {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #f0fdf4;
      margin: 0;
    }
    .card-label-ar {
      font-size: 13px;
      color: rgba(255,255,255,0.4);
      margin: 0;
      direction: rtl;
    }
    .card-desc {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      margin: 0;
      line-height: 1.5;
    }

    .card-check {
      width: 24px; height: 24px;
      background: var(--card-accent);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 0.2s, transform 0.2s;
      margin-top: 4px;
    }
    .card-check.visible { opacity: 1; transform: scale(1); }

    /* Error */
    .error-msg {
      text-align: center;
      color: #f87171;
      font-size: 13px;
      margin: 0 0 12px;
    }

    /* CTA */
    .cta-btn {
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, #2D6A4F, #40916C);
      border: none;
      border-radius: 14px;
      color: #fff;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 20px rgba(45,106,79,0.4);
    }
    .cta-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(45,106,79,0.5);
    }
    .cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .cta-btn.loading { opacity: 0.8; }
    .cta-arrow { font-size: 18px; }

    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .skip-note {
      text-align: center;
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      margin: 16px 0 0;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .onboarding-card { padding: 32px 20px; }
      .cards-grid { grid-template-columns: 1fr; }
      .title { font-size: 22px; }
    }
  `]
})
export class FarmerActivityOnboardingComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  selected = signal<'CROP' | 'LIVESTOCK' | 'MIXED' | null>(null);
  loading = signal(false);
  error = signal('');

  activities: ActivityCard[] = [
    {
      id: 'CROP',
      label: 'Cultures végétales',
      labelAr: 'الزراعة النباتية',
      description: 'Céréales, maraîchage, arboriculture, olivier, vigne...',
      icon: 'lucideSprout',
      emoji: '🌾',
      gradient: 'linear-gradient(135deg, #2D6A4F, #52B788)',
      accentColor: '#40916C'
    },
    {
      id: 'LIVESTOCK',
      label: 'Élevage animal',
      labelAr: 'تربية الماشية',
      description: 'Bovins, ovins, caprins, volaille, apiculture...',
      icon: 'lucideMilk',
      emoji: '🐄',
      gradient: 'linear-gradient(135deg, #92400E, #D97706)',
      accentColor: '#D97706'
    },
    {
      id: 'MIXED',
      label: 'Activité mixte',
      labelAr: 'نشاط مختلط',
      description: 'Combinaison de cultures et d\'élevage sur votre exploitation',
      icon: 'lucideLeafyGreen',
      emoji: '🌿',
      gradient: 'linear-gradient(135deg, #312E81, #6D28D9)',
      accentColor: '#8B5CF6'
    }
  ];

  select(id: 'CROP' | 'LIVESTOCK' | 'MIXED') {
    this.selected.set(id);
    this.error.set('');
  }

  confirm() {
    if (!this.selected()) {
      this.error.set('Veuillez sélectionner votre type d\'activité.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || '';

    this.http.patch(
      `${environment.apiUrl}/users/me/activity-type`,
      { activity_type: this.selected() },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        // Update local store immediately so sidebar shows correct MIXED/CROP/LIVESTOCK without refresh
        this.authStore.updateUser({ activity_type: this.selected() as any });
        this.loading.set(false);
        this.router.navigate(['/dashboard/farmer/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erreur lors de l\'enregistrement.');
      }
    });
  }
}
