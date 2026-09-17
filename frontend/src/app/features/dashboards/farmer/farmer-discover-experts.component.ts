import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideMapPin, lucideStar, lucideUsers, lucideMicroscope, lucideDroplets, lucideHeart, lucideSprout, lucideBriefcase, lucideTractor, lucideShieldAlert, lucideBuilding2, lucideGraduationCap, lucideGlobe, lucideX, lucideAlertCircle } from '@ng-icons/lucide';
import { FarmerApiService } from '../../../core/services/farmer-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../expert/shared/toast.service';
import { EXPERT_TYPE_IDENTITY } from '../../../layout/sidebar/sidebar.component';

const PROBLEM_CATEGORIES = [
  { id: 'cultures', label: 'J\'ai un problème sur mes cultures', icon: 'lucideMicroscope', description: 'Maladies, ravageurs, carences' },
  { id: 'irrigation', label: 'Mon système d\'irrigation ne fonctionne pas', icon: 'lucideDroplets', description: 'Pompes, réseaux, drainage' },
  { id: 'animaux', label: 'J\'ai un problème avec mes animaux', icon: 'lucideHeart', description: 'Santé animale, alimentation, reproduction' },
  { id: 'technicien', label: 'Je cherche un technicien de terrain', icon: 'lucideSprout', description: 'Conseil agronomique sur site' },
  { id: 'financier', label: 'J\'ai besoin d\'un conseil financier ou subvention', icon: 'lucideBriefcase', description: 'Bientôt disponible' },
  { id: 'materiel', label: 'Problème avec mon matériel', icon: 'lucideTractor', description: 'Bientôt disponible' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-discover-experts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideSearch, lucideMapPin, lucideStar, lucideUsers, lucideMicroscope,
    lucideDroplets, lucideHeart, lucideSprout, lucideBriefcase, lucideTractor,
    lucideShieldAlert, lucideBuilding2, lucideGraduationCap, lucideGlobe, lucideX, lucideAlertCircle
  })],
  template: `
    <div class="discovery-page">
      <div class="page-header">
        <h1>Trouver un Expert</h1>
        <p class="subtitle">Décrivez votre besoin pour trouver l'expert le plus adapté</p>
      </div>

      <!-- Problem Category Selector -->
      <div class="problem-grid">
        @for (cat of problemCategories; track cat.id) {
          <button class="problem-card" [class.selected]="selectedProblem() === cat.id"
                  [class.future]="cat.id === 'financier' || cat.id === 'materiel'"
                  (click)="selectProblem(cat.id)">
            <div class="problem-icon">
              <ng-icon [name]="cat.icon"></ng-icon>
            </div>
            <span class="problem-label">{{ cat.label }}</span>
            <span class="problem-desc">{{ cat.description }}</span>
            @if (cat.id === 'financier' || cat.id === 'materiel') {
              <span class="coming-soon">Bientôt disponible</span>
            }
          </button>
        }
      </div>

      <!-- Filter Pills (only when problem selected) -->
      @if (selectedProblem()) {
        <div class="filter-bar">
          <div class="type-pills">
            <button class="pill" [class.active]="filterType() === 'all'" (click)="filterType.set('all')">Tous</button>
            <button class="pill crda" [class.active]="filterType() === 'crda'" (click)="filterType.set('crda')">
              <ng-icon name="lucideShieldAlert"></ng-icon> CRDA
            </button>
            <button class="pill liberal" [class.active]="filterType() === 'liberal'" (click)="filterType.set('liberal')">
              <ng-icon name="lucideGlobe"></ng-icon> Libéral
            </button>
          </div>
        </div>
      }

      <!-- Results -->
      @if (selectedProblem() && !isFutureProblem()) {
        <div class="results-section">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Recherche des experts...</span>
            </div>
          } @else if (experts().length === 0 && !loading()) {
            <div class="empty-state">
              <ng-icon name="lucideAlertCircle" class="empty-icon"></ng-icon>
              <h3>Aucun expert trouvé</h3>
              <p>Essayez de modifier vos filtres ou d'élargir votre recherche</p>
            </div>
          } @else {
            <div class="expert-list">
              @for (expert of experts(); track expert.id) {
                <div class="expert-card" [class.crda-agent]="expert.professional_status === 'CRDA_AGENT'">
                  <div class="card-top">
                    <div class="card-avatar">
                      <div class="avatar-placeholder"
                           [style.background]="getExpertTypeColor(expert.expert_type).color">{{ expert.name?.charAt(0) || 'E' }}</div>
                      <div class="status-dot" [class.crda]="expert.professional_status === 'CRDA_AGENT'"
                           [class.liberal]="expert.professional_status === 'LIBERAL'">
                      </div>
                    </div>
                    <div class="card-info">
                      <h3>{{ expert.name }}</h3>
                      <div class="badge-row">
                        <span class="badge type-badge"
                              [style.background]="getExpertTypeColor(expert.expert_type).bg"
                              [style.color]="getExpertTypeColor(expert.expert_type).color">{{ getExpertTypeLabel(expert.expert_type) }}</span>
                        <span class="badge status-badge" [class.crda]="expert.professional_status === 'CRDA_AGENT'"
                              [class.liberal]="expert.professional_status === 'LIBERAL'"
                              [class.cabinet]="expert.professional_status === 'CABINET_PRIVE'"
                              [class.coop]="expert.professional_status === 'COOPERATIVE'">
                          {{ getStatusLabel(expert) }}
                        </span>
                      </div>
                    </div>
                    <div class="score-section">
                      <div class="score-bar">
                        <div class="score-fill" [style.width.%]="expert.relevance_score || 0"></div>
                      </div>
                      <span class="score-text">{{ expert.relevance_score || 0 }}%</span>
                    </div>
                  </div>

                  <div class="card-body">
                    <div class="meta-row">
                      <span class="meta-item">
                        <ng-icon name="lucideMapPin"></ng-icon>
                        {{ getExpertLocation(expert) }}
                      </span>
                      <span class="meta-item" *ngIf="expert.farmers_count !== undefined">
                        <ng-icon name="lucideUsers"></ng-icon>
                        {{ expert.farmers_count }} agriculteurs
                      </span>
                    </div>
                    <p class="bio-text">{{ expert.bio | slice:0:120 }}{{ expert.bio?.length > 120 ? '...' : '' }}</p>
                    <div class="rate-row">
                      <span class="rate" *ngIf="expert.professional_status === 'CRDA_AGENT'">
                        <strong>Gratuit</strong> — Service CRDA
                      </span>
                      <span class="rate" *ngIf="expert.professional_status !== 'CRDA_AGENT' && expert.consultation_rate_tnd">
                        <strong>{{ expert.consultation_rate_tnd }} TND</strong> / consultation
                      </span>
                      <span class="rate" *ngIf="!expert.consultation_rate_tnd && expert.professional_status !== 'CRDA_AGENT'">
                        Sur devis
                      </span>
                    </div>
                  </div>

                  <div class="card-actions">
                    <a [routerLink]="['/dashboard/expert/public-profile', expert.id]" class="btn-outline">
                      Voir le Profil
                    </a>
                    <button class="btn-primary" (click)="requestFollow(expert.id, expert.name)">
                      Demander un Suivi
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Future problem empty state -->
      @if (isFutureProblem()) {
        <div class="future-state">
          <ng-icon name="lucideBriefcase" class="future-icon"></ng-icon>
          <h3>Bientôt disponible</h3>
          <p>Ce service sera bientôt proposé sur ZirIA. Revenez prochainement.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .discovery-page { padding: 24px; max-width: 900px; margin: 0 auto; }

    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }

    /* Problem cards */
    .problem-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .problem-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
      background: var(--bg-card);
      border: 2px solid var(--border);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      color: var(--text-primary);
      font-family: inherit;
      position: relative;
    }

    .problem-card:hover { border-color: var(--zir-emerald-alpha-30); }
    .problem-card.selected { border-color: var(--zir-emerald); background: var(--zir-emerald-alpha-05); }
    .problem-card.future { opacity: 0.6; cursor: default; }
    .problem-card.future:hover { border-color: var(--border); }

    .problem-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--zir-emerald);
    }

    .problem-card.selected .problem-icon { background: var(--zir-emerald); color: white; border-color: var(--zir-emerald); }

    .problem-label { font-weight: 700; font-size: 0.85rem; }
    .problem-desc { font-size: 0.75rem; color: var(--text-muted); }
    .coming-soon { font-size: 0.7rem; font-weight: 700; color: var(--zir-gold, #D4AF37); }

    /* Filter pills */
    .filter-bar { margin-bottom: 20px; }

    .type-pills {
      display: flex;
      gap: 8px;
    }

    .pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .pill:hover { border-color: var(--text-muted); }
    .pill.active { background: var(--zir-emerald); color: white; border-color: var(--zir-emerald); }
    .pill.crda.active { background: #1a7a3a; border-color: #1a7a3a; }
    .pill.liberal.active { background: var(--zir-gold, #D4AF37); border-color: var(--zir-gold, #D4AF37); }
    .pill ng-icon { width: 16px; height: 16px; }

    /* Results */
    .results-section { animation: fadeIn 0.25s ease; }

    .loading-state, .empty-state, .future-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-icon, .future-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .future-icon { color: var(--zir-gold, #D4AF37); }

    .loading-state .spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--zir-emerald);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* Expert cards */
    .expert-list { display: flex; flex-direction: column; gap: 16px; }

    .expert-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.15s;
    }

    .expert-card:hover { border-color: var(--zir-emerald-alpha-20); box-shadow: var(--shadow-md); }
    .expert-card.crda-agent { border-left: 4px solid var(--zir-emerald); }

    .card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px; }

    .card-avatar { position: relative; flex-shrink: 0; }

    .avatar-placeholder {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: var(--zir-emerald);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
    }

    .status-dot {
      position: absolute;
      bottom: 0; right: 0;
      width: 12px; height: 12px;
      border-radius: 50%;
      border: 2px solid var(--bg-card);
    }

    .status-dot.crda { background: var(--zir-emerald); }
    .status-dot.liberal { background: var(--zir-gold, #D4AF37); }

    .card-info { flex: 1; min-width: 0; }
    .card-info h3 { font-size: 1rem; font-weight: 700; margin: 0 0 4px; color: var(--text-primary); }

    .badge-row { display: flex; gap: 6px; flex-wrap: wrap; }

    .badge {
      font-size: 0.7rem; font-weight: 700;
      padding: 2px 8px; border-radius: 6px;
    }

    .type-badge { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }

    .status-badge.crda { background: #e8f5e9; color: #1a7a3a; }
    .status-badge.liberal { background: #fff8e1; color: #b8860b; }
    .status-badge.cabinet { background: #e3f2fd; color: #0d47a1; }
    .status-badge.coop { background: #f3e5f5; color: #7b1fa2; }

    .score-section { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .score-bar {
      width: 60px; height: 6px;
      background: var(--bg-primary);
      border-radius: 3px;
      overflow: hidden;
    }

    .score-fill { height: 100%; background: var(--zir-emerald); border-radius: 3px; transition: width 0.3s; }

    .score-text { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }

    .card-body { margin-bottom: 14px; }

    .meta-row { display: flex; gap: 16px; margin-bottom: 6px; }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .meta-item ng-icon { width: 14px; height: 14px; }

    .bio-text { font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

    .rate-row { margin-top: 8px; }

    .rate { font-size: 0.82rem; color: var(--text-secondary); }
    .rate strong { color: var(--zir-emerald); }

    .card-actions { display: flex; gap: 10px; }

    .btn-primary, .btn-outline {
      flex: 1;
      padding: 10px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.82rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--zir-emerald);
      color: white;
      border: none;
    }

    .btn-primary:hover { opacity: 0.9; }

    .btn-outline {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .btn-outline:hover { border-color: var(--text-muted); color: var(--text-primary); }

    @media (max-width: 600px) {
      .discovery-page { padding: 16px; }
      .problem-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class FarmerDiscoverExpertsComponent {
  private readonly farmerApi = inject(FarmerApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly problemCategories = PROBLEM_CATEGORIES;
  readonly selectedProblem = signal<string>('');
  readonly filterType = signal<string>('all');
  readonly loading = signal(false);
  readonly experts = signal<any[]>([]);
  readonly user = computed(() => this.auth.currentUser());

  isFutureProblem() {
    return this.selectedProblem() === 'financier' || this.selectedProblem() === 'materiel';
  }

  selectProblem(problemId: string) {
    if (problemId === 'financier' || problemId === 'materiel') return;
    this.selectedProblem.set(problemId);
    this.searchExperts();
  }

  searchExperts() {
    if (!this.selectedProblem()) return;

    this.loading.set(true);
    const farmer = this.user();
    const params: any = {
      problem: this.selectedProblem(),
      type: this.filterType() !== 'all' ? this.filterType() : undefined,
    };

    const f = farmer as any;
    if (f?.lat && f?.lng) {
      params.lat = f.lat;
      params.lng = f.lng;
    }

    this.farmerApi.discoverExperts(params).subscribe({
      next: (results: any) => { this.experts.set(results); this.loading.set(false); },
      error: () => { this.experts.set([]); this.loading.set(false); },
    });
  }

  getExpertTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PHYTOPATHOLOGIST: 'Phytopathologiste',
      AGRONOMIST: 'Agronome',
      HYDRAULIC_ENGINEER: 'Hydraulicien',
      HYDROGEOLOGIST: 'Hydrogéologue',
      ZOOTECHNICIAN: 'Zootechnicien',
      VETERINARY_EPIDEMIOLOGIST: 'Vétérinaire'
    };
    return labels[type] || type;
  }

  getExpertTypeColor(type: string): { color: string; bg: string } {
    const id = EXPERT_TYPE_IDENTITY[type];
    return id ? { color: id.color, bg: id.bg } : { color: 'var(--zir-emerald)', bg: 'var(--zir-emerald-alpha-10)' };
  }

  getStatusLabel(expert: any): string {
    switch (expert.professional_status) {
      case 'CRDA_AGENT': return 'Agent CRDA';
      case 'LIBERAL': return 'Libéral';
      case 'CABINET_PRIVE': return expert.affiliation_name || 'Cabinet Privé';
      case 'COOPERATIVE': return expert.affiliation_name || 'Coopérative';
      case 'ENSEIGNANT_CHERCHEUR': return expert.institution_name || 'Chercheur';
      default: return 'Expert';
    }
  }

  getExpertLocation(expert: any): string {
    if (expert.governorate_zones?.length) {
      return expert.governorate_zones.join(', ');
    }
    return expert.governorate || 'Tunisie';
  }

  requestFollow(expertId: string, expertName: string) {
    this.farmerApi.requestExpertLink(expertId).subscribe({
      next: () => {
        this.toast.success('Demande envoyée', `Demande de suivi envoyée à ${expertName}`);
      },
      error: (err: any) => {
        this.toast.error('Erreur', err.error?.message || 'Erreur lors de la demande');
      }
    });
  }
}
