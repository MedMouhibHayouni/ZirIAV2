import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUsers, lucideMapPin, lucideMessageSquare, lucideX, lucideShield, lucideClock, lucideCheckCircle, lucideAlertCircle, lucideStar, lucideShieldAlert } from '@ng-icons/lucide';
import { FarmerApiService } from '../../../core/services/farmer-api.service';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../expert/shared/toast.service';
import { EXPERT_TYPE_IDENTITY } from '../../../layout/sidebar/sidebar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-mes-experts',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  providers: [provideIcons({
    lucideUsers, lucideMapPin, lucideMessageSquare, lucideX,
    lucideShield, lucideClock, lucideCheckCircle, lucideAlertCircle,
    lucideStar, lucideShieldAlert
  })],
  template: `
    <div class="mes-experts-page">
      <div class="page-header">
        <h1>Mes Experts</h1>
        <p class="subtitle">Vos experts agricoles et demandes en cours</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Chargement...</span>
        </div>
      } @else {
        <!-- CRDA Agent Pinned Card -->
        @if (crdaAgent(); as agent) {
          <div class="crda-pinned-card">
            <div class="crda-shield">
              <ng-icon name="lucideShieldAlert"></ng-icon>
            </div>
            <div class="crda-info">
              <span class="crda-label">Mon Agent CRDA</span>
              <span class="crda-name">{{ agent.name }}</span>
              <span class="crda-zone">{{ agent.region_name ? agent.region_name + ' — ' + agent.district_name : agent.expert_type }}</span>
            </div>
            <span class="crda-badge">Gratuit</span>
            <div class="crda-actions">
              <a [routerLink]="['/dashboard/expert/public-profile', agent.id]" class="btn-sm-outline">Profil</a>
              <a [routerLink]="['/dashboard/farmer/experts/messages']" [queryParams]="{expertId: agent.id, expertName: agent.name}" class="btn-sm-primary">Message</a>
            </div>
          </div>
        }

        @if (experts().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideUsers" class="empty-icon"></ng-icon>
            <h3>Aucun expert pour le moment</h3>
            <p>Trouvez des experts adaptés à vos besoins agricoles</p>
            <a routerLink="/dashboard/farmer/discover" class="btn-primary">Trouver un Expert</a>
          </div>
        } @else {
          <div class="expert-list">
            @for (expert of experts(); track expert.id) {
              <div class="expert-card" [class.pending]="expert.status === 'PENDING'"
                   [class.crda-expert]="expert.professional_status === 'CRDA_AGENT' && expert.status === 'ACCEPTED'">
                @if (expert.professional_status === 'CRDA_AGENT' && expert.status === 'ACCEPTED') {
                  <!-- Skip CRDA agent here since it's pinned at top -->
                } @else {
                  <div class="card-left">
                    <div class="avatar">
                      <div class="avatar-letter"
                           [style.background]="getExpertTypeColor(expert.expert_type)">{{ expert.name?.charAt(0) || 'E' }}</div>
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="card-header-row">
                      <h3>{{ expert.name }}</h3>
                      @if (expert.status === 'PENDING') {
                        <span class="status-badge pending">En attente</span>
                      } @else if (expert.status === 'REJECTED') {
                        <span class="status-badge rejected">Refusé</span>
                      } @else {
                        <span class="status-badge accepted">Accepté</span>
                      }
                    </div>
                    <div class="card-meta">
                      <span class="meta-type"
                            [style.color]="getExpertTypeColor(expert.expert_type)">{{ getExpertTypeLabel(expert.expert_type) }}</span>
                      <span class="meta-sep">•</span>
                      <span class="meta-gov">{{ getExpertLocation(expert) }}</span>
                    </div>
                    @if (expert.status === 'PENDING') {
                      <div class="pending-info">
                        <ng-icon name="lucideClock"></ng-icon>
                        <span>En attente de réponse de l'expert</span>
                      </div>
                      <button class="btn-cancel" (click)="cancelRequest(expert.id, expert.name)">
                        <ng-icon name="lucideX"></ng-icon> Annuler la demande
                      </button>
                    } @else if (expert.status === 'REJECTED') {
                      <div class="rejected-info">
                        <ng-icon name="lucideAlertCircle"></ng-icon>
                        <span>Demande refusée</span>
                      </div>
                    } @else {
                      <div class="accepted-info">
                        <ng-icon name="lucideCheckCircle"></ng-icon>
                        <span>Expert lié depuis {{ formatDate(expert.accepted_at) }}</span>
                      </div>
                      <div class="card-actions">
                        <a [routerLink]="['/dashboard/farmer/experts/messages']" [queryParams]="{expertId: expert.id, expertName: expert.name}" class="btn-action">
                          <ng-icon name="lucideMessageSquare"></ng-icon> Envoyer un message
                        </a>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .mes-experts-page { padding: 24px; max-width: 800px; margin: 0 auto; }

    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 4px; color: var(--text-primary); }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }

    /* CRDA pinned card */
    .crda-pinned-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
      border: 2px solid var(--zir-emerald);
      border-left: 5px solid var(--zir-emerald);
      border-radius: 16px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .crda-shield {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: var(--zir-emerald);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .crda-shield ng-icon { width: 24px; height: 24px; }

    .crda-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .crda-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--zir-emerald); }
    .crda-name { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .crda-zone { font-size: 0.8rem; color: var(--text-secondary); }

    .crda-badge {
      padding: 4px 12px;
      border-radius: 20px;
      background: var(--zir-emerald);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .crda-actions { display: flex; gap: 6px; }

    .btn-sm-primary, .btn-sm-outline {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
      font-family: inherit;
    }

    .btn-sm-primary { background: var(--zir-emerald); color: white; border: none; }
    .btn-sm-primary:hover { opacity: 0.9; }

    .btn-sm-outline { background: transparent; color: var(--text-secondary); border: 1px solid var(--zir-emerald-alpha-20); }
    .btn-sm-outline:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
      color: var(--text-muted);
    }

    .loading-state .spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--zir-emerald);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon { width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-state h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .empty-state p { color: var(--text-muted); font-size: 0.85rem; margin: 0 0 20px; }

    .btn-primary {
      padding: 10px 24px;
      background: var(--zir-emerald);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.15s;
    }

    .btn-primary:hover { opacity: 0.9; }

    /* Expert list */
    .expert-list { display: flex; flex-direction: column; gap: 12px; }

    .expert-card {
      display: flex;
      gap: 14px;
      padding: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      transition: all 0.15s;
    }

    .expert-card.pending {
      border: 1.5px dashed var(--zir-gold, #D4AF37);
      background: rgba(212, 175, 55, 0.03);
    }

    .avatar { flex-shrink: 0; }

    .avatar-letter {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--zir-emerald);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
    }

    .card-body { flex: 1; min-width: 0; }

    .card-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }

    .card-header-row h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary); }

    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .status-badge.pending { background: #fff8e1; color: #b8860b; }
    .status-badge.accepted { background: #e8f5e9; color: #2e7d32; }
    .status-badge.rejected { background: #fce4ec; color: #c62828; }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .pending-info, .accepted-info, .rejected-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      margin-bottom: 8px;
    }

    .pending-info { color: #b8860b; }
    .accepted-info { color: var(--zir-emerald); }
    .rejected-info { color: #c62828; }

    .pending-info ng-icon, .accepted-info ng-icon, .rejected-info ng-icon { width: 16px; height: 16px; }

    .btn-cancel {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border: 1px solid #ffcdd2;
      border-radius: 8px;
      background: #fff;
      color: #c62828;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .btn-cancel:hover { background: #ffebee; }
    .btn-cancel ng-icon { width: 14px; height: 14px; }

    .card-actions { margin-top: 4px; }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: var(--zir-emerald-alpha-10);
      color: var(--zir-emerald);
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.15s;
    }

    .btn-action:hover { background: var(--zir-emerald); color: white; }
    .btn-action ng-icon { width: 16px; height: 16px; }
  `]
})
export class FarmerMesExpertsComponent implements OnInit {
  private readonly farmerApi = inject(FarmerApiService);
  private readonly expertApi = inject(ExpertApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly experts = signal<any[]>([]);
  readonly crdaAgent = signal<any>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.farmerApi.getMyLinkedExperts().subscribe({
      next: (items: any[]) => {
        // Filter: separate CRDA agent from rest
        const acceptedCrda = items.find(
          (e: any) => e.professional_status === 'CRDA_AGENT' && e.status === 'ACCEPTED'
        );
        this.crdaAgent.set(acceptedCrda || null);
        this.experts.set(items.filter((e: any) => !(e.professional_status === 'CRDA_AGENT' && e.status === 'ACCEPTED')));
        this.loading.set(false);
      },
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

  getExpertTypeColor(type: string): string {
    return EXPERT_TYPE_IDENTITY[type]?.color ?? 'var(--zir-emerald)';
  }

  getExpertLocation(expert: any): string {
    if (expert.governorate_zones?.length) return expert.governorate_zones.join(', ');
    return expert.governorate || 'Tunisie';
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  }

  cancelRequest(expertId: string, expertName: string) {
    if (!confirm(`Annuler la demande de suivi à ${expertName} ?`)) return;
    this.farmerApi.cancelPendingExpertRequest(expertId).subscribe({
      next: () => {
        this.experts.set(this.experts().filter((e: any) => e.id !== expertId));
      },
      error: (err: any) => {
        this.toast.error('Erreur', err.error?.message || 'Erreur lors de l\'annulation');
      }
    });
  }
}
