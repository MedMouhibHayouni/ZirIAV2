import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideActivity, lucideAlertTriangle, lucideCalendar,
  lucideCheckCircle, lucidePlus, lucideTrash2, lucideShield,
  lucideRefreshCw, lucideArrowRight, lucideSun, lucideLeaf
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';

interface Hive {
  id: string;
  name: string;
  location: string;
  queenYear: number;
  lastInspection: string;
  healthStatus: 'healthy' | 'at-risk' | 'critical';
  colonyStrength: number; // 1-10
  honeyFrames: number;
  notes: string;
}

interface SeasonTask {
  month: string;
  task: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

const SEASON_CALENDAR: SeasonTask[] = [
  { month: 'Jan', task: 'Vérifier les réserves alimentaires, traiter Varroa si nécessaire', icon: '❄️', priority: 'high' },
  { month: 'Fév', task: 'Première visite de printemps — vérifier la ponte de la reine', icon: '🌱', priority: 'high' },
  { month: 'Mar', task: 'Élargir le nid à couvain, ajouter des hausses si nécessaire', icon: '🌸', priority: 'medium' },
  { month: 'Avr', task: 'Surveiller les essaimages, contrôle Varroa mensuel', icon: '🐝', priority: 'high' },
  { month: 'Mai', task: 'Grande miellée — poser les hausses, première récolte possible', icon: '🍯', priority: 'medium' },
  { month: 'Juin', task: 'Récolte du miel d\'acacia/agrumes, contrôle sanitaire', icon: '🍯', priority: 'medium' },
  { month: 'Juil', task: 'Période de disette — nourrir si nécessaire, ombrer les ruches', icon: '☀️', priority: 'medium' },
  { month: 'Août', task: 'Traitement Varroa (après récolte), vérifier les ruches orphelines', icon: '💊', priority: 'high' },
  { month: 'Sep', task: 'Préparation hivernage, dernier nourrissement, réduction entrée', icon: '🍂', priority: 'high' },
  { month: 'Oct', task: 'Fermeture des ruches, traitement contre la teigne, bilan annuel', icon: '🍂', priority: 'medium' },
  { month: 'Nov', task: 'Cluster hivernal — ne pas déranger, vérifier ventilation', icon: '❄️', priority: 'low' },
  { month: 'Déc', task: 'Entretien du matériel, formations apicoles, planification', icon: '🔧', priority: 'low' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-apiculture',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIconComponent],
  providers: [provideIcons({
    lucideActivity, lucideAlertTriangle, lucideCalendar,
    lucideCheckCircle, lucidePlus, lucideTrash2, lucideShield,
    lucideRefreshCw, lucideArrowRight, lucideSun, lucideLeaf
  })],
  template: `
    <div class="apic-root">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="page-icon">🐝</div>
          <div>
            <h1 class="page-title">Module Apiculture</h1>
            <p class="page-subtitle">Gestion de vos ruches, santé des colonies et calendrier saisonnier</p>
          </div>
        </div>
        <button class="add-btn" (click)="showAddHive.set(true)" id="btn-add-hive">
          <ng-icon name="lucidePlus" size="16" />
          Nouvelle Ruche
        </button>
      </div>

      <!-- KPI strip -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-icon">🏠</div>
          <div>
            <span class="kpi-val">{{ hives().length }}</span>
            <span class="kpi-lbl">Ruches</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">💪</div>
          <div>
            <span class="kpi-val">{{ avgStrength() | number:'1.1-1' }}/10</span>
            <span class="kpi-lbl">Force moy.</span>
          </div>
        </div>
        <div class="kpi-card" [class.kpi-card--alert]="atRiskCount() > 0">
          <div class="kpi-icon">⚠️</div>
          <div>
            <span class="kpi-val">{{ atRiskCount() }}</span>
            <span class="kpi-lbl">À risque</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🍯</div>
          <div>
            <span class="kpi-val">{{ totalHoneyFrames() }}</span>
            <span class="kpi-lbl">Cadres miel</span>
          </div>
        </div>
        <div class="kpi-card kpi-card--month">
          <div class="kpi-icon">{{ currentMonthTask().icon }}</div>
          <div>
            <span class="kpi-val-sm">{{ currentMonthTask().task | slice:0:40 }}…</span>
            <span class="kpi-lbl">Tâche du mois</span>
          </div>
        </div>
      </div>

      <!-- Add Hive Modal -->
      @if (showAddHive()) {
        <div class="modal-overlay" (click)="showAddHive.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 class="modal-title">🏠 Ajouter une Ruche</h3>
            <div class="form-grid">
              <div class="form-field">
                <label>Nom de la ruche</label>
                <input type="text" [(ngModel)]="newHive.name" placeholder="ex: Ruche N°1" id="input-hive-name" />
              </div>
              <div class="form-field">
                <label>Emplacement</label>
                <input type="text" [(ngModel)]="newHive.location" placeholder="ex: Oliveraie nord" id="input-hive-location" />
              </div>
              <div class="form-field">
                <label>Année reine</label>
                <input type="number" [(ngModel)]="newHive.queenYear" [min]="2018" [max]="currentYear" id="input-queen-year" />
              </div>
              <div class="form-field">
                <label>Force colonie (1-10)</label>
                <input type="number" [(ngModel)]="newHive.colonyStrength" min="1" max="10" id="input-colony-strength" />
              </div>
              <div class="form-field">
                <label>Cadres de miel</label>
                <input type="number" [(ngModel)]="newHive.honeyFrames" min="0" id="input-honey-frames" />
              </div>
              <div class="form-field full">
                <label>Notes</label>
                <textarea [(ngModel)]="newHive.notes" rows="2" placeholder="Observations…" id="input-hive-notes"></textarea>
              </div>
            </div>
            <div class="modal-actions">
              <button class="secondary-btn" (click)="showAddHive.set(false)">Annuler</button>
              <button class="cta-btn" (click)="addHive()" id="btn-save-hive">💾 Enregistrer</button>
            </div>
          </div>
        </div>
      }

      <!-- Hive grid -->
      @if (hives().length > 0) {
        <section class="section">
          <div class="section-header">
            <ng-icon name="lucideActivity" size="17" />
            <h2>Mes Ruches</h2>
          </div>

          <div class="hives-grid">
            @for (hive of hives(); track hive.id) {
              <div class="hive-card" [class]="'hive-card--' + hive.healthStatus">
                <div class="hive-top">
                  <div class="hive-name">🏠 {{ hive.name }}</div>
                  <div class="health-badge" [class]="'hb-' + hive.healthStatus">
                    {{ hive.healthStatus === 'healthy' ? '✅ Saine' : hive.healthStatus === 'at-risk' ? '⚠️ Risque' : '🚨 Critique' }}
                  </div>
                </div>

                <div class="hive-location">📍 {{ hive.location }}</div>

                <!-- Strength bar -->
                <div class="strength-row">
                  <span class="strength-lbl">Force colonie</span>
                  <div class="strength-bar">
                    <div class="strength-fill" [style.width.%]="hive.colonyStrength * 10"
                         [class.fill-low]="hive.colonyStrength < 4"
                         [class.fill-mid]="hive.colonyStrength >= 4 && hive.colonyStrength < 7"
                         [class.fill-high]="hive.colonyStrength >= 7">
                    </div>
                  </div>
                  <span class="strength-num">{{ hive.colonyStrength }}/10</span>
                </div>

                <div class="hive-meta">
                  <span>👑 Reine {{ hive.queenYear }}</span>
                  <span>🍯 {{ hive.honeyFrames }} cadres</span>
                  <span>
                    <ng-icon name="lucideCalendar" size="11" />
                    {{ hive.lastInspection | date:'dd/MM/yy' }}
                  </span>
                </div>

                @if (hive.notes) {
                  <p class="hive-notes">{{ hive.notes }}</p>
                }

                <div class="hive-actions">
                  <button class="inspect-btn" (click)="markInspected(hive)" [id]="'btn-inspect-' + hive.id">
                    <ng-icon name="lucideCheckCircle" size="13" />
                    Inspecté aujourd'hui
                  </button>
                  <button class="delete-btn" (click)="deleteHive(hive.id)" [id]="'btn-delete-' + hive.id">
                    <ng-icon name="lucideTrash2" size="13" />
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- Empty hives -->
      @if (hives().length === 0) {
        <div class="empty-state">
          <div class="empty-emoji">🐝</div>
          <h3>Aucune ruche enregistrée</h3>
          <p>Ajoutez vos ruches pour suivre la santé de vos colonies et recevoir des rappels saisonniers.</p>
          <button class="cta-btn inline-cta" (click)="showAddHive.set(true)" id="btn-add-first-hive">
            <ng-icon name="lucidePlus" size="15" />
            Ajouter ma première ruche
          </button>
        </div>
      }

      <!-- Varroa Treatment Checklist -->
      <section class="section">
        <div class="section-header">
          <ng-icon name="lucideShield" size="17" />
          <h2>Checklist Sanitaire Varroa</h2>
        </div>
        <div class="checklist">
          @for (item of varroaChecklist; track item.label) {
            <label class="check-item" [class.done]="item.done">
              <input type="checkbox" [(ngModel)]="item.done" />
              <span class="check-icon">{{ item.done ? '✅' : '⬜' }}</span>
              <div class="check-body">
                <span class="check-label">{{ item.label }}</span>
                <span class="check-note">{{ item.note }}</span>
              </div>
            </label>
          }
        </div>
      </section>

      <!-- Seasonal Calendar -->
      <section class="section">
        <div class="section-header">
          <ng-icon name="lucideCalendar" size="17" />
          <h2>Calendrier Apicole Tunisien</h2>
        </div>
        <div class="calendar-grid">
          @for (task of seasonCalendar; track task.month; let i = $index) {
            <div class="cal-card" [class.cal-card--current]="i === currentMonthIdx()" [class.cal-card--high]="task.priority === 'high'">
              <div class="cal-month">{{ task.month }}</div>
              <div class="cal-icon">{{ task.icon }}</div>
              <p class="cal-task">{{ task.task }}</p>
              @if (task.priority === 'high') {
                <div class="cal-priority">Prioritaire</div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Link to animal diagnostic -->
      <div class="diag-cta-banner">
        <div class="diag-cta-left">
          <span class="diag-emoji">🩺</span>
          <div>
            <strong>Symptômes dans votre ruche ?</strong>
            <p>Utilisez le Diagnostic Animal IA pour identifier les maladies des abeilles</p>
          </div>
        </div>
        <a routerLink="/dashboard/farmer/animal-diagnostic" class="diag-cta-btn" id="btn-goto-animal-diag">
          Diagnostic IA
          <ng-icon name="lucideArrowRight" size="15" />
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .apic-root {
      padding: 28px;
      max-width: 1100px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Header */
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .page-icon { font-size: 44px; line-height: 1; }
    .page-title { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .add-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff; border: none; border-radius: 12px;
      font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 12px rgba(217,119,6,0.3);
      transition: opacity 0.2s;
    }
    .add-btn:hover { opacity: 0.9; }

    /* KPI strip */
    .kpi-strip { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
    .kpi-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 18px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px; flex: 1 1 130px;
      transition: box-shadow 0.2s;
    }
    .kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
    .kpi-card--alert { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); }
    .kpi-card--month { flex: 2 1 240px; }
    .kpi-icon { font-size: 28px; }
    .kpi-val { display: block; font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .kpi-val-sm { display: block; font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
    .kpi-lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; display: block; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 28px;
      width: 100%; max-width: 480px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    }
    .modal-title { font-size: 18px; font-weight: 700; margin: 0 0 20px; color: var(--text-primary); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; }
    .form-field.full { grid-column: 1 / -1; }
    .form-field label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .form-field input, .form-field textarea {
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: 9px; font-family: inherit; font-size: 13px;
      background: var(--bg-input, var(--bg-card)); color: var(--text-primary);
    }
    .form-field input:focus, .form-field textarea:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.25); }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

    /* Buttons */
    .cta-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 20px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff; border: none; border-radius: 11px;
      font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .secondary-btn {
      padding: 10px 18px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px; font-family: inherit; font-size: 14px; cursor: pointer;
      color: var(--text-secondary);
    }

    /* Section */
    .section { margin-bottom: 36px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .section-header h2 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }

    /* Hive grid */
    .hives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .hive-card {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: 18px; padding: 18px;
      transition: box-shadow 0.2s, transform 0.15s;
    }
    .hive-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.09); transform: translateY(-2px); }
    .hive-card--at-risk { border-color: rgba(245,158,11,0.4); }
    .hive-card--critical { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.04); }

    .hive-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .hive-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .health-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .hb-healthy { background: rgba(34,197,94,0.15); color: #22c55e; }
    .hb-at-risk { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .hb-critical { background: rgba(239,68,68,0.15); color: #ef4444; }

    .hive-location { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }

    .strength-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .strength-lbl { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
    .strength-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .strength-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .fill-low { background: #ef4444; }
    .fill-mid { background: #f59e0b; }
    .fill-high { background: #22c55e; }
    .strength-num { font-size: 12px; font-weight: 700; color: var(--text-primary); }

    .hive-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
    .hive-meta span { display: flex; align-items: center; gap: 4px; }
    .hive-notes { font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); border-radius: 8px; padding: 7px 10px; margin: 0 0 10px; }

    .hive-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border); }
    .inspect-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 7px 0; font-size: 12px; font-weight: 600;
      background: var(--zir-emerald-dim); color: var(--zir-emerald);
      border: 1px solid var(--border-accent); border-radius: 8px; cursor: pointer;
      transition: opacity 0.2s;
    }
    .inspect-btn:hover { opacity: 0.9; }
    .delete-btn {
      padding: 7px 10px;
      background: rgba(239,68,68,0.1); color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; cursor: pointer;
      transition: background var(--t-fast);
    }
    .delete-btn:hover { background: rgba(239,68,68,0.15); }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 56px 24px;
      background: var(--bg-secondary);
      border: 2px dashed var(--border);
      border-radius: 20px; margin-bottom: 32px;
    }
    .empty-emoji { font-size: 56px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
    .empty-state p { color: var(--text-muted); font-size: 14px; max-width: 360px; margin: 0 auto 20px; }
    .inline-cta { margin: 0 auto; width: fit-content; }

    /* Checklist */
    .checklist { display: flex; flex-direction: column; gap: 8px; }
    .check-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .check-item input[type=checkbox] { display: none; }
    .check-item.done { background: var(--zir-emerald-dim); border-color: var(--border-accent); }
    .check-icon { font-size: 18px; flex-shrink: 0; }
    .check-body { flex: 1; }
    .check-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .check-note { display: block; font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    /* Seasonal Calendar */
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .cal-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px; padding: 14px 12px;
      text-align: center; position: relative;
      transition: box-shadow 0.2s;
    }
    .cal-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
    .cal-card--current { border-color: #f59e0b; background: rgba(245,158,11,0.1); box-shadow: 0 0 0 2px rgba(245,158,11,0.25); }
    .cal-card--high { border-left: 3px solid #ef4444; }
    .cal-month { font-size: 11px; font-weight: 800; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
    .cal-icon { font-size: 28px; margin-bottom: 8px; }
    .cal-task { font-size: 11px; line-height: 1.5; color: var(--text-secondary); margin: 0 0 8px; }
    .cal-priority {
      display: inline-block; font-size: 10px; font-weight: 700;
      background: rgba(239,68,68,0.15); color: #ef4444;
      padding: 2px 8px; border-radius: 10px;
    }

    /* Diagnostic CTA banner */
    .diag-cta-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06));
      border: 1.5px solid rgba(245,158,11,0.3);
      border-radius: 18px; gap: 16px;
    }
    .diag-cta-left { display: flex; align-items: center; gap: 16px; }
    .diag-emoji { font-size: 36px; }
    .diag-cta-left strong { display: block; font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .diag-cta-left p { font-size: 13px; color: var(--text-secondary); margin: 0; }
    .diag-cta-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 20px;
      background: #f59e0b; color: #fff;
      border-radius: 11px; text-decoration: none;
      font-size: 14px; font-weight: 600; white-space: nowrap;
      transition: opacity 0.2s;
    }
    .diag-cta-btn:hover { opacity: 0.88; }

    /* Responsive */
    @media (max-width: 640px) {
      .apic-root { padding: 16px; }
      .calendar-grid { grid-template-columns: repeat(2, 1fr); }
      .kpi-strip { gap: 8px; }
      .kpi-card { min-width: calc(50% - 4px); }
      .diag-cta-banner { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class FarmerApicultureComponent implements OnInit {
  private http = inject(HttpClient);

  hives = signal<Hive[]>([]);
  showAddHive = signal(false);
  currentYear = new Date().getFullYear();

  newHive: Partial<Hive> = {
    name: '', location: '', queenYear: this.currentYear - 1,
    colonyStrength: 7, honeyFrames: 4, notes: '', healthStatus: 'healthy'
  };

  seasonCalendar = SEASON_CALENDAR;

  varroaChecklist = [
    { label: 'Test de chute naturelle Varroa effectué', note: 'Placer le plateau pendant 3 jours et compter les acariens', done: false },
    { label: 'Traitement acide oxalique appliqué (été)', note: 'Appliquer après la dernière récolte — août/septembre', done: false },
    { label: 'Traitement acide formique (printemps)', note: 'En l\'absence de couvain ou entre miellées', done: false },
    { label: 'Taux d\'infestation < 3% vérifié', note: 'Seuil d\'alerte : >3% en saison active', done: false },
    { label: 'Résistances vérifiées (rotation produits)', note: 'Alterner les familles de molécules chaque année', done: false },
  ];

  // Computed
  avgStrength = () => {
    if (!this.hives().length) return 0;
    return this.hives().reduce((s, h) => s + h.colonyStrength, 0) / this.hives().length;
  };
  atRiskCount = () => this.hives().filter(h => h.healthStatus !== 'healthy').length;
  totalHoneyFrames = () => this.hives().reduce((s, h) => s + (h.honeyFrames || 0), 0);
  currentMonthIdx = () => new Date().getMonth();
  currentMonthTask = () => SEASON_CALENDAR[this.currentMonthIdx()];

  ngOnInit() { this.loadFromStorage(); }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('ziria_hives');
      if (stored) this.hives.set(JSON.parse(stored));
    } catch {}
  }

  saveToStorage() {
    localStorage.setItem('ziria_hives', JSON.stringify(this.hives()));
  }

  addHive() {
    if (!this.newHive.name) return;
    const hive: Hive = {
      id: crypto.randomUUID(),
      name: this.newHive.name!,
      location: this.newHive.location || 'Non précisé',
      queenYear: this.newHive.queenYear || this.currentYear - 1,
      lastInspection: new Date().toISOString().split('T')[0],
      healthStatus: 'healthy',
      colonyStrength: this.newHive.colonyStrength || 7,
      honeyFrames: this.newHive.honeyFrames || 0,
      notes: this.newHive.notes || '',
    };
    this.hives.update(hs => [...hs, hive]);
    this.saveToStorage();
    this.showAddHive.set(false);
    this.newHive = { name: '', location: '', queenYear: this.currentYear - 1, colonyStrength: 7, honeyFrames: 4, notes: '', healthStatus: 'healthy' };
  }

  markInspected(hive: Hive) {
    this.hives.update(hs => hs.map(h => h.id === hive.id
      ? { ...h, lastInspection: new Date().toISOString().split('T')[0] }
      : h
    ));
    this.saveToStorage();
  }

  deleteHive(id: string) {
    this.hives.update(hs => hs.filter(h => h.id !== id));
    this.saveToStorage();
  }
}
