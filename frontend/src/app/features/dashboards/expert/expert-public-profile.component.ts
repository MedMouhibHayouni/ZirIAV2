import {
  Component, ChangeDetectionStrategy, signal, inject, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideStar, lucideMapPin, lucideAward, lucideUsers, lucideCheckCircle,
  lucideBriefcase, lucideCalendar, lucideMicroscope, lucideArrowLeft,
  lucideSend, lucideEdit3, lucideX, lucideShield, lucideQuote
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { SlideInPanelComponent } from './shared/slide-in-panel.component';
import { ToastService } from './shared/toast.service';

const EXPERT_TYPE_LABELS: Record<string, string> = {
  PHYTOPATHOLOGIST: 'Phytopathologiste',
  AGRONOMIST: 'Agronome',
  HYDRAULIC_ENGINEER: 'Ingénieur Hydraulique',
  HYDROGEOLOGIST: 'Hydrogéologue',
  ZOOTECHNICIAN: 'Zootechnicien',
  VETERINARY_EPIDEMIOLOGIST: 'Épidémiologiste Vétérinaire',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-expert-public-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgIconComponent, RouterModule, DecimalPipe,
    SkeletonLoaderComponent, SlideInPanelComponent
  ],
  providers: [provideIcons({
    lucideStar, lucideMapPin, lucideAward, lucideUsers, lucideCheckCircle,
    lucideBriefcase, lucideCalendar, lucideMicroscope, lucideArrowLeft,
    lucideSend, lucideEdit3, lucideX, lucideShield, lucideQuote
  })],
  template: `
    <div class="profile-page">
      @if (loading()) {
        <div class="skeleton-page">
          <app-skeleton-loader width="100%" height="140px" borderRadius="20px"></app-skeleton-loader>
          <div class="skel-content">
            <div class="skel-col">
              <app-skeleton-loader width="100%" height="120px" borderRadius="16px"></app-skeleton-loader>
              <app-skeleton-loader width="100%" height="80px" borderRadius="16px"></app-skeleton-loader>
            </div>
            <div class="skel-col">
              <app-skeleton-loader width="100%" height="240px" borderRadius="16px"></app-skeleton-loader>
            </div>
          </div>
        </div>
      } @else if (!profile()) {
        <div class="error-state">
          <p>Profil introuvable ou non complété</p>
          <a routerLink=".." class="btn-back">← Retour</a>
        </div>
      } @else if (profile(); as p) {
        <div class="profile-wrap">

          <!-- Back -->
          <a class="back-link" (click)="history.back()" style="cursor:pointer">
            <ng-icon name="lucideArrowLeft"></ng-icon>
            Retour
          </a>

          <!-- Hero Card -->
          <div class="hero-card">
            <div class="hero-left">
              <div class="avatar-xl">
                {{ p.name?.charAt(0)?.toUpperCase() }}
                <!-- SVG Score Circle -->
                <svg class="score-ring" viewBox="0 0 80 80">
                  <circle class="score-bg" cx="40" cy="40" r="36" />
                  <circle class="score-fill" cx="40" cy="40" r="36"
                    [style.strokeDasharray]="scoreCircumference"
                    [style.strokeDashoffset]="scoreOffset()" />
                </svg>
              </div>
              <div class="hero-info">
                <h1 class="expert-name">{{ p.name }}</h1>
                <span class="expert-type-badge">{{ getTypeLabel(p.expert_type) }}</span>
                <div class="expert-gov" *ngIf="p.governorate_zones?.length">
                  <ng-icon name="lucideMapPin"></ng-icon>
                  {{ p.governorate_zones.join(' · ') }}
                </div>
              </div>
            </div>
            <div class="hero-stats">
              <div class="stat-block">
                <ng-icon name="lucideUsers" class="stat-icon"></ng-icon>
                <span class="stat-value">{{ p.farmers_count }}</span>
                <span class="stat-label">Agriculteurs</span>
              </div>
              <div class="stat-block">
                <ng-icon name="lucideCheckCircle" class="stat-icon"></ng-icon>
                <span class="stat-value">{{ p.total_validations }}</span>
                <span class="stat-label">Validations</span>
              </div>
              <div class="stat-block" *ngIf="p.avg_satisfaction">
                <ng-icon name="lucideStar" class="stat-icon gold"></ng-icon>
                <span class="stat-value">{{ p.avg_satisfaction | number:'1.1-1' }}</span>
                <span class="stat-label">Note moyenne</span>
              </div>
            </div>
            <button class="btn-edit-hero" (click)="openEditPanel()">
              <ng-icon name="lucideEdit3"></ng-icon>
            </button>
          </div>

          <div class="content-grid">
            <!-- Left column -->
            <div class="col-left">

              <!-- Bio -->
              @if (p.bio) {
                <div class="card">
                  <h2 class="card-title">À propos</h2>
                  <p class="bio-text">{{ p.bio }}</p>
                </div>
              }

              <!-- Certifications -->
              @if (p.certifications?.length) {
                <div class="card">
                  <h2 class="card-title">
                    <ng-icon name="lucideAward" class="title-icon"></ng-icon>
                    Certifications
                  </h2>
                  <div class="cert-list">
                    @for (cert of p.certifications; track cert) {
                      <div class="cert-item">
                        <ng-icon name="lucideCheckCircle" class="cert-check"></ng-icon>
                        {{ cert }}
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Member since -->
              <div class="card meta-card">
                <ng-icon name="lucideCalendar" class="meta-icon"></ng-icon>
                <span>Membre depuis {{ p.created_at | date:'MMMM yyyy' }}</span>
              </div>

              <!-- Farmer Reviews -->
              @if (reviews().length > 0) {
                <div class="card">
                  <h2 class="card-title">
                    <ng-icon name="lucideQuote" class="title-icon"></ng-icon>
                    Avis des Agriculteurs
                  </h2>
                  <div class="reviews-list">
                    @for (review of reviews(); track review.id) {
                      <div class="review-item">
                        <div class="review-header">
                          <div class="review-avatar">{{ review.farmer_name?.charAt(0) }}</div>
                          <div class="review-meta">
                            <span class="review-name">{{ review.farmer_name }}</span>
                            <div class="review-stars">
                              @for (star of [1,2,3,4,5]; track star) {
                                <ng-icon name="lucideStar" class="star-sm" [class.filled]="star <= review.rating"></ng-icon>
                              }
                            </div>
                          </div>
                          <span class="review-date">{{ review.created_at | date:'dd/MM/yy' }}</span>
                        </div>
                        <p class="review-text">{{ review.comment }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Right column -->
            <div class="col-right">

              <!-- Tarif & CTA -->
              <div class="cta-card">
                <div class="tarif-section">
                  <span class="tarif-label">Tarif consultation</span>
                  @if (p.consultation_rate_tnd) {
                    <span class="tarif-value">{{ p.consultation_rate_tnd | number:'1.2-2' }} TND</span>
                  } @else {
                    <span class="tarif-value muted">Sur devis</span>
                  }
                  @if (p.tarif_note) {
                    <p class="tarif-note">{{ p.tarif_note }}</p>
                  }
                </div>

                <!-- Request form -->
                @if (showForm()) {
                  <div class="request-form animate-in">
                    <select [(ngModel)]="requestType" class="form-select">
                      <option value="">Choisir le type de consultation</option>
                      <option value="PHYTOSANITARY">Phytosanitaire</option>
                      <option value="AGRONOMIC">Agronomique</option>
                      <option value="HYDRAULIC">Hydraulique</option>
                      <option value="ZOOTECHNICAL">Zootechnique</option>
                      <option value="EPIDEMIOLOGICAL">Épidémiologique</option>
                    </select>
                    <textarea [(ngModel)]="requestDesc" class="form-textarea"
                      rows="4" placeholder="Décrivez votre problème..."></textarea>
                    <div class="form-actions">
                      <button class="btn-cancel" (click)="showForm.set(false)">
                        Annuler
                      </button>
                      <button class="btn-send" (click)="sendRequest(p.id)" [disabled]="sending()">
                        @if (sending()) {
                          <ng-icon name="lucideLoader" class="spinning"></ng-icon>
                        } @else {
                          <ng-icon name="lucideSend"></ng-icon>
                        }
                        {{ sending() ? 'Envoi...' : 'Envoyer' }}
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="cta-buttons">
                    <button class="btn-consult" (click)="showForm.set(true)">
                      <ng-icon name="lucideSend"></ng-icon>
                      Demander une consultation
                    </button>
                    <button class="btn-link" (click)="requestLink(p.id)">
                      <ng-icon name="lucideUsers"></ng-icon>
                      Me connecter à cet expert
                    </button>
                  </div>
                }
              </div>

            </div>
          </div>
        </div>
      }
    </div>

    <!-- Edit Profile Slide-in Panel -->
    <app-slide-in-panel
      [isOpen]="editPanelOpen()"
      [width]="'480px'"
      [title]="'Modifier le Profil'"
      (close)="editPanelOpen.set(false)"
    >
      <div class="edit-form">
        <div class="edit-group">
          <label class="edit-label">Bio / Description</label>
          <textarea class="edit-textarea" [(ngModel)]="editBio" rows="4"
                    placeholder="Décrivez votre expertise..."></textarea>
        </div>

        <div class="edit-group">
          <label class="edit-label">Gouvernorats d'intervention</label>
          <div class="chips-container">
            @for (gov of TUNISIAN_GOVERNORATES; track gov) {
              <button class="chip" [class.selected]="editGovernorates.includes(gov)"
                      (click)="toggleGovernorate(gov)">
                {{ gov }}
              </button>
            }
          </div>
        </div>

        <div class="edit-group">
          <label class="edit-label">Certifications</label>
          <div class="chips-container">
            @for (cert of AVAILABLE_CERTIFICATIONS; track cert) {
              <button class="chip cert-chip" [class.selected]="editCertifications.includes(cert)"
                      (click)="toggleCertification(cert)">
                <ng-icon name="lucideShield"></ng-icon>
                {{ cert }}
              </button>
            }
          </div>
        </div>

        <div class="edit-group">
          <label class="edit-label">Note tarifaire (TND)</label>
          <input type="number" class="edit-input" [(ngModel)]="editTarif" min="0" step="0.5" />
        </div>

        <div class="edit-group">
          <label class="edit-label">Note sur le tarif</label>
          <input type="text" class="edit-input" [(ngModel)]="editTarifNote"
                 placeholder="Ex: Prix dégressif pour les urgences..." />
        </div>

        <button class="btn-save-profile" (click)="saveProfile()" [disabled]="savingProfile()">
          @if (savingProfile()) {
            <ng-icon name="lucideLoader" class="spinning"></ng-icon>
          } @else {
            <ng-icon name="lucideCheck"></ng-icon>
          }
          Enregistrer les modifications
        </button>
      </div>
    </app-slide-in-panel>
  `,
  styles: [`
    .profile-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.9rem; text-decoration: none; margin-bottom: 20px; cursor: pointer; transition: color 0.2s; }
    .back-link:hover { color: var(--zir-emerald); }

    .hero-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 20px; padding: 28px; display: flex;
      justify-content: space-between; align-items: center; gap: 24px;
      margin-bottom: 24px; position: relative;
    }
    .hero-left { display: flex; align-items: center; gap: 20px; }
    .avatar-xl {
      width: 80px; height: 80px; border-radius: 50%;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 2rem; border: 2px solid var(--zir-emerald-alpha-20);
      flex-shrink: 0; position: relative;
    }
    .score-ring {
      position: absolute; inset: -4px;
      transform: rotate(-90deg);
    }
    .score-bg { fill: none; stroke: var(--border-color); stroke-width: 3; }
    .score-fill {
      fill: none; stroke: var(--zir-emerald); stroke-width: 3;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .expert-name { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
    .expert-type-badge { display: inline-block; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); padding: 4px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; }
    .expert-gov { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 0.9rem; }
    .hero-stats { display: flex; gap: 28px; flex-shrink: 0; }
    .stat-block { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .stat-icon { color: var(--zir-emerald); font-size: 1.3rem; }
    .stat-icon.gold { color: var(--warning); }
    .stat-value { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); }
    .stat-label { color: var(--text-secondary); font-size: 0.75rem; }

    .btn-edit-hero {
      position: absolute; top: 16px; right: 16px;
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-edit-hero:hover { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border-color: var(--zir-emerald-alpha-20); }

    .content-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
    @media (max-width: 800px) { .content-grid { grid-template-columns: 1fr; } }
    .col-left, .col-right { display: flex; flex-direction: column; gap: 16px; }

    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; }
    .card-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .title-icon { font-size: 1rem; color: var(--zir-emerald); }
    .bio-text { color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; }
    .cert-list { display: flex; flex-direction: column; gap: 8px; }
    .cert-item { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.9rem; }
    .cert-check { color: var(--zir-emerald); font-size: 0.9rem; }
    .meta-card { display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.9rem; }
    .meta-icon { font-size: 1rem; color: var(--text-secondary); }

    /* Reviews */
    .reviews-list { display: flex; flex-direction: column; gap: 16px; }
    .review-item {
      padding: 14px; border-radius: 12px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
    }
    .review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .review-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
    }
    .review-meta { flex: 1; }
    .review-name { font-weight: 700; color: var(--text-primary); font-size: 0.85rem; display: block; }
    .review-stars { display: flex; gap: 2px; }
    .star-sm { font-size: 0.75rem; color: var(--border-color); }
    .star-sm.filled { color: var(--warning); fill: var(--warning); }
    .review-date { font-size: 0.72rem; color: var(--text-secondary); }
    .review-text { margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; }

    /* CTA Card */
    .cta-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 80px; }
    .tarif-section { padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
    .tarif-label { display: block; color: var(--text-secondary); font-size: 0.82rem; margin-bottom: 6px; }
    .tarif-value { font-size: 1.8rem; font-weight: 800; color: var(--zir-emerald); display: block; }
    .tarif-value.muted { color: var(--text-secondary); }
    .tarif-note { color: var(--text-secondary); font-size: 0.82rem; margin-top: 4px; }

    .cta-buttons { display: flex; flex-direction: column; gap: 10px; }
    .btn-consult {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; background: var(--zir-emerald); color: white;
      font-weight: 700; padding: 14px; border: none; border-radius: 12px;
      font-size: 0.95rem; cursor: pointer; transition: opacity 0.2s;
    }
    .btn-consult:hover { opacity: 0.88; }
    .btn-link {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; background: var(--bg-secondary); color: var(--text-secondary);
      font-weight: 600; padding: 12px; border: 1px solid var(--border-color);
      border-radius: 12px; font-size: 0.9rem; cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .btn-link:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }

    .request-form { display: flex; flex-direction: column; gap: 10px; }
    .animate-in { animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .form-select, .form-textarea { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-primary); font-size: 0.9rem; padding: 10px 14px; outline: none; width: 100%; box-sizing: border-box; }
    .form-textarea { resize: vertical; font-family: inherit; }
    .form-actions { display: flex; gap: 10px; }
    .btn-cancel {
      flex: 1; padding: 10px; border-radius: 10px;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      color: var(--text-secondary); font-weight: 600; cursor: pointer;
    }
    .btn-send { display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; background: var(--zir-emerald); color: white; font-weight: 700; padding: 10px; border: none; border-radius: 10px; font-size: 0.9rem; cursor: pointer; transition: opacity 0.2s; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Edit Panel */
    .edit-form { display: flex; flex-direction: column; gap: 20px; }
    .edit-group { display: flex; flex-direction: column; gap: 8px; }
    .edit-label { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .edit-input, .edit-textarea {
      width: 100%; padding: 12px 14px; border-radius: 10px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      color: var(--text-primary); font-size: 0.9rem; outline: none;
      box-sizing: border-box; transition: border-color 0.2s;
    }
    .edit-input:focus, .edit-textarea:focus { border-color: var(--zir-emerald); }
    .edit-textarea { resize: vertical; font-family: inherit; }
    .chips-container { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 6px 12px; border-radius: 20px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      color: var(--text-secondary); font-size: 0.8rem; cursor: pointer;
      transition: all 0.2s;
    }
    .chip:hover { border-color: var(--zir-emerald-alpha-20); }
    .chip.selected {
      background: var(--zir-emerald-alpha-10); border-color: var(--zir-emerald);
      color: var(--zir-emerald); font-weight: 600;
    }
    .cert-chip { display: flex; align-items: center; gap: 4px; }
    .btn-save-profile {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px; border-radius: 12px;
      background: var(--zir-emerald); color: white;
      font-weight: 700; font-size: 0.95rem; border: none;
      cursor: pointer; transition: opacity 0.2s;
    }
    .btn-save-profile:disabled { opacity: 0.5; cursor: not-allowed; }

    .skeleton-page { padding: 24px; }
    .skel-content { display: grid; grid-template-columns: 1fr 360px; gap: 20px; margin-top: 20px; }
    .skel-col { display: flex; flex-direction: column; gap: 14px; }

    .error-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
    .btn-back { display: inline-block; margin-top: 16px; color: var(--zir-emerald); text-decoration: none; }

    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ExpertPublicProfileComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly TUNISIAN_GOVERNORATES = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
    'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef',
    'Mahdia', 'Manouba', 'Médenine', 'Monastir', 'Nabeul',
    'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine',
    'Tozeur', 'Tunis', 'Zaghouan'
  ];

  readonly AVAILABLE_CERTIFICATIONS = [
    'Phytosanitaire', 'Agronomie', 'Hydraulique', 'Hydrogéologie',
    'Zootechnie', 'Épidémiologie Vétérinaire', 'Irrigation', 'Sols'
  ];

  readonly profile = signal<any>(null);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly sending = signal(false);
  readonly editPanelOpen = signal(false);
  readonly savingProfile = signal(false);
  readonly reviews = signal<any[]>([]);

  readonly scoreCircumference = 2 * Math.PI * 36;

  scoreOffset = () => {
    const rating = this.profile()?.avg_satisfaction || 0;
    const percentage = rating / 5;
    return this.scoreCircumference * (1 - percentage);
  };

  requestType = '';
  requestDesc = '';

  editBio = '';
  editGovernorates: string[] = [];
  editCertifications: string[] = [];
  editTarif = 0;
  editTarifNote = '';

  readonly history = window.history;

  ngOnInit() {
    const expertId = this.route.snapshot.paramMap.get('expertId');
    const isSelfView = !expertId;
    const targetId = expertId || this.auth.currentUser()?.id;
    if (!targetId) { this.loading.set(false); return; }

    const profileCall = isSelfView
      ? this.api.getMyProfile()
      : this.api.getPublicProfile(targetId);

    profileCall.subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
        this.cdr.markForCheck();
        // Load reviews if available
        if (p.reviews) this.reviews.set(p.reviews);
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  getTypeLabel(type: string): string {
    return EXPERT_TYPE_LABELS[type] || type;
  }

  openEditPanel() {
    const p = this.profile();
    if (!p) return;
    this.editBio = p.bio || '';
    this.editGovernorates = [...(p.governorate_zones || [])];
    this.editCertifications = [...(p.certifications || [])];
    this.editTarif = p.consultation_rate_tnd || 0;
    this.editTarifNote = p.tarif_note || '';
    this.editPanelOpen.set(true);
  }

  toggleGovernorate(gov: string) {
    const idx = this.editGovernorates.indexOf(gov);
    if (idx >= 0) {
      this.editGovernorates.splice(idx, 1);
    } else {
      this.editGovernorates.push(gov);
    }
  }

  toggleCertification(cert: string) {
    const idx = this.editCertifications.indexOf(cert);
    if (idx >= 0) {
      this.editCertifications.splice(idx, 1);
    } else {
      this.editCertifications.push(cert);
    }
  }

  saveProfile() {
    this.savingProfile.set(true);
    this.api.updateProfile({
      bio: this.editBio,
      governorate_zones: this.editGovernorates,
      certifications: this.editCertifications,
      consultation_rate_tnd: this.editTarif,
      tarif_note: this.editTarifNote
    }).subscribe({
      next: () => {
        this.profile.update(p => ({
          ...p,
          bio: this.editBio,
          governorate_zones: this.editGovernorates,
          certifications: this.editCertifications,
          consultation_rate_tnd: this.editTarif,
          tarif_note: this.editTarifNote
        }));
        this.editPanelOpen.set(false);
        this.savingProfile.set(false);
        this.toast.success('Profil mis à jour');
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingProfile.set(false);
        this.toast.error('Erreur lors de la mise à jour');
        this.cdr.markForCheck();
      }
    });
  }

  sendRequest(expertId: string) {
    if (!this.requestDesc.trim()) return;
    this.sending.set(true);
    this.api.createConsultation({
      expert_id: expertId,
      consultation_type: this.requestType || null,
      description: this.requestDesc
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.showForm.set(false);
        this.toast.success('Demande de consultation envoyée');
        this.cdr.markForCheck();
      },
      error: () => {
        this.sending.set(false);
        this.toast.error('Erreur lors de l\'envoi');
        this.cdr.markForCheck();
      }
    });
  }

  requestLink(expertId: string) {
    this.api.requestFarmerLink(expertId, 'Demande via profil public').subscribe({
      next: () => this.toast.success('Demande de suivi envoyée'),
      error: () => this.toast.error('Vous êtes déjà lié ou erreur')
    });
  }
}
