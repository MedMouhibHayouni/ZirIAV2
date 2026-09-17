import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideMilk, lucideSprout, lucideAlertTriangle, lucideCalendar,
  lucideShield, lucideActivity, lucideArrowRight, lucideClipboard,
  lucideRefreshCw, lucideChevronDown, lucideChevronUp
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

interface HerdRecord {
  id: string;
  species: string;
  breed: string;
  herd_size: number;
  daily_milk_yield_kg: number;
  birth_rate_pct: number;
  mortality_rate_pct: number;
  last_visit_date: string;
  feed_program: string;
  notes: string;
  performance_alert: boolean;
  updated_at: string;
}

interface VaccinationRecord {
  id: string;
  species: string;
  animal_count: number;
  vaccine_name: string;
  batch_number: string;
  vaccination_date: string;
  next_reminder_date: string;
  is_reminder_sent: boolean;
  notes: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-cheptel',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent],
  providers: [provideIcons({
    lucideMilk, lucideSprout, lucideAlertTriangle, lucideCalendar,
    lucideShield, lucideActivity, lucideArrowRight, lucideClipboard,
    lucideRefreshCw, lucideChevronDown, lucideChevronUp
  })],
  template: `
    <div class="cheptel-root">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="page-icon">🐄</div>
          <div>
            <h1 class="page-title">Mon Cheptel</h1>
            <p class="page-subtitle">Suivi de vos animaux et protocoles de santé</p>
          </div>
        </div>
        <button class="refresh-btn" (click)="reload()" [class.spinning]="loading()">
          <ng-icon name="lucideRefreshCw" size="16" />
        </button>
      </div>

      <!-- KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--green">🐑</div>
          <div class="kpi-body">
            <span class="kpi-value">{{ totalAnimals() }}</span>
            <span class="kpi-label">Animaux total</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--blue">🐄</div>
          <div class="kpi-body">
            <span class="kpi-value">{{ herds().length }}</span>
            <span class="kpi-label">Espèces suivies</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--amber">💉</div>
          <div class="kpi-body">
            <span class="kpi-value">{{ vaccinations().length }}</span>
            <span class="kpi-label">Vaccinations</span>
          </div>
        </div>
        <div class="kpi-card" [class.kpi-card--alert]="alertCount() > 0">
          <div class="kpi-icon kpi-icon--red">⚠️</div>
          <div class="kpi-body">
            <span class="kpi-value">{{ alertCount() }}</span>
            <span class="kpi-label">Alertes perf.</span>
          </div>
        </div>
        @if (avgMilkYield() > 0) {
          <div class="kpi-card">
            <div class="kpi-icon kpi-icon--purple">🥛</div>
            <div class="kpi-body">
              <span class="kpi-value">{{ avgMilkYield() | number:'1.1-1' }} kg</span>
              <span class="kpi-label">Lait/j moy.</span>
            </div>
          </div>
        }
        @if (nextVaccination()) {
          <div class="kpi-card kpi-card--upcoming">
            <div class="kpi-icon kpi-icon--teal">📅</div>
            <div class="kpi-body">
              <span class="kpi-value">{{ daysUntilNext() }}j</span>
              <span class="kpi-label">Prochain rappel</span>
            </div>
          </div>
        }
      </div>

      <!-- Loading state -->
      @if (loading()) {
        <div class="skeleton-section">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && herds().length === 0 && vaccinations().length === 0) {
        <div class="empty-state">
          <div class="empty-emoji">🌾</div>
          <h3>Aucune donnée d'élevage disponible</h3>
          <p>Vos experts vétérinaires/zootechniciens alimenteront cette section lors de leurs visites ou consultations.</p>
          <a routerLink="/dashboard/farmer/experts/discover" class="cta-link">
            Trouver un expert élevage
            <ng-icon name="lucideArrowRight" size="16" />
          </a>
        </div>
      }

      <!-- Herd Records Section -->
      @if (!loading() && herds().length > 0) {
        <section class="section">
          <div class="section-header">
            <ng-icon name="lucideActivity" size="18" />
            <h2>Fiches Élevage</h2>
            <span class="section-badge">{{ herds().length }}</span>
          </div>

          <div class="herds-grid">
            @for (h of herds(); track h.id) {
              <div class="herd-card" [class.herd-card--alert]="h.performance_alert">
                <!-- Card header -->
                <div class="herd-header">
                  <div class="species-badge">
                    {{ speciesEmoji(h.species) }}
                    <span>{{ h.species || 'N/A' }}</span>
                  </div>
                  @if (h.performance_alert) {
                    <div class="alert-chip">
                      <ng-icon name="lucideAlertTriangle" size="13" />
                      Alerte
                    </div>
                  }
                </div>

                <!-- Breed & size -->
                <div class="herd-title">
                  <h3>{{ h.breed || 'Race non précisée' }}</h3>
                  <div class="herd-size">
                    <span class="herd-size-num">{{ h.herd_size | number }}</span>
                    <span class="herd-size-label">têtes</span>
                  </div>
                </div>

                <!-- Metrics grid -->
                <div class="metrics-grid">
                  @if (h.daily_milk_yield_kg) {
                    <div class="metric">
                      <span class="metric-icon">🥛</span>
                      <div>
                        <span class="metric-val">{{ h.daily_milk_yield_kg }} kg</span>
                        <span class="metric-lbl">Lait/j</span>
                      </div>
                    </div>
                  }
                  @if (h.birth_rate_pct) {
                    <div class="metric">
                      <span class="metric-icon">🐣</span>
                      <div>
                        <span class="metric-val">{{ h.birth_rate_pct }}%</span>
                        <span class="metric-lbl">Natalité</span>
                      </div>
                    </div>
                  }
                  @if (h.mortality_rate_pct) {
                    <div class="metric" [class.metric--danger]="h.mortality_rate_pct > 5">
                      <span class="metric-icon">📉</span>
                      <div>
                        <span class="metric-val">{{ h.mortality_rate_pct }}%</span>
                        <span class="metric-lbl">Mortalité</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Feed program -->
                @if (h.feed_program) {
                  <div class="feed-chip">
                    <ng-icon name="lucideSprout" size="13" />
                    <span>{{ h.feed_program | slice:0:60 }}{{ h.feed_program.length > 60 ? '…' : '' }}</span>
                  </div>
                }

                <!-- Footer -->
                <div class="herd-footer">
                  <span class="visit-date">
                    <ng-icon name="lucideCalendar" size="12" />
                    {{ h.last_visit_date ? (h.last_visit_date | date:'dd MMM yyyy') : 'Visite non enregistrée' }}
                  </span>
                  <span class="update-date">Màj {{ h.updated_at | date:'dd/MM/yy' }}</span>
                </div>

                <!-- Notes (collapsible) -->
                @if (h.notes) {
                  <div class="notes-section">
                    <button class="notes-toggle" (click)="toggleNote(h.id)">
                      <ng-icon name="lucideClipboard" size="12" />
                      Notes expert
                      <ng-icon [name]="expandedNote() === h.id ? 'lucideChevronUp' : 'lucideChevronDown'" size="12" />
                    </button>
                    @if (expandedNote() === h.id) {
                      <p class="notes-text">{{ h.notes }}</p>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- Vaccination Timeline -->
      @if (!loading() && vaccinations().length > 0) {
        <section class="section">
          <div class="section-header">
            <ng-icon name="lucideShield" size="18" />
            <h2>Historique des Vaccinations</h2>
            <span class="section-badge">{{ vaccinations().length }}</span>
          </div>

          <div class="vacc-timeline">
            @for (v of vaccinations(); track v.id) {
              <div class="vacc-item" [class.vacc-item--upcoming]="isUpcoming(v.next_reminder_date)">
                <!-- Timeline dot -->
                <div class="tl-dot" [class.tl-dot--upcoming]="isUpcoming(v.next_reminder_date)">
                  💉
                </div>
                <div class="tl-line"></div>

                <!-- Card -->
                <div class="vacc-card">
                  <div class="vacc-head">
                    <div class="vacc-name">{{ v.vaccine_name || 'Vaccin non précisé' }}</div>
                    <div class="vacc-species-badge">{{ speciesEmoji(v.species) }} {{ v.species }}</div>
                  </div>
                  <div class="vacc-meta">
                    <span>
                      <ng-icon name="lucideCalendar" size="12" />
                      {{ v.vaccination_date | date:'dd MMM yyyy' }}
                    </span>
                    <span>{{ v.animal_count }} animaux</span>
                    @if (v.batch_number) {
                      <span class="batch">Lot: {{ v.batch_number }}</span>
                    }
                  </div>
                  @if (v.next_reminder_date) {
                    <div class="reminder-chip" [class.reminder-chip--urgent]="isUrgent(v.next_reminder_date)">
                      <ng-icon name="lucideMilk" size="12" />
                      Rappel: {{ v.next_reminder_date | date:'dd MMM yyyy' }}
                      @if (isUrgent(v.next_reminder_date)) {
                        <span class="urgent-badge">Bientôt !</span>
                      }
                    </div>
                  }
                  @if (v.notes) {
                    <p class="vacc-notes">{{ v.notes }}</p>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .cheptel-root {
      padding: 28px;
      max-width: 1100px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .page-icon { font-size: 40px; line-height: 1; }
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 2px;
      letter-spacing: -0.4px;
    }
    .page-subtitle { color: var(--text-muted); font-size: 14px; margin: 0; }
    .refresh-btn {
      width: 38px; height: 38px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: var(--text-muted);
      transition: background 0.2s, transform 0.2s;
    }
    .refresh-btn:hover { background: var(--bg-card-hover); }
    .refresh-btn.spinning ng-icon { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* KPI Strip */
    .kpi-strip {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      flex: 1 1 140px;
      min-width: 130px;
      transition: box-shadow 0.2s, border-color 0.2s;
    }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .kpi-card--alert { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.06); }
    .kpi-card--upcoming { border-color: var(--border-accent); background: var(--zir-emerald-dim); }

    .kpi-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .kpi-icon--green { background: rgba(34,197,94,0.15); }
    .kpi-icon--blue  { background: rgba(59,130,246,0.15); }
    .kpi-icon--amber { background: rgba(245,158,11,0.15); }
    .kpi-icon--red   { background: rgba(239,68,68,0.15); }
    .kpi-icon--purple{ background: rgba(139,92,246,0.15); }
    .kpi-icon--teal  { background: rgba(20,184,166,0.15); }

    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
    .kpi-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* Skeleton */
    .skeleton-section { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-card {
      height: 180px;
      background: linear-gradient(90deg, var(--bg-card-hover) 25%, var(--bg-secondary) 50%, var(--bg-card-hover) 75%);
      background-size: 200% 100%;
      border-radius: 16px;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 24px;
      background: var(--bg-card);
      border: 2px dashed var(--border);
      border-radius: 20px;
    }
    .empty-emoji { font-size: 60px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
    .empty-state p { color: var(--text-muted); font-size: 14px; max-width: 380px; margin: 0 auto 20px; line-height: 1.6; }
    .cta-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px;
      background: var(--zir-emerald);
      color: #fff;
      border-radius: 10px;
      font-size: 14px; font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .cta-link:hover { opacity: 0.88; }

    /* Section */
    .section { margin-bottom: 36px; }
    .section-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px;
      color: var(--text-primary);
    }
    .section-header h2 { font-size: 17px; font-weight: 700; margin: 0; }
    .section-badge {
      background: var(--zir-emerald);
      color: #fff;
      font-size: 11px; font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
    }

    /* Herd Cards Grid */
    .herds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .herd-card {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .herd-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.12); transform: translateY(-2px); }
    .herd-card--alert { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.04); }

    .herd-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .species-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600;
      color: var(--text-primary);
    }
    .species-badge { font-size: 20px; }

    .alert-chip {
      display: flex; align-items: center; gap: 4px;
      background: rgba(239,68,68,0.12); color: #ef4444;
      font-size: 11px; font-weight: 700;
      padding: 3px 8px; border-radius: 20px;
    }

    .herd-title {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 14px;
    }
    .herd-title h3 { font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); }
    .herd-size { text-align: right; }
    .herd-size-num { display: block; font-size: 22px; font-weight: 800; color: var(--zir-emerald); line-height: 1; }
    .herd-size-label { font-size: 11px; color: var(--text-muted); }

    .metrics-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .metric {
      display: flex; align-items: center; gap: 6px;
      background: var(--bg-secondary);
      border-radius: 8px; padding: 6px 10px;
      flex: 1 1 80px;
    }
    .metric-icon { font-size: 16px; }
    .metric-val { display: block; font-size: 14px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
    .metric-lbl { font-size: 10px; color: var(--text-muted); }
    .metric--danger .metric-val { color: #ef4444; }

    .feed-chip {
      display: flex; align-items: flex-start; gap: 6px;
      background: var(--zir-emerald-dim); border: 1px solid var(--border-accent);
      border-radius: 8px; padding: 6px 10px;
      font-size: 12px; color: var(--zir-emerald);
      margin-bottom: 12px;
    }

    .herd-footer {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; color: var(--text-muted);
      padding-top: 10px; border-top: 1px solid var(--border);
    }
    .visit-date { display: flex; align-items: center; gap: 4px; }

    .notes-section { margin-top: 10px; }
    .notes-toggle {
      display: flex; align-items: center; gap: 5px;
      background: none; border: none; cursor: pointer;
      font-size: 12px; color: var(--zir-emerald); font-weight: 600;
      padding: 0;
    }
    .notes-text {
      font-size: 12px; color: var(--text-muted);
      background: var(--bg-secondary);
      border-radius: 8px; padding: 8px 10px;
      margin: 6px 0 0; line-height: 1.6;
    }

    /* Vaccination Timeline */
    .vacc-timeline { display: flex; flex-direction: column; gap: 0; }
    .vacc-item {
      display: grid;
      grid-template-columns: 40px 2px 1fr;
      gap: 0 12px;
      position: relative;
      padding-bottom: 20px;
    }
    .vacc-item:last-child { padding-bottom: 0; }
    .vacc-item:last-child .tl-line { display: none; }

    .tl-dot {
      width: 40px; height: 40px;
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      grid-row: 1;
      z-index: 1;
    }
    .tl-dot--upcoming { border-color: var(--zir-emerald); background: var(--zir-emerald-dim); }

    .tl-line {
      width: 2px;
      background: var(--border);
      margin: 40px auto 0;
      grid-column: 2;
      grid-row: 1 / 3;
    }

    .vacc-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      grid-column: 3; grid-row: 1;
      transition: box-shadow 0.2s;
    }
    .vacc-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .vacc-item--upcoming .vacc-card { border-color: var(--border-accent); background: var(--zir-emerald-dim); }

    .vacc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .vacc-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .vacc-species-badge { font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); padding: 3px 8px; border-radius: 20px; }

    .vacc-meta {
      display: flex; align-items: center; gap: 12px;
      font-size: 12px; color: var(--text-muted);
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .vacc-meta span { display: flex; align-items: center; gap: 4px; }
    .batch { background: rgba(139,92,246,0.15); color: #7c3aed; padding: 2px 6px; border-radius: 6px; }

    .reminder-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(59,130,246,0.12); color: #3b82f6;
      font-size: 12px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px;
      margin-bottom: 6px;
    }
    .reminder-chip--urgent { background: rgba(245,158,11,0.12); color: #d97706; }
    .urgent-badge {
      background: #f59e0b; color: #fff;
      font-size: 10px; padding: 1px 6px; border-radius: 10px;
    }
    .vacc-notes { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; line-height: 1.6; }

    /* Responsive */
    @media (max-width: 640px) {
      .cheptel-root { padding: 16px; }
      .kpi-strip { gap: 8px; }
      .kpi-card { min-width: calc(50% - 4px); flex: 1 1 calc(50% - 4px); }
    }

  `]
})
export class FarmerCheptelComponent implements OnInit {
  private http = inject(HttpClient);

  herds = signal<HerdRecord[]>([]);
  vaccinations = signal<VaccinationRecord[]>([]);
  loading = signal(true);
  expandedNote = signal<string | null>(null);

  // Computed
  totalAnimals = () => this.herds().reduce((sum, h) => sum + (h.herd_size || 0), 0);
  alertCount = () => this.herds().filter(h => h.performance_alert).length;
  avgMilkYield = () => {
    const milkHerds = this.herds().filter(h => h.daily_milk_yield_kg > 0);
    if (!milkHerds.length) return 0;
    return milkHerds.reduce((s, h) => s + h.daily_milk_yield_kg, 0) / milkHerds.length;
  };
  nextVaccination = () => {
    const future = this.vaccinations()
      .filter(v => v.next_reminder_date && new Date(v.next_reminder_date) > new Date())
      .sort((a, b) => new Date(a.next_reminder_date).getTime() - new Date(b.next_reminder_date).getTime());
    return future[0] || null;
  };
  daysUntilNext = () => {
    const nv = this.nextVaccination();
    if (!nv) return 0;
    const diff = new Date(nv.next_reminder_date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    let herdsLoaded = false;
    let vaccsLoaded = false;
    const done = () => { if (herdsLoaded && vaccsLoaded) this.loading.set(false); };

    this.http.get<HerdRecord[]>(`${environment.apiUrl}/expert/herd-records/my`)
      .subscribe({
        next: r => { this.herds.set(r || []); herdsLoaded = true; done(); },
        error: () => { herdsLoaded = true; done(); }
      });

    this.http.get<VaccinationRecord[]>(`${environment.apiUrl}/expert/vaccinations/my`)
      .subscribe({
        next: r => { this.vaccinations.set(r || []); vaccsLoaded = true; done(); },
        error: () => { vaccsLoaded = true; done(); }
      });
  }

  toggleNote(id: string) {
    this.expandedNote.set(this.expandedNote() === id ? null : id);
  }

  speciesEmoji(species: string): string {
    const map: Record<string, string> = {
      'Bovin': '🐄', 'Ovin': '🐑', 'Caprin': '🐐',
      'Volaille': '🐔', 'Porcin': '🐷', 'Abeilles': '🐝',
      'Camelin': '🐪', 'Equin': '🐴'
    };
    return map[species] || '🐾';
  }

  isUpcoming(dateStr: string): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = Date.now();
    return d.getTime() > now && d.getTime() - now < 30 * 86400000;
  }

  isUrgent(dateStr: string): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = Date.now();
    return d.getTime() > now && d.getTime() - now < 7 * 86400000;
  }
}
