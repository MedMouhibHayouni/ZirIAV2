import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideInbox, lucideClock, lucideCheckCircle, lucideXCircle,
  lucideAlertTriangle, lucideFileText, lucideDownload, lucideFlag,
  lucideTruck, lucideBriefcase, lucideWrench, lucideMessageSquare,
  lucideStar, lucideLoader2, lucideEye, lucideUser, lucideShield,
  lucideArrowRight, lucidePackageCheck, lucideRotateCcw, lucideMapPin,
  lucideClipboardCheck, lucidePen, lucidePlayCircle,
} from '@ng-icons/lucide';
import {
  ContractsApiService,
  MissionContract,
  ContractStatus
} from '../../../core/services/contracts-api.service';
import { AuthService, User } from '../../../core/services/auth.service';
import { MissionEvaluationFormComponent } from './mission-evaluation-form.component';

type InboxTab = 'NEGOTIATING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED_DISPUTED';

interface TabDef {
  key: InboxTab;
  label: string;
  statuses: ContractStatus[];
}

@Component({
  selector: 'zir-contract-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIconComponent, MissionEvaluationFormComponent],
  providers: [provideIcons({
    lucideInbox, lucideClock, lucideCheckCircle, lucideXCircle,
    lucideAlertTriangle, lucideFileText, lucideDownload, lucideFlag,
    lucideTruck, lucideBriefcase, lucideWrench, lucideMessageSquare,
    lucideStar, lucideLoader2, lucideEye, lucideUser, lucideShield,
    lucideArrowRight, lucidePackageCheck, lucideRotateCcw, lucideMapPin,
    lucideClipboardCheck, lucidePen, lucidePlayCircle,
  })],
  template: `
    <!-- Loading state -->
    @if (loading()) {
      <div class="inbox-loading">
        <ng-icon name="lucideLoader2" size="32" class="spin"></ng-icon>
        <span>Chargement des contrats…</span>
      </div>
    } @else {
      <div class="inbox">
        <!-- Header -->
        <div class="inbox__header">
          <div class="inbox__title-row">
            <ng-icon name="lucideInbox" size="22"></ng-icon>
            <h2>Mes Contrats</h2>
          </div>

          <!-- Tab bar -->
          <div class="inbox__tabs">
            @for (tab of tabs; track tab.key) {
              <button
                class="inbox__tab"
                [class.active]="activeTab() === tab.key"
                (click)="activeTab.set(tab.key)"
              >
                {{ tab.label }}
                <span class="inbox__tab-count">{{ countForTab(tab.key) }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Stats row -->
        <div class="inbox__stats">
          @for (tab of tabs; track tab.key) {
            <div class="stat-card" [class.active]="activeTab() === tab.key">
              <span class="stat-card__value">{{ countForTab(tab.key) }}</span>
              <span class="stat-card__label">{{ tab.label }}</span>
            </div>
          }
        </div>

        <!-- Contract list -->
        <div class="inbox__list">
          @for (contract of filteredContracts(); track contract.id) {
            <div
              class="contract-row"
              [class.contract-row--negotiating]="contract.status === 'NEGOTIATING'"
              [class.contract-row--active]="contract.status === 'ACCEPTED' || contract.status === 'IN_PROGRESS'"
              [class.contract-row--completed]="contract.status === 'COMPLETED'"
              [class.contract-row--cancelled]="contract.status === 'CANCELLED' || contract.status === 'DISPUTED'"
              (click)="navigateToContract(contract.id)"
            >
              <!-- Left: Avatar / Type Icon -->
              <div class="contract-row__icon" [class]="'type-' + contractTypeKey(contract.contract_type)">
                <ng-icon [name]="typeIcon(contract.contract_type)" size="20"></ng-icon>
              </div>

              <!-- Middle: Info -->
              <div class="contract-row__info">
                <div class="contract-row__top-line">
                  <span class="contract-row__type-badge">
                    {{ typeLabel(contract.contract_type) }}
                  </span>
                  <span class="contract-row__party">
                    <ng-icon name="lucideUser" size="12"></ng-icon>
                    {{ otherPartyName(contract) }}
                  </span>
                </div>
                <p class="contract-row__summary">{{ missionSummary(contract) }}</p>
                <div class="contract-row__meta">
                  <span class="contract-row__date">{{ contract.created_at | date:'dd MMM yyyy' }}</span>
                  @if (contract.duration_days) {
                    <span class="contract-row__duration">
                      <ng-icon name="lucideClock" size="11"></ng-icon>
                      {{ contract.duration_days }}j
                    </span>
                  }
                </div>
              </div>

              <!-- Right: Amount + Status + Actions -->
              <div class="contract-row__right">
                <div class="contract-row__amount">
                  {{ fmt(contract.total_amount_tnd) }} <em>TND</em>
                </div>
                <div class="contract-row__status" [class]="'status-' + statusKey(contract.status)">
                  <ng-icon [name]="statusIcon(contract.status)" size="11"></ng-icon>
                  {{ statusLabel(contract.status) }}
                </div>
                <div class="contract-row__actions" (click)="$event.stopPropagation()">
                  @for (action of quickActions(contract); track action.label) {
                    <button
                      class="action-btn"
                      [class]="'action-btn--' + action.variant"
                      (click)="action.handler()"
                      [disabled]="actionLoading() === contract.id"
                    >
                      <ng-icon [name]="action.icon" size="13"></ng-icon>
                      {{ action.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="inbox__empty">
              <ng-icon [name]="emptyIcon()" size="48" class="inbox__empty-icon"></ng-icon>
              <p class="inbox__empty-title">{{ emptyTitle() }}</p>
              <p class="inbox__empty-desc">{{ emptyDesc() }}</p>
            </div>
          }
        </div>
      </div>
    }

    <!-- Rating modal overlay -->
    @if (ratingModal()) {
      <div class="rating-overlay" (click)="ratingModal.set(null)">
        <div class="rating-modal" (click)="$event.stopPropagation()">
          <h3>Laisser un avis</h3>
          <div class="rating-modal__stars">
            @for (star of [1,2,3,4,5]; track star) {
              <button
                class="rating-star"
                [class.active]="star <= (ratingValue() || 0)"
                (click)="ratingValue.set(star)"
              >
                <ng-icon name="lucideStar" size="24"></ng-icon>
              </button>
            }
          </div>
          <textarea
            class="rating-modal__textarea"
            rows="3"
            placeholder="Commentaire optionnel…"
            (input)="ratingComment = $any($event.target).value"
          ></textarea>
          <div class="rating-modal__actions">
            <button class="action-btn action-btn--ghost" (click)="ratingModal.set(null)">Annuler</button>
            <button
              class="action-btn action-btn--primary"
              [disabled]="!ratingValue() || actionLoading() === ratingModal()"
              (click)="submitRating()"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Evaluation form modal -->
    @if (evaluatingContractId()) {
      <div class="rating-overlay" (click)="evaluatingContractId.set(null)">
        <div class="rating-modal" (click)="$event.stopPropagation()" style="width: 520px;">
          <app-mission-evaluation-form
            [contractId]="evaluatingContractId() ?? ''"
            (close)="evaluatingContractId.set(null)"
            (evaluated)="onEvaluated()" />
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Loading ── */
    .inbox-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding: 64px 16px; color: var(--text-muted, #64748b);
      font-size: 14px;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Inbox wrapper ── */
    .inbox {
      background: var(--bg-primary, #0f1117);
      border-radius: 16px;
      overflow: hidden;
    }

    /* ── Header ── */
    .inbox__header {
      padding: 20px 24px 0;
    }
    .inbox__title-row {
      display: flex; align-items: center; gap: 10px;
      color: var(--text-primary, #e2e8f0);
      font-size: 20px; font-weight: 700;
      margin-bottom: 16px;
    }

    /* ── Tab bar ── */
    .inbox__tabs {
      display: flex; gap: 4px;
      background: var(--bg-secondary, rgba(255,255,255,0.04));
      border-radius: 10px; padding: 4px;
    }
    .inbox__tab {
      display: flex; align-items: center; gap: 6px;
      flex: 1; justify-content: center;
      padding: 8px 12px;
      border: none; border-radius: 8px;
      background: transparent;
      color: var(--text-muted, #64748b);
      font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .inbox__tab.active {
      background: var(--bg-card, rgba(255,255,255,0.06));
      color: var(--text-primary, #e2e8f0);
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .inbox__tab:hover:not(.active) {
      color: var(--text-secondary, #94a3b8);
    }
    .inbox__tab-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      font-size: 10px; font-weight: 700;
      background: rgba(255,255,255,0.08);
    }
    .inbox__tab.active .inbox__tab-count {
      background: var(--zir-emerald-alpha-10, rgba(34,197,94,0.1));
      color: var(--zir-emerald, #22c55e);
    }

    /* ── Stats row ── */
    .inbox__stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
      padding: 16px 24px;
    }
    .stat-card {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 12px 8px;
      border-radius: 10px;
      background: var(--bg-secondary, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(255,255,255,0.06));
      transition: all 0.15s;
    }
    .stat-card.active {
      border-color: var(--zir-emerald, #22c55e);
      background: var(--zir-emerald-alpha-10, rgba(34,197,94,0.06));
    }
    .stat-card__value {
      font-size: 22px; font-weight: 800;
      color: var(--text-primary, #e2e8f0);
    }
    .stat-card.active .stat-card__value {
      color: var(--zir-emerald, #22c55e);
    }
    .stat-card__label {
      font-size: 10px; font-weight: 600;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* ── Contract list ── */
    .inbox__list {
      padding: 0 24px 24px;
      display: flex; flex-direction: column; gap: 8px;
    }

    /* ── Contract row ── */
    .contract-row {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px;
      border-radius: 12px;
      background: var(--bg-card, rgba(255,255,255,0.04));
      border: 1px solid var(--border, rgba(255,255,255,0.06));
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .contract-row:hover {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
    }
    .contract-row--negotiating { border-left: 3px solid rgba(245,158,11,0.6); }
    .contract-row--active      { border-left: 3px solid rgba(34,197,94,0.6); }
    .contract-row--completed   { border-left: 3px solid rgba(59,130,246,0.5); }
    .contract-row--cancelled   { border-left: 3px solid rgba(239,68,68,0.4); }

    /* Left icon */
    .contract-row__icon {
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      width: 44px; height: 44px;
      border-radius: 10px;
      color: #fff;
    }
    .type-TRANSPORT_MISSION, .type-TRANSPORT {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }
    .type-JOB_MISSION, .type-JOB {
      background: linear-gradient(135deg, #22c55e, #16a34a);
    }
    .type-EQUIPMENT_RENTAL {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    /* Info block */
    .contract-row__info {
      flex: 1; min-width: 0;
    }
    .contract-row__top-line {
      display: flex; align-items: center; gap: 10px;
      flex-wrap: wrap;
    }
    .contract-row__type-badge {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted, #64748b);
      background: rgba(255,255,255,0.06);
      padding: 2px 8px; border-radius: 4px;
    }
    .contract-row__party {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 600;
      color: var(--text-secondary, #94a3b8);
    }
    .contract-row__summary {
      margin: 6px 0 0;
      font-size: 13px; color: var(--text-muted, #64748b);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .contract-row__meta {
      display: flex; align-items: center; gap: 10px;
      margin-top: 6px;
      font-size: 11px; color: var(--text-muted, #64748b);
    }
    .contract-row__duration {
      display: flex; align-items: center; gap: 3px;
    }

    /* Right block */
    .contract-row__right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
      flex-shrink: 0; min-width: 150px;
    }
    .contract-row__amount {
      font-size: 16px; font-weight: 800;
      color: var(--text-primary, #e2e8f0);
    }
    .contract-row__amount em {
      font-size: 10px; font-style: normal;
      color: var(--text-muted, #64748b);
    }

    /* Status badge */
    .contract-row__status {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 3px 8px; border-radius: 999px;
      letter-spacing: 0.04em;
    }
    .status-NEGOTIATING, .status-NEGOCIATION, .status-EN_ATTENTE_SIGNATURE {
      background: var(--warning-alpha, rgba(245,158,11,0.1));
      color: #fbbf24;
    }
    .status-ACCEPTED, .status-IN_PROGRESS, .status-ACTIF, .status-EN_COURS {
      background: var(--zir-emerald-alpha-10, rgba(34,197,94,0.1));
      color: var(--zir-emerald, #4ade80);
    }
    .status-COMPLETED, .status-TERMINEE {
      background: rgba(59,130,246,0.12);
      color: #60a5fa;
    }
    .status-CANCELLED, .status-ANNULEE {
      background: rgba(107,114,128,0.12);
      color: #9ca3af;
    }
    .status-DISPUTED {
      background: rgba(239,68,68,0.12);
      color: #f87171;
    }

    /* Quick actions */
    .contract-row__actions {
      display: flex; gap: 6px; margin-top: 4px;
      flex-wrap: wrap; justify-content: flex-end;
    }

    /* ── Action buttons ── */
    .action-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 10px;
      border-radius: 6px;
      border: none; cursor: pointer;
      font-size: 11px; font-weight: 600;
      transition: opacity 0.15s, background 0.15s;
      white-space: nowrap;
    }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn:hover:not(:disabled) { opacity: 0.85; }

    .action-btn--primary {
      background: var(--zir-emerald, #22c55e);
      color: #fff;
    }
    .action-btn--secondary {
      background: rgba(255,255,255,0.08);
      color: var(--text-secondary, #94a3b8);
    }
    .action-btn--danger {
      background: rgba(239,68,68,0.12);
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.25);
    }
    .action-btn--ghost {
      background: transparent;
      color: var(--text-muted, #64748b);
    }
    .action-btn--accent {
      background: rgba(59,130,246,0.12);
      color: #60a5fa;
    }

    /* ── Empty state ── */
    .inbox__empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 24px; text-align: center;
    }
    .inbox__empty-icon {
      color: var(--text-muted, #64748b);
      opacity: 0.4;
      margin-bottom: 12px;
    }
    .inbox__empty-title {
      font-size: 16px; font-weight: 700;
      color: var(--text-secondary, #94a3b8);
      margin: 0 0 4px;
    }
    .inbox__empty-desc {
      font-size: 13px;
      color: var(--text-muted, #64748b);
      margin: 0; max-width: 300px;
    }

    /* ── Rating modal ── */
    .rating-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .rating-modal {
      background: var(--bg-primary, #1a1d27);
      border: 1px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 16px; padding: 28px;
      width: 340px; max-width: 90vw;
      display: flex; flex-direction: column; gap: 16px;
    }
    .rating-modal h3 {
      margin: 0; font-size: 18px; font-weight: 700;
      color: var(--text-primary, #e2e8f0);
    }
    .rating-modal__stars {
      display: flex; gap: 6px; justify-content: center;
    }
    .rating-star {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted, #64748b);
      transition: color 0.1s;
      padding: 2px;
    }
    .rating-star.active { color: #fbbf24; }
    .rating-star:hover { color: #f59e0b; }

    .rating-modal__textarea {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border, rgba(255,255,255,0.08));
      border-radius: 8px; padding: 10px;
      color: var(--text-primary, #e2e8f0);
      font-size: 13px; resize: vertical;
      font-family: inherit;
    }
    .rating-modal__textarea::placeholder {
      color: var(--text-muted, #64748b);
    }
    .rating-modal__textarea:focus {
      outline: none; border-color: var(--zir-emerald, #22c55e);
    }
    .rating-modal__actions {
      display: flex; gap: 8px; justify-content: flex-end;
    }
  `]
})
export class ContractInboxComponent implements OnInit {
  private readonly api = inject(ContractsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly tabs: TabDef[] = [
    { key: 'NEGOTIATING', label: 'En Négociation', statuses: ['NEGOTIATING', 'NEGOCIATION', 'EN_ATTENTE_SIGNATURE'] },
    { key: 'ACTIVE', label: 'Actifs', statuses: ['ACCEPTED', 'IN_PROGRESS', 'ACTIF', 'EN_COURS'] },
    { key: 'COMPLETED', label: 'Terminés', statuses: ['COMPLETED', 'TERMINEE'] },
    { key: 'CANCELLED_DISPUTED', label: 'Annulés/Disputés', statuses: ['CANCELLED', 'DISPUTED', 'ANNULEE'] },
  ];

  readonly loading = signal(true);
  readonly activeTab = signal<InboxTab>('NEGOTIATING');
  readonly contracts = signal<MissionContract[]>([]);
  readonly actionLoading = signal<string | null>(null);
  readonly ratingModal = signal<string | null>(null);
  readonly ratingValue = signal<number>(0);
  ratingComment = '';
  readonly evaluatingContractId = signal<string | null>(null);

  private readonly currentUser = this.auth.currentUser;

  readonly filteredContracts = computed(() => {
    const tab = this.activeTab();
    const def = this.tabs.find(t => t.key === tab);
    if (!def) return [];
    return this.contracts().filter(c => def.statuses.includes(c.status));
  });

  readonly countForTab = (key: InboxTab): number => {
    const def = this.tabs.find(t => t.key === key);
    if (!def) return 0;
    return this.contracts().filter(c => def.statuses.includes(c.status)).length;
  };

  readonly emptyTitle = computed(() => {
    const map: Record<InboxTab, string> = {
      NEGOTIATING: 'Aucun contrat en négociation',
      ACTIVE: 'Aucun contrat actif',
      COMPLETED: 'Aucun contrat terminé',
      CANCELLED_DISPUTED: 'Aucun contrat annulé ou en litige',
    };
    return map[this.activeTab()];
  });

  readonly emptyDesc = computed(() => {
    const map: Record<InboxTab, string> = {
      NEGOTIATING: 'Les propositions en attente de réponse apparaîtront ici.',
      ACTIVE: 'Vos contrats acceptés ou en cours seront affichés ici.',
      COMPLETED: 'Les contrats finalisés seront accessibles ici.',
      CANCELLED_DISPUTED: 'Les contrats annulés ou en litige seront listés ici.',
    };
    return map[this.activeTab()];
  });

  readonly emptyIcon = computed(() => {
    const map: Record<InboxTab, string> = {
      NEGOTIATING: 'lucideClock',
      ACTIVE: 'lucideCheckCircle',
      COMPLETED: 'lucideShield',
      CANCELLED_DISPUTED: 'lucideAlertTriangle',
    };
    return map[this.activeTab()];
  });

  ngOnInit(): void {
    this.api.getMyContracts().subscribe({
      next: (list) => { this.contracts.set(list); this.loading.set(false); },
      error: () => { this.contracts.set([]); this.loading.set(false); },
    });
  }

  navigateToContract(id: string): void {
    this.router.navigate(['/dashboard/contracts', id]);
  }

  statusKey(s: ContractStatus): string {
    return s.toLowerCase().replace(/_/g, '');
  }

  statusLabel(s: ContractStatus): string {
    const map: Record<string, string> = {
      NEGOTIATING: 'En négociation',
      ACCEPTED: 'Accepté',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      DISPUTED: 'En litige',
      CANCELLED: 'Annulé',
      DRAFT: 'Brouillon',
      OUVERTE: 'Ouverte',
      EN_ATTENTE: 'En attente',
      NEGOCIATION: 'En négociation',
      EN_ATTENTE_SIGNATURE: 'Signature en attente',
      ACTIF: 'Actif',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[s] ?? s;
  }

  statusIcon(s: ContractStatus): string {
    const map: Record<string, string> = {
      NEGOTIATING: 'lucideClock',
      ACCEPTED: 'lucideCheckCircle',
      IN_PROGRESS: 'lucideCheckCircle',
      COMPLETED: 'lucideShield',
      DISPUTED: 'lucideAlertTriangle',
      CANCELLED: 'lucideXCircle',
      DRAFT: 'lucideFileText',
      OUVERTE: 'lucideFileText',
      EN_ATTENTE: 'lucideClock',
      NEGOCIATION: 'lucideMessageSquare',
      EN_ATTENTE_SIGNATURE: 'lucidePen',
      ACTIF: 'lucideCheckCircle',
      EN_COURS: 'lucidePlayCircle',
      TERMINEE: 'lucideShield',
      ANNULEE: 'lucideXCircle',
    };
    return map[s] ?? 'lucideClock';
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT_MISSION: 'Transport',
      TRANSPORT: 'Transport',
      JOB_MISSION: 'Mission',
      JOB: 'Mission',
      EQUIPMENT_RENTAL: 'Location',
    };
    return map[t] ?? 'Contrat';
  }

  typeIcon(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT_MISSION: 'lucideTruck',
      TRANSPORT: 'lucideTruck',
      JOB_MISSION: 'lucideBriefcase',
      JOB: 'lucideBriefcase',
      EQUIPMENT_RENTAL: 'lucideWrench',
    };
    return map[t] ?? 'lucideFileText';
  }

  contractTypeKey(t: string): string {
    return t.replace(/-/g, '_');
  }

  otherPartyName(c: MissionContract): string {
    const snap = c.terms_snapshot ?? {};
    const user = this.currentUser();
    if (user && c.initiator_id === user.id) {
      return snap['counterparty_name'] ?? snap['provider_name'] ?? snap['farmer_name'] ?? 'Autre partie';
    }
    return snap['initiator_name'] ?? snap['farmer_name'] ?? snap['provider_name'] ?? 'Autre partie';
  }

  missionSummary(c: MissionContract): string {
    const snap = c.terms_snapshot ?? {};
    return snap['description']
      ?? snap['mission_description']
      ?? snap['transport_description']
      ?? snap['equipment_description']
      ?? c.description
      ?? 'Pas de description';
  }

  fmt(n: number | string): string {
    return Number(n ?? 0).toLocaleString('fr-TN', {
      minimumFractionDigits: 3, maximumFractionDigits: 3,
    });
  }

  quickActions(c: MissionContract): Array<{
    label: string; icon: string; variant: string; handler: () => void;
  }> {
    const user = this.currentUser();
    const role = user?.role ?? '';
    const actions: Array<{
      label: string; icon: string; variant: string; handler: () => void;
    }> = [];

    switch (c.status) {
      case 'NEGOTIATING':
      case 'NEGOCIATION':
        actions.push({
          label: 'Répondre', icon: 'lucideMessageSquare', variant: 'primary',
          handler: () => this.navigateToContract(c.id),
        });
        actions.push({
          label: 'Annuler', icon: 'lucideXCircle', variant: 'danger',
          handler: () => this.cancelContract(c.id),
        });
        break;

      case 'EN_ATTENTE_SIGNATURE':
        actions.push({
          label: 'Signer', icon: 'lucidePen', variant: 'primary',
          handler: () => this.navigateToContract(c.id),
        });
        actions.push({
          label: 'Annuler', icon: 'lucideXCircle', variant: 'danger',
          handler: () => this.cancelContract(c.id),
        });
        break;

      case 'ACCEPTED':
      case 'ACTIF':
      case 'IN_PROGRESS':
      case 'EN_COURS':
        actions.push({
          label: 'Voir les Détails', icon: 'lucideEye', variant: 'secondary',
          handler: () => this.navigateToContract(c.id),
        });

        if (c.status === 'ACCEPTED') {
          if (role === 'WORKER' || role === 'DRIVER' || role === 'EQUIP_OWNER') {
            actions.push({
              label: 'Démarrer', icon: 'lucideArrowRight', variant: 'primary',
              handler: () => this.startMission(c.id),
            });
          } else {
            actions.push({
              label: 'Confirmer', icon: 'lucideCheckCircle', variant: 'primary',
              handler: () => this.navigateToContract(c.id),
            });
          }
        }

        if (c.status === 'IN_PROGRESS') {
          if (role === 'WORKER') {
            actions.push({
              label: 'Confirmer la Fin', icon: 'lucidePackageCheck', variant: 'primary',
              handler: () => this.completeMission(c.id),
            });
          } else if (role === 'DRIVER') {
            actions.push({
              label: 'Confirmer la Livraison', icon: 'lucideMapPin', variant: 'primary',
              handler: () => this.completeMission(c.id),
            });
          } else if (role === 'EQUIP_OWNER') {
            actions.push({
              label: 'Confirmer le Retour', icon: 'lucideRotateCcw', variant: 'primary',
              handler: () => this.completeMission(c.id),
            });
          } else {
            actions.push({
              label: 'Terminer & Évaluer', icon: 'lucideClipboardCheck', variant: 'primary',
              handler: () => this.openEvaluation(c.id),
            });
          }
        }
        break;

      case 'COMPLETED':
      case 'TERMINEE':
        actions.push({
          label: 'Voir le Reçu', icon: 'lucideDownload', variant: 'accent',
          handler: () => this.api.downloadPdf(c.id),
        });
        actions.push({
          label: 'Laisser un Avis', icon: 'lucideStar', variant: 'secondary',
          handler: () => this.openRating(c.id),
        });
        break;

      case 'DISPUTED':

      case 'CANCELLED':
      case 'ANNULEE':
        actions.push({
          label: 'Voir les Détails', icon: 'lucideEye', variant: 'secondary',
          handler: () => this.navigateToContract(c.id),
        });
        break;
    }

    return actions;
  }

  private startMission(id: string): void {
    this.actionLoading.set(id);
    this.api.startMission(id).subscribe({
      next: (updated) => {
        this.contracts.update(list => list.map(c => c.id === id ? updated : c));
        this.actionLoading.set(null);
      },
      error: () => this.actionLoading.set(null),
    });
  }

  private completeMission(id: string): void {
    this.actionLoading.set(id);
    this.api.completeMission(id).subscribe({
      next: (updated) => {
        this.contracts.update(list => list.map(c => c.id === id ? updated : c));
        this.actionLoading.set(null);
      },
      error: () => this.actionLoading.set(null),
    });
  }

  private cancelContract(id: string): void {
    const reason = prompt('Motif de l\'annulation:');
    if (!reason?.trim()) return;
    this.actionLoading.set(id);
    this.api.cancelContract(id, reason).subscribe({
      next: (updated) => {
        this.contracts.update(list => list.map(c => c.id === id ? updated : c));
        this.actionLoading.set(null);
      },
      error: () => this.actionLoading.set(null),
    });
  }

  openEvaluation(id: string): void {
    this.evaluatingContractId.set(id);
  }

  onEvaluated(): void {
    this.evaluatingContractId.set(null);
    this.api.getMyContracts().subscribe({
      next: (list) => { this.contracts.set(list); },
    });
  }

  openRating(id: string): void {
    this.ratingModal.set(id);
    this.ratingValue.set(0);
    this.ratingComment = '';
  }

  submitRating(): void {
    const id = this.ratingModal();
    const stars = this.ratingValue();
    if (!id || !stars) return;

    this.actionLoading.set(id);
    this.api.rateContract(id, stars, this.ratingComment || undefined).subscribe({
      next: (updated) => {
        this.contracts.update(list => list.map(c => c.id === id ? updated : c));
        this.actionLoading.set(null);
        this.ratingModal.set(null);
      },
      error: () => this.actionLoading.set(null),
    });
  }
}
