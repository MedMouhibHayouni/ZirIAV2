import {
  Component, OnInit, inject, input, output, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideStar, lucideX, lucideSend, lucideThumbsUp, lucideAlertTriangle,
  lucideTimer, lucideSparkles, lucideCheckSquare, lucideUser, lucideZap,
  lucideShield, lucideClock, lucideMessageSquare, lucideLoader,
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

interface BadgeDef {
  code: string;
  label_fr: string;
  positive: boolean;
}

@Component({
  selector: 'app-mission-evaluation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideStar, lucideX, lucideSend, lucideThumbsUp, lucideAlertTriangle,
    lucideTimer, lucideSparkles, lucideCheckSquare, lucideUser, lucideZap,
    lucideShield, lucideClock, lucideMessageSquare, lucideLoader,
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="eval-shell">
      <div class="eval-header">
        <h3>Évaluation du travailleur</h3>
        <p>Cette évaluation est permanente et ne peut pas être modifiée après soumission.</p>
      </div>

      <!-- Step 1: Star Rating -->
      <div class="eval-step">
        <label>Note globale</label>
        <div class="star-input">
          @for (s of [1,2,3,4,5]; track s) {
            <button class="star-btn" (mouseenter)="hoveredStar.set(s)" (mouseleave)="hoveredStar.set(0)" (click)="selectedStar.set(s)">
              <ng-icon name="lucideStar" [class.filled]="s <= (hoveredStar() || selectedStar())" />
            </button>
          }
        </div>
        @if (selectedStar() > 0) {
          <span class="star-label">{{ starLabels[selectedStar()] }}</span>
        }
      </div>

      <!-- Step 2: Badge Grid -->
      <div class="eval-step">
        <label>Compétences observées</label>
        <div class="badge-section">
          <span class="badge-group-label">Positif</span>
          <div class="badge-grid">
            @for (badge of positiveBadges(); track badge.code) {
              <button class="badge-btn" [class.selected]="selectedBadges().includes(badge.code)" (click)="toggleBadge(badge.code)">
                <ng-icon [name]="badgeIcon(badge.code)" /> {{ badge.label_fr }}
              </button>
            }
          </div>
        </div>
        <div class="badge-section">
          <span class="badge-group-label">À améliorer</span>
          <div class="badge-grid">
            @for (badge of negativeBadges(); track badge.code) {
              <button class="badge-btn negative" [class.selected]="selectedBadges().includes(badge.code)" (click)="toggleBadge(badge.code)">
                <ng-icon [name]="badgeIcon(badge.code)" /> {{ badge.label_fr }}
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Step 3: Comment -->
      <div class="eval-step">
        <label>Commentaire (optionnel)</label>
        <textarea [(ngModel)]="comment" class="form-input" rows="3" maxlength="300" placeholder="Décrivez votre expérience avec ce travailleur..."></textarea>
        <span class="char-count">{{ comment().length }}/300</span>
      </div>

      <!-- Step 4: Visibility toggle -->
      <div class="eval-step">
        <label class="toggle-row">
          <input type="checkbox" [(ngModel)]="showName" />
          <span>Afficher votre nom dans l'historique du travailleur</span>
        </label>
      </div>

      <!-- Submit -->
      <div class="eval-actions">
        <button class="btn btn-outline" (click)="close.emit()">Annuler</button>
        <button class="btn btn-primary" (click)="submit()" [disabled]="selectedStar() === 0 || submitting()">
          @if (submitting()) { <ng-icon name="lucideLoader" class="spin" /> }
          @else { <ng-icon name="lucideSend" /> }
          {{ submitting() ? 'Soumission...' : 'Soumettre l\'évaluation' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .eval-shell { padding: 20px; }
    .eval-header { margin-bottom: 24px; }
    .eval-header h3 { margin: 0 0 4px; font-size: 18px; }
    .eval-header p { font-size: 13px; color: var(--text-secondary); margin: 0; }
    .eval-step { margin-bottom: 24px; }
    .eval-step > label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    .star-input { display: flex; gap: 4px; }
    .star-btn { border: none; background: none; cursor: pointer; padding: 4px; transition: transform .15s; }
    .star-btn:hover { transform: scale(1.15); }
    .star-btn ng-icon { width: 32px; height: 32px; color: var(--border); transition: color .15s; }
    .star-btn ng-icon.filled { color: var(--warning); }
    .star-label { display: block; margin-top: 4px; font-size: 13px; color: var(--text-secondary); }
    .badge-section { margin-bottom: 12px; }
    .badge-group-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
    .badge-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-card); font-size: 13px; cursor: pointer; transition: all .15s; color: var(--text-secondary); }
    .badge-btn.selected { background: var(--zir-emerald-alpha-10); border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .badge-btn.negative.selected { background: var(--danger-alpha); border-color: var(--danger); color: var(--danger); }
    .badge-btn ng-icon { width: 14px; height: 14px; }
    .form-input { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: 14px; box-sizing: border-box; resize: vertical; }
    .form-input:focus { outline: none; border-color: var(--zir-emerald); }
    .char-count { display: block; text-align: right; font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 400; font-size: 14px; }
    .toggle-row input { width: 16px; height: 16px; accent-color: var(--zir-emerald); }
    .eval-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; border: none; }
    .btn-primary { background: var(--zir-emerald); color: #fff; }
    .btn-primary:hover { opacity: .9; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-outline { background: none; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--bg-muted); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class MissionEvaluationFormComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  readonly contractId = input<string>('');
  readonly close = output<void>();
  readonly evaluated = output<void>();

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly badges = signal<BadgeDef[]>([]);
  readonly selectedStar = signal(0);
  readonly hoveredStar = signal(0);
  readonly selectedBadges = signal<string[]>([]);
  readonly comment = signal('');
  readonly showName = signal(true);

  readonly starLabels = ['', 'Médiocre', 'Insuffisant', 'Passable', 'Bon', 'Excellent'];

  readonly positiveBadges = computed(() => this.badges().filter(b => b.positive));
  readonly negativeBadges = computed(() => this.badges().filter(b => !b.positive));

  ngOnInit() {
    this.http.get<BadgeDef[]>(`${environment.apiUrl}/contracts/evaluation-badges`).subscribe({
      next: (b) => { this.badges.set(b); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  toggleBadge(code: string) {
    this.selectedBadges.update(list =>
      list.includes(code) ? list.filter(c => c !== code) : [...list, code]
    );
  }

  badgeIcon(code: string): string {
    const map: Record<string, string> = {
      PONCTUEL: 'lucideTimer', TRAVAIL_SOIGNE: 'lucideSparkles',
      RESPECTE_CONSIGNES: 'lucideCheckSquare', AUTONOME: 'lucideUser',
      BONNE_CADENCE: 'lucideZap', PREND_SOIN_MATERIEL: 'lucideShield',
      RECOMMANDE: 'lucideThumbsUp', RETARDS_FREQUENTS: 'lucideClock',
      TRAVAIL_BACLE: 'lucideAlertTriangle', MAUVAISE_COMMUNICATION: 'lucideMessageSquare',
    };
    return map[code] || 'lucideStar';
  }

  submit() {
    if (this.selectedStar() === 0) return;
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/contracts/${this.contractId()}/evaluate`, {
      rating: this.selectedStar(),
      badges: this.selectedBadges(),
      comment: this.comment(),
      worker_visible: this.showName(),
    }).subscribe({
      next: () => {
        this.evaluated.emit();
        this.submitting.set(false);
      },
      error: () => { this.submitting.set(false); this.cdr.markForCheck(); }
    });
  }
}
