import {
  Component, OnInit, OnDestroy, inject, input, output, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../../core/services/socket.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideX, lucideSend, lucideCheck, lucideAlertCircle, lucideClock,
  lucideCalendar, lucideDollarSign, lucideMapPin, lucideBriefcase,
  lucideChevronDown, lucideLoader,
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

interface NegotiationRound {
  id: string;
  proposed_by: string;
  daily_rate_tnd: number;
  start_date: string;
  end_date: string;
  working_days: number;
  total_amount: number;
  conditions_text: string | null;
  status: string;
  created_at: string;
}

interface Negotiation {
  id: string;
  mission_offer_id: string;
  farmer_id: string;
  worker_id: string;
  status: string;
  round_count: number;
  rounds: NegotiationRound[];
}

@Component({
  selector: 'app-mission-negotiation',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideX, lucideSend, lucideCheck, lucideAlertCircle, lucideClock,
    lucideCalendar, lucideDollarSign, lucideMapPin, lucideBriefcase,
    lucideChevronDown, lucideLoader,
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="neg-shell">
      <!-- FIX D — en-tête fixe glass : l'offre actuelle reste visible pendant le scroll -->
      <div class="neg-header">
        <div class="neg-header-info">
          <h3>Négociation</h3>
          @if (missionType()) {
            <span class="mission-type-badge">{{ missionType() }}</span>
          }
          <span class="mission-location"><ng-icon name="lucideMapPin" /> {{ missionLocation() }}</span>
        </div>
        <button class="close-btn" (click)="close.emit()"><ng-icon name="lucideX" /></button>
        @if (!loading() && latestRound(); as lr) {
          <div class="neg-current-offer">
            <span class="neg-current-offer__label">Offre actuelle</span>
            <strong class="neg-current-offer__value">{{ lr.daily_rate_tnd }} TND/j · {{ lr.total_amount }} TND</strong>
          </div>
        }
      </div>

      @if (loading()) {
        <!-- FIX D — skeleton loaders, jamais de spinner -->
        <div class="neg-skeleton" aria-busy="true" aria-label="Chargement de la négociation">
          <div class="sk sk--line sk--w50"></div>
          <div class="sk-card"><div class="sk sk--line"></div><div class="sk sk--line sk--w70"></div><div class="sk sk--line sk--w40"></div></div>
          <div class="sk-card"><div class="sk sk--line"></div><div class="sk sk--line sk--w70"></div><div class="sk sk--line sk--w40"></div></div>
        </div>
      } @else if (negotiation(); as neg) {
        @if (neg.status === 'AGREED') {
          <!-- Agreement View (réinsérée via FIX C → l'animation se rejoue côté récepteur passif) -->
          <div class="agreement-view" aria-live="polite">
            <div class="checkmark-draw">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="30" fill="none" stroke="var(--zir-emerald)" stroke-width="4" class="check-circle" />
                <polyline points="20,32 28,40 44,24" fill="none" stroke="var(--zir-emerald)" stroke-width="4" class="check-line" />
              </svg>
            </div>
            <h2 class="confirmed-title">Mission Confirmée</h2>
            <div class="agreed-terms">
              <div class="term-row"><span>Tarif</span><strong>{{ latestRound()?.daily_rate_tnd }} TND/jour</strong></div>
              <div class="term-row"><span>Dates</span><strong>{{ latestRound()?.start_date | date:'dd MMM' }} — {{ latestRound()?.end_date | date:'dd MMM yyyy' }}</strong></div>
              <div class="term-row"><span>Jours</span><strong>{{ latestRound()?.working_days }} jours</strong></div>
              <div class="term-row"><span>Total</span><strong class="emerald">{{ latestRound()?.total_amount }} TND</strong></div>
            </div>
            <button class="btn btn-primary btn-full" (click)="close.emit()">Voir ma mission</button>
          </div>
        } @else {
          <!-- Round counter -->
          <div class="round-counter">
            <span>Tour {{ neg.round_count }} sur 5</span>
            @if (neg.round_count >= 5) {
              <span class="warning-badge">Dernière chance</span>
            }
          </div>

          <!-- Première offre : sans round initial, la négo est vide et impraticable.
               Formulaire guidé dealroom (tarif / dates / conditions + total live). -->
          @if (!neg.rounds?.length && neg.status === 'ACTIVE') {
            <div class="first-offer">
              <div class="first-offer__head">
                <div class="first-offer__icon"><ng-icon name="lucideBriefcase" /></div>
                <div>
                  <h4>Faites la première offre</h4>
                  <p>Proposez un tarif journalier et des dates — l'autre partie pourra accepter ou contre-proposer.</p>
                </div>
              </div>
              <div class="form-row">
                <label>Tarif journalier (TND)</label>
                <input type="number" [(ngModel)]="counterRate" class="form-input" min="1" placeholder="Ex : 45" />
              </div>
              <div class="form-grid-2">
                <div class="form-row">
                  <label>Date début</label>
                  <input type="date" [(ngModel)]="counterStart" class="form-input" />
                </div>
                <div class="form-row">
                  <label>Date fin</label>
                  <input type="date" [(ngModel)]="counterEnd" class="form-input" />
                </div>
              </div>
              <div class="form-row">
                <label>Conditions (optionnel)</label>
                <textarea [(ngModel)]="counterConditions" class="form-input" rows="2" placeholder="Repas inclus, transport, horaires..."></textarea>
              </div>
              @if (previewTotal() > 0) {
                <div class="first-offer__total">
                  <span>Total estimé</span>
                  <strong>{{ previewTotal() }} TND</strong>
                </div>
              }
              @if (firstOfferError()) {
                <div class="first-offer__error"><ng-icon name="lucideAlertCircle" /> {{ firstOfferError() }}</div>
              }
              <button class="btn btn-primary btn-full" (click)="submitFirstOffer()" [disabled]="submitting()">
                <ng-icon name="lucideSend" /> Envoyer ma première offre
              </button>
            </div>
          }

          <!-- Thread : timeline verticale (slide-in uniquement sur les nouveaux rounds) -->
          <div class="neg-thread">
            @for (round of neg.rounds; track round.id) {
              <div class="round-card" [class.mine]="round.proposed_by === currentRole()" [class.theirs]="round.proposed_by !== currentRole()" [class.round--enter]="isFreshRound(round.id)">
                <div class="round-header">
                  <strong>{{ round.proposed_by === 'FARMER' ? 'Votre offre' : 'Offre du travailleur' }}</strong>
                  <span class="round-status" [class]="round.status.toLowerCase()">{{ roundStatusLabel(round.status) }}</span>
                </div>
                <div class="round-body">
                  <div class="round-price">{{ round.daily_rate_tnd }} <small>TND/jour</small></div>
                  <div class="round-dates">
                    <ng-icon name="lucideCalendar" /> {{ round.start_date | date:'dd MMM' }} — {{ round.end_date | date:'dd MMM yyyy' }}
                  </div>
                  <div class="round-days">{{ round.working_days }} jours · {{ round.total_amount }} TND total</div>
                  @if (round.conditions_text) {
                    <div class="round-conditions">{{ round.conditions_text }}</div>
                  }
                </div>
                @if (round.status === 'PENDING' && round.proposed_by !== currentRole()) {
                  <div class="round-actions">
                    <button class="btn btn-primary" (click)="acceptRound(round.id)"><ng-icon name="lucideCheck" /> Accepter</button>
                    <button class="btn btn-outline" (click)="showCounterForm.set(round)">Contre-proposer</button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Counter form -->
          @if (showCounterForm(); as counterTarget) {
            <div class="counter-form">
              <h4>Contre-proposition</h4>
              <div class="form-row">
                <label>Tarif journalier (TND)</label>
                <input type="number" [(ngModel)]="counterRate" class="form-input" />
              </div>
              <div class="form-row">
                <label>Date début</label>
                <input type="date" [(ngModel)]="counterStart" class="form-input" />
              </div>
              <div class="form-row">
                <label>Date fin</label>
                <input type="date" [(ngModel)]="counterEnd" class="form-input" />
              </div>
              <div class="form-row">
                <label>Conditions</label>
                <textarea [(ngModel)]="counterConditions" class="form-input" rows="2" placeholder="Repas inclus, transport..."></textarea>
              </div>
              <div class="form-actions">
                <button class="btn btn-outline" (click)="showCounterForm.set(null)">Annuler</button>
                <button class="btn btn-primary" (click)="submitCounter()" [disabled]="submitting()">
                  <ng-icon name="lucideSend" /> Proposer
                </button>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .neg-shell { padding: 20px; }
    /* FIX D — en-tête fixe : blur uniquement ici, zone de scroll plate (perf mobile) */
    .neg-header { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin: -20px -20px 16px; padding: 16px 20px 12px; background: var(--bg-topbar); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .neg-header-info h3 { margin: 0 0 4px; font-size: 18px; }
    .mission-type-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); margin-bottom: 4px; }
    .mission-location { display: block; font-size: 13px; color: var(--text-secondary); }
    .mission-location ng-icon { width: 12px; height: 12px; vertical-align: middle; }
    .close-btn { border: none; background: none; color: var(--text-secondary); cursor: pointer; padding: 4px; }
    .neg-current-offer { flex-basis: 100%; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 8px 12px; border-radius: 10px; background: var(--zir-emerald-alpha-10); border: 1px solid var(--border-accent); }
    .neg-current-offer__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-secondary); }
    .neg-current-offer__value { font-size: 15px; font-weight: 800; color: var(--zir-emerald); }
    /* FIX D — skeletons */
    .neg-skeleton { display: flex; flex-direction: column; gap: 12px; }
    .sk-card { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); }
    .sk { height: 14px; border-radius: 7px; background: var(--bg-skeleton); overflow: hidden; position: relative; }
    .sk--w50 { width: 50%; } .sk--w70 { width: 70%; } .sk--w40 { width: 40%; }
    .sk::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, var(--bg-skeleton-shine), transparent); animation: sk-shimmer 1.4s infinite; }
    @keyframes sk-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
    .round-counter { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 12px; background: var(--bg-muted); border-radius: 8px; font-size: 13px; }
    .warning-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; background: var(--danger-alpha); color: var(--danger); font-weight: 600; }
    .neg-thread { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; max-height: 400px; overflow-y: auto; }
    /* FIX D — distinction de rôle par alignement (sensible au sens RTL) + accent de bordure logique */
    .round-card { padding: 14px; border-radius: 12px; max-width: 85%; border: 1px solid var(--border); }
    .round-card.mine { background: var(--zir-emerald-alpha-5); align-self: flex-end; border-inline-start: 3px solid var(--zir-emerald); }
    .round-card.theirs { background: var(--bg-card); align-self: flex-start; border-inline-start: 3px solid var(--warning); }
    /* FIX D — slide-in réservé aux rounds jamais vus (décidés côté TS, déclenchés par FIX C) */
    .round-card.round--enter { animation: round-in .35s cubic-bezier(.16,1,.3,1) both; }
    @keyframes round-in { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
    .round-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .round-status { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 8px; }
    .round-status.pending { background: var(--warning-alpha); color: var(--warning); }
    .round-status.accepted { background: var(--success-alpha); color: var(--success); }
    .round-status.declined { background: var(--danger-alpha); color: var(--danger); }
    .round-status.countered { background: var(--info-alpha); color: var(--info); }
    .round-body { }
    .round-price { font-size: 24px; font-weight: 700; color: var(--zir-emerald); }
    .round-price small { font-size: 14px; font-weight: 400; color: var(--text-secondary); }
    .round-dates { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
    .round-dates ng-icon { width: 14px; height: 14px; }
    .round-days { font-size: 13px; color: var(--text-secondary); }
    .round-conditions { margin-top: 6px; padding: 6px 10px; background: var(--bg-muted); border-radius: 6px; font-size: 12px; color: var(--text-secondary); }
    .round-actions { display: flex; gap: 8px; margin-top: 12px; }
    .counter-form { padding: 16px; background: var(--bg-card); border-radius: 8px; }
    .counter-form h4 { margin: 0 0 12px; font-size: 15px; }
    /* Première offre — carte dealroom */
    .first-offer { padding: 18px; border-radius: 14px; background: var(--bg-card); border: 1px solid var(--border-accent); box-shadow: 0 12px 32px -12px rgba(0,0,0,0.25); animation: round-in .35s cubic-bezier(.16,1,.3,1) both; }
    .first-offer__head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .first-offer__icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); border: 1px solid var(--border-accent); }
    .first-offer__head h4 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: var(--text-primary); }
    .first-offer__head p { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-secondary); }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .first-offer__total { display: flex; align-items: baseline; justify-content: space-between; margin: 12px 0; padding: 10px 14px; border-radius: 10px; background: var(--zir-emerald-alpha-10); border: 1px solid var(--border-accent); }
    .first-offer__total span { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .first-offer__total strong { font-size: 18px; font-weight: 800; color: var(--zir-emerald); }
    .first-offer__error { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 12.5px; font-weight: 600; color: var(--danger); }
    .form-row { margin-bottom: 10px; }
    .form-row label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
    .form-input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-size: 14px; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--zir-emerald); }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
    /* FIX D — l'état AGREED rejoue son entrée à chaque insertion (y compris via FIX C côté passif) */
    .agreement-view { text-align: center; padding: 40px 20px; animation: agreed-in .5s cubic-bezier(.16,1,.3,1) both; border-radius: 16px; background: var(--zir-emerald-alpha-5); border: 1px solid var(--border-accent); }
    @keyframes agreed-in { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
    .checkmark-draw { margin-bottom: 16px; }
    .check-circle { animation: draw-circle .4s ease-out; }
    .check-line { animation: draw-check .4s .3s ease-out both; }
    .confirmed-title { font-size: 22px; color: var(--zir-emerald); margin: 0 0 20px; }
    .agreed-terms { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .term-row { display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-muted); border-radius: 6px; font-size: 14px; }
    .term-row .emerald { color: var(--zir-emerald); }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; border: none; }
    .btn-primary { background: var(--zir-emerald); color: var(--text-inverse); }
    .btn-primary:hover { opacity: .9; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-outline { background: none; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--bg-muted); }
    .btn-full { width: 100%; justify-content: center; }
    @keyframes draw-circle { from { stroke-dasharray: 188.5; stroke-dashoffset: 188.5; } to { stroke-dashoffset: 0; } }
    @keyframes draw-check { from { stroke-dasharray: 30; stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .round-card.round--enter, .agreement-view, .sk::after { animation: none; }
    }
  `],
})
export class MissionNegotiationComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private socket = inject(SocketService);
  private wsCleanups: Array<() => void> = [];

  readonly negotiationId = input<string>('');
  readonly missionType = input('');
  readonly missionLocation = input('');
  readonly currentRole = input<'FARMER' | 'WORKER'>('FARMER');
  readonly close = output<void>();

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly negotiation = signal<Negotiation | null>(null);
  readonly showCounterForm = signal<NegotiationRound | null>(null);

  counterRate = 0;
  counterStart = '';
  counterEnd = '';
  counterConditions = '';
  readonly firstOfferError = signal('');

  readonly latestRound = computed(() => {
    const neg = this.negotiation();
    if (!neg?.rounds?.length) return null;
    return neg.rounds[neg.rounds.length - 1];
  });

  // FIX D — ids déjà affichés : seuls les rounds jamais vus jouent le slide-in
  // (évite de ré-animer tout l'historique à chaque loadNegotiation via FIX C)
  private seenRoundIds = new Set<string>();

  isFreshRound(roundId: string): boolean {
    if (this.seenRoundIds.has(roundId)) return false;
    this.seenRoundIds.add(roundId);
    return true;
  }

  ngOnInit() {
    this.loadNegotiation();
    // FIX C — miroir temps réel : recharge à chaque événement WS scopé à cette négociation.
    // Le backend émet via NotificationGateway (namespace /notifications, déjà connecté par topbar).
    const scoped = (handler: () => void) => (payload: any) => {
      if (payload && payload.negotiation_id === this.negotiationId()) handler();
    };
    this.wsCleanups.push(
      this.socket.onEvent('negotiation_round_received', scoped(() => this.loadNegotiation())),
      this.socket.onEvent('negotiation_accepted', scoped(() => this.loadNegotiation())),
      this.socket.onEvent('negotiation_declined', scoped(() => this.loadNegotiation())),
      this.socket.onEvent('negotiation_started', scoped(() => this.loadNegotiation())),
    );
  }

  ngOnDestroy() {
    this.wsCleanups.forEach((off) => { try { off(); } catch { /* noop */ } });
    this.wsCleanups = [];
  }

  private lastSeenNegotiationId = '';

  loadNegotiation() {
    const id = this.negotiationId();
    if (!id) { this.loading.set(false); return; }
    if (id !== this.lastSeenNegotiationId) {
      this.lastSeenNegotiationId = id;
      this.seenRoundIds.clear();
    }
    this.http.get<Negotiation>(`${environment.apiUrl}/contracts/negotiations/${id}`).subscribe({
      next: (n) => {
        this.negotiation.set(n);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  acceptRound(roundId: string) {
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/contracts/negotiations/${this.negotiationId()}/accept`, { round_id: roundId }).subscribe({
      next: () => {
        this.loadNegotiation();
        this.submitting.set(false);
      },
      error: () => { this.submitting.set(false); this.cdr.markForCheck(); }
    });
  }

  /** Total live du formulaire (première offre ou contre-proposition). */
  previewTotal(): number {
    const rate = Number(this.counterRate) || 0;
    if (rate <= 0 || !this.counterStart || !this.counterEnd) return 0;
    return Math.round(rate * this.calculateWorkingDays(this.counterStart, this.counterEnd));
  }

  /** Première offre sur une négociation vide (aucun round) : la rend réellement praticable. */
  submitFirstOffer() {
    this.firstOfferError.set('');
    const rate = Number(this.counterRate) || 0;
    if (rate <= 0) { this.firstOfferError.set('Indiquez un tarif journalier supérieur à 0.'); return; }
    if (!this.counterStart || !this.counterEnd) { this.firstOfferError.set('Choisissez les dates de début et de fin.'); return; }
    if (new Date(this.counterEnd) < new Date(this.counterStart)) { this.firstOfferError.set('La date de fin doit suivre la date de début.'); return; }
    const workingDays = this.calculateWorkingDays(this.counterStart, this.counterEnd);
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/contracts/negotiations/${this.negotiationId()}/propose`, {
      daily_rate_tnd: rate,
      start_date: this.counterStart,
      end_date: this.counterEnd,
      working_days: workingDays,
      conditions_text: this.counterConditions || undefined,
    }).subscribe({
      next: () => {
        this.counterRate = 0; this.counterStart = ''; this.counterEnd = ''; this.counterConditions = '';
        this.loadNegotiation();
        this.submitting.set(false);
      },
      error: (err) => {
        this.firstOfferError.set(err?.error?.message || 'Envoi impossible. Réessayez.');
        this.submitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  submitCounter() {
    const target = this.showCounterForm();
    if (!target) return;
    const workingDays = this.calculateWorkingDays(this.counterStart || target.start_date, this.counterEnd || target.end_date);
    this.submitting.set(true);
    this.http.post(`${environment.apiUrl}/contracts/negotiations/${this.negotiationId()}/propose`, {
      daily_rate_tnd: this.counterRate || target.daily_rate_tnd,
      start_date: this.counterStart || target.start_date,
      end_date: this.counterEnd || target.end_date,
      working_days: workingDays,
      conditions_text: this.counterConditions || target.conditions_text,
    }).subscribe({
      next: () => {
        this.showCounterForm.set(null);
        this.loadNegotiation();
        this.submitting.set(false);
      },
      error: () => { this.submitting.set(false); this.cdr.markForCheck(); }
    });
  }

  private calculateWorkingDays(start: string, end: string): number {
    const s = new Date(start), e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diff, 1);
  }

  roundStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente', ACCEPTED: 'Acceptée',
      COUNTERED: 'Contre-offre', DECLINED: 'Déclinée',
    };
    return map[status] || status;
  }
}
