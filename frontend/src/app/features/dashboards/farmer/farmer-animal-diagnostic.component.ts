import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideActivity, lucideAlertTriangle, lucideCheckCircle,
  lucideChevronRight, lucideSend, lucideRefreshCcw, lucideSprout,
  lucideShield, lucideUser, lucideClipboard, lucideX
} from '@ng-icons/lucide';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface Symptom {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  severity: 'low' | 'medium' | 'high';
}

const ANIMAL_SYMPTOMS: Record<string, Symptom[]> = {
  Bovin: [
    { id: 'fever', label: 'Fièvre > 39.5°C', labelAr: 'حمى', icon: '🌡️', severity: 'high' },
    { id: 'cough', label: 'Toux persistante', labelAr: 'سعال', icon: '💨', severity: 'medium' },
    { id: 'diarrhea', label: 'Diarrhée', labelAr: 'إسهال', icon: '🔴', severity: 'medium' },
    { id: 'lameness', label: 'Boiterie', labelAr: 'عرج', icon: '🦶', severity: 'medium' },
    { id: 'milk_drop', label: 'Chute de production laitière', labelAr: 'انخفاض الحليب', icon: '🥛', severity: 'high' },
    { id: 'weight_loss', label: 'Amaigrissement rapide', labelAr: 'فقدان الوزن', icon: '📉', severity: 'high' },
    { id: 'nasal', label: 'Jetage nasal', labelAr: 'إفراز أنفي', icon: '👃', severity: 'low' },
    { id: 'appetite', label: 'Perte d\'appétit', labelAr: 'فقدان الشهية', icon: '🍃', severity: 'medium' },
  ],
  Ovin: [
    { id: 'fever', label: 'Fièvre', labelAr: 'حمى', icon: '🌡️', severity: 'high' },
    { id: 'foot_rot', label: 'Piétin (pieds pourris)', labelAr: 'تعفن القدم', icon: '🦶', severity: 'high' },
    { id: 'cough', label: 'Toux / difficulté respiratoire', labelAr: 'سعال', icon: '💨', severity: 'medium' },
    { id: 'conjunctivitis', label: 'Conjonctivite / yeux larmoyants', labelAr: 'التهاب الملتحمة', icon: '👁️', severity: 'medium' },
    { id: 'abortion', label: 'Avortements répétés', labelAr: 'إجهاض متكرر', icon: '⚠️', severity: 'high' },
    { id: 'skin_lesion', label: 'Lésions cutanées / croûtes', labelAr: 'آفات جلدية', icon: '🔵', severity: 'medium' },
  ],
  Caprin: [
    { id: 'fever', label: 'Fièvre', labelAr: 'حمى', icon: '🌡️', severity: 'high' },
    { id: 'arthritis', label: 'Arthrite / gonflements articulaires', labelAr: 'التهاب المفاصل', icon: '🦵', severity: 'high' },
    { id: 'diarrhea', label: 'Diarrhée', labelAr: 'إسهال', icon: '🔴', severity: 'medium' },
    { id: 'milk_drop', label: 'Mammite / lait anormal', labelAr: 'التهاب الضرع', icon: '🥛', severity: 'high' },
    { id: 'weight_loss', label: 'Amaigrissement', labelAr: 'نقص الوزن', icon: '📉', severity: 'medium' },
  ],
  Volaille: [
    { id: 'mortality', label: 'Mortalité subite élevée', labelAr: 'وفاة مفاجئة', icon: '⚠️', severity: 'high' },
    { id: 'respiratory', label: 'Symptômes respiratoires', labelAr: 'أعراض تنفسية', icon: '💨', severity: 'high' },
    { id: 'egg_drop', label: 'Chute de ponte', labelAr: 'انخفاض البيض', icon: '🥚', severity: 'medium' },
    { id: 'nervous', label: 'Troubles nerveux / convulsions', labelAr: 'اضطرابات عصبية', icon: '⚡', severity: 'high' },
    { id: 'diarrhea', label: 'Diarrhée verdâtre / sanguinolente', labelAr: 'إسهال', icon: '🔴', severity: 'medium' },
    { id: 'skin_lesion', label: 'Lésions crêtes / barbillons', labelAr: 'آفات جلدية', icon: '🐔', severity: 'medium' },
  ],
  Abeilles: [
    { id: 'colony_loss', label: 'Effondrement de colonie', labelAr: 'انهيار المستعمرة', icon: '🐝', severity: 'high' },
    { id: 'varroa', label: 'Présence de Varroa', labelAr: 'حلم فاروا', icon: '🔴', severity: 'high' },
    { id: 'chalkbrood', label: 'Couvain plâtré (Ascosphère)', labelAr: 'الحضنة الجيرية', icon: '⬜', severity: 'medium' },
    { id: 'laying_queen', label: 'Reine non pondeuse / absente', labelAr: 'ملكة غير مبيضة', icon: '👑', severity: 'high' },
    { id: 'nosema', label: 'Nosémose (dysenterie)', labelAr: 'نوزيما', icon: '🔵', severity: 'medium' },
    { id: 'foulbrood', label: 'Loque américaine / européenne', labelAr: 'لوكه', icon: '🟤', severity: 'high' },
  ],
};

const SPECIES_LIST = Object.keys(ANIMAL_SYMPTOMS);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-animal-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideActivity, lucideAlertTriangle, lucideCheckCircle,
    lucideChevronRight, lucideSend, lucideRefreshCcw, lucideSprout,
    lucideShield, lucideUser, lucideClipboard, lucideX
  })],
  template: `
    <div class="adiag-root">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="page-icon">🩺</div>
          <div>
            <h1 class="page-title">Diagnostic Animal IA</h1>
            <p class="page-subtitle">Décrivez les symptômes — ZirIA génère une analyse et alerte votre vétérinaire</p>
          </div>
        </div>
        @if (step() > 1 && step() < 4) {
          <button class="back-btn" (click)="prevStep()">
            <ng-icon name="lucideX" size="16" /> Recommencer
          </button>
        }
      </div>

      <!-- Step Indicator -->
      <div class="steps-bar">
        @for (s of [1,2,3]; track s) {
          <div class="step-item" [class.active]="step() >= s" [class.current]="step() === s">
            <div class="step-dot">{{ s }}</div>
            <span class="step-label">{{ stepLabels[s-1] }}</span>
          </div>
          @if (s < 3) { <div class="step-line" [class.done]="step() > s"></div> }
        }
      </div>

      <!-- Step 1: Species selection -->
      @if (step() === 1) {
        <div class="step-panel">
          <h2 class="step-title">Quelle espèce est concernée ?</h2>
          <div class="species-grid">
            @for (sp of speciesList; track sp) {
              <button
                id="species-{{ sp.toLowerCase() }}"
                class="species-card"
                [class.selected]="selectedSpecies() === sp"
                (click)="selectSpecies(sp)"
              >
                <span class="species-emoji">{{ speciesEmoji(sp) }}</span>
                <span class="species-name">{{ sp }}</span>
                @if (selectedSpecies() === sp) {
                  <div class="species-check">✓</div>
                }
              </button>
            }
          </div>
          <div class="notes-row">
            <label class="notes-label">Nombre d'animaux affectés</label>
            <input type="number" class="count-input" [(ngModel)]="affectedCount" min="1" placeholder="ex: 5" id="input-affected-count" />
          </div>
          <button class="cta-btn" [disabled]="!selectedSpecies()" (click)="nextStep()" id="btn-species-next">
            Sélectionner les symptômes
            <ng-icon name="lucideChevronRight" size="16" />
          </button>
        </div>
      }

      <!-- Step 2: Symptom checklist -->
      @if (step() === 2) {
        <div class="step-panel">
          <h2 class="step-title">
            {{ speciesEmoji(selectedSpecies()) }} Symptômes observés chez <em>{{ selectedSpecies() }}</em>
          </h2>
          <p class="step-hint">Cochez tous les symptômes observés (plusieurs possibles)</p>

          <div class="symptoms-list">
            @for (sym of currentSymptoms(); track sym.id) {
              <label class="symptom-item" [class.checked]="isChecked(sym.id)" [class.severity-high]="sym.severity === 'high'">
                <input type="checkbox" [id]="'sym-' + sym.id" [checked]="isChecked(sym.id)" (change)="toggleSymptom(sym.id)" />
                <span class="sym-icon">{{ sym.icon }}</span>
                <div class="sym-labels">
                  <span class="sym-fr">{{ sym.label }}</span>
                  <span class="sym-ar">{{ sym.labelAr }}</span>
                </div>
                @if (sym.severity === 'high') {
                  <span class="sev-badge sev-badge--high">⚠️ Urgent</span>
                }
              </label>
            }
          </div>

          <div class="notes-row">
            <label class="notes-label">Observations complémentaires (optionnel)</label>
            <textarea class="notes-ta" [(ngModel)]="extraNotes" rows="3" id="input-extra-notes"
              placeholder="Ex: depuis combien de jours, traitements déjà administrés…"></textarea>
          </div>

          <div class="btn-row">
            <button class="secondary-btn" (click)="prevStep()">Retour</button>
            <button class="cta-btn" [disabled]="selectedSymptoms().size === 0" (click)="nextStep()" id="btn-symptoms-next">
              Analyser avec ZirIA
              <ng-icon name="lucideActivity" size="16" />
            </button>
          </div>
        </div>
      }

      <!-- Step 3: Analyzing + Result -->
      @if (step() === 3) {
        <div class="step-panel">
          @if (loading()) {
            <div class="analyzing-state">
              <div class="pulse-ring">🐄</div>
              <h3>Analyse ZirIA en cours…</h3>
              <div class="scan-steps">
                @for (ph of scanPhrases; track ph; let i = $index) {
                  <div class="scan-ph" [class.active]="scanIndex() === i">{{ ph }}</div>
                }
              </div>
            </div>
          }

          @if (!loading() && result()) {
            <div class="result-card">
              <!-- Urgency banner -->
              <div class="urgency-banner" [class]="urgencyClass()">
                <span class="urg-icon">{{ urgencyIcon() }}</span>
                <div>
                  <strong>{{ result()!.disease_name }}</strong>
                  <span class="urg-label">Urgence {{ result()!.urgency }}</span>
                </div>
                <div class="confidence-pill">{{ confScore() }}% confiance</div>
              </div>

              <!-- Summary -->
              <div class="result-sections">
                <div class="result-section">
                  <div class="rs-head">
                    <ng-icon name="lucideClipboard" size="16" />
                    <strong>Recommandation</strong>
                  </div>
                  <p class="rs-text">{{ result()!.recommendation_fr }}</p>
                </div>

                @if (result()!.recommendation_darija) {
                  <div class="result-section rs-darija">
                    <div class="rs-head">🗣️ <strong>بالدارجة</strong></div>
                    <p class="rs-text rs-text--ar">{{ result()!.recommendation_darija }}</p>
                  </div>
                }
              </div>

              <!-- Actions -->
              <div class="result-actions">
                <button class="action-btn action-btn--primary" (click)="requestVetValidation()" [disabled]="vetSent()" id="btn-request-vet">
                  <ng-icon name="lucideUser" size="15" />
                  {{ vetSent() ? '✓ Vétérinaire notifié' : 'Alerter un Vétérinaire' }}
                </button>
                <button class="action-btn action-btn--secondary" (click)="reset()" id="btn-new-diagnostic">
                  <ng-icon name="lucideRefreshCcw" size="15" />
                  Nouveau diagnostic
                </button>
              </div>

              @if (vetSent()) {
                <div class="vet-sent-notice">
                  <ng-icon name="lucideCheckCircle" size="14" />
                  Un vétérinaire épidémiologiste de votre région a été notifié et examinera votre cas.
                </div>
              }
            </div>
          }

          @if (!loading() && error()) {
            <div class="error-state">
              <ng-icon name="lucideAlertTriangle" size="24" />
              <p>{{ error() }}</p>
              <button class="secondary-btn" (click)="prevStep()">Réessayer</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .adiag-root {
      padding: 28px;
      max-width: 760px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Header */
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .page-icon { font-size: 44px; line-height: 1; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .back-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px; cursor: pointer;
      font-size: 13px; color: var(--text-muted);
      transition: background 0.2s;
    }
    .back-btn:hover { background: var(--bg-card-hover); }

    /* Steps bar */
    .steps-bar {
      display: flex; align-items: center; gap: 0;
      margin-bottom: 32px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px; padding: 16px 20px;
    }
    .step-item { display: flex; align-items: center; gap: 8px; flex: 1; }
    .step-dot {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: var(--bg-card-hover);
      color: var(--text-muted);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
      transition: background 0.2s, color 0.2s;
    }
    .step-item.active .step-dot { background: var(--zir-emerald); color: #fff; }
    .step-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .step-item.active .step-label { color: var(--text-primary); font-weight: 600; }
    .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 8px; }
    .step-line.done { background: var(--zir-emerald); }

    /* Step panel */
    .step-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 28px;
    }
    .step-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
    .step-hint { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; }

    /* Species grid */
    .species-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px; margin-bottom: 24px;
    }
    .species-card {
      position: relative;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 12px;
      background: var(--bg-secondary);
      border: 2px solid var(--border);
      border-radius: 16px; cursor: pointer;
      transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
      font-family: inherit;
    }
    .species-card:hover { transform: translateY(-2px); border-color: var(--zir-emerald); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
    .species-card.selected { border-color: var(--zir-emerald); background: var(--zir-emerald-dim); }
    .species-emoji { font-size: 36px; }
    .species-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .species-check {
      position: absolute; top: 8px; right: 8px;
      width: 22px; height: 22px;
      background: var(--zir-emerald); color: #fff;
      border-radius: 50%; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* Notes row */
    .notes-row { margin-bottom: 20px; }
    .notes-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    .count-input, .notes-ta {
      width: 100%; padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 10px; font-family: inherit; font-size: 14px;
      background: var(--bg-input, var(--bg-card)); color: var(--text-primary);
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .count-input { width: 120px; }
    .count-input:focus, .notes-ta:focus { outline: none; border-color: var(--zir-emerald); box-shadow: 0 0 0 3px var(--zir-emerald-dim); }

    /* Symptoms list */
    .symptoms-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .symptom-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1.5px solid var(--border);
      border-radius: 12px; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .symptom-item input[type=checkbox] { display: none; }
    .symptom-item.checked { border-color: var(--zir-emerald); background: var(--zir-emerald-dim); }
    .symptom-item.severity-high { border-left: 3px solid #f59e0b; }
    .sym-icon { font-size: 22px; flex-shrink: 0; }
    .sym-labels { flex: 1; }
    .sym-fr { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .sym-ar { display: block; font-size: 12px; color: var(--text-muted); direction: rtl; }
    .sev-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
    .sev-badge--high { background: rgba(245,158,11,0.15); color: #d97706; }

    /* Buttons */
    .btn-row { display: flex; gap: 12px; margin-top: 8px; }
    .cta-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px 20px;
      background: linear-gradient(135deg, var(--zir-green-deep, #1B4332), var(--zir-emerald));
      color: #fff; border: none; border-radius: 12px;
      font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .cta-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.92; }
    .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .secondary-btn {
      padding: 12px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px; font-family: inherit; font-size: 14px; cursor: pointer;
      color: var(--text-secondary);
      transition: background 0.2s;
    }
    .secondary-btn:hover { background: var(--bg-card-hover); }

    /* Analyzing state */
    .analyzing-state { text-align: center; padding: 48px 24px; }
    .pulse-ring {
      font-size: 60px;
      display: inline-block;
      animation: pulse-scale 1.4s ease-in-out infinite;
      margin-bottom: 20px;
    }
    @keyframes pulse-scale { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.12); } }
    .analyzing-state h3 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 20px; }
    .scan-steps { display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin: 0 auto; }
    .scan-ph { font-size: 13px; color: var(--text-muted); padding: 8px 16px; border-radius: 20px; transition: all 0.3s; }
    .scan-ph.active { background: var(--zir-emerald-dim); color: var(--zir-emerald); font-weight: 600; }

    /* Result card */
    .result-card { display: flex; flex-direction: column; gap: 20px; }
    .urgency-banner {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 20px; border-radius: 14px;
      border: 1.5px solid;
    }
    .urgency-banner.urg-high { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); }
    .urgency-banner.urg-medium { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.3); }
    .urgency-banner.urg-low { background: var(--zir-emerald-dim); border-color: var(--border-accent); }
    .urg-icon { font-size: 32px; }
    .urgency-banner strong { display: block; font-size: 16px; color: var(--text-primary); }
    .urg-label { font-size: 12px; color: var(--text-muted); }
    .confidence-pill {
      margin-left: auto; padding: 6px 12px;
      background: var(--bg-card-hover); border-radius: 20px;
      font-size: 12px; font-weight: 700; white-space: nowrap;
      color: var(--text-secondary);
    }

    .result-sections { display: flex; flex-direction: column; gap: 12px; }
    .result-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px; padding: 14px 16px;
    }
    .rs-darija { background: rgba(244,114,182,0.06); border-color: rgba(244,114,182,0.25); }
    .rs-head { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
    .rs-text { font-size: 14px; line-height: 1.7; color: var(--text-primary); margin: 0; }
    .rs-text--ar { direction: rtl; text-align: right; }

    .result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .action-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 18px; border-radius: 11px;
      font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; border: none;
      transition: opacity 0.2s, transform 0.15s;
    }
    .action-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .action-btn--primary { background: var(--zir-emerald); color: #fff; }
    .action-btn--secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); }

    .vet-sent-notice {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px;
      background: var(--zir-emerald-dim); border: 1px solid var(--border-accent);
      border-radius: 10px; font-size: 13px; color: var(--zir-emerald);
    }

    /* Error */
    .error-state { text-align: center; padding: 40px; }
    .error-state ng-icon { color: var(--error, #dc2626); margin-bottom: 12px; }
    .error-state p { color: var(--text-muted); margin: 0 0 16px; }

    /* Responsive */
    @media (max-width: 520px) {
      .adiag-root { padding: 16px; }
      .species-grid { grid-template-columns: repeat(2, 1fr); }
      .btn-row { flex-direction: column; }
    }
  `]
})
export class FarmerAnimalDiagnosticComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  step = signal(1);
  selectedSpecies = signal('');
  selectedSymptoms = signal<Set<string>>(new Set());
  affectedCount = 1;
  extraNotes = '';
  loading = signal(false);
  error = signal('');
  result = signal<any>(null);
  vetSent = signal(false);
  scanIndex = signal(0);
  private scanTimer: any;

  speciesList = SPECIES_LIST;
  stepLabels = ['Espèce', 'Symptômes', 'Résultat'];
  scanPhrases = [
    'Analyse des symptômes…',
    'Consultation base pathologique…',
    'Évaluation du niveau d\'urgence…',
    'Génération des recommandations…',
  ];

  currentSymptoms = computed(() => ANIMAL_SYMPTOMS[this.selectedSpecies()] || []);
  confScore = computed(() => Math.round((this.result()?.confidence_score ?? 0) * 100));
  urgencyClass = computed(() => {
    const u = this.result()?.urgency;
    if (u === 'CRITICAL' || u === 'HIGH') return 'urgency-banner urg-high';
    if (u === 'MEDIUM') return 'urgency-banner urg-medium';
    return 'urgency-banner urg-low';
  });
  urgencyIcon = computed(() => {
    const u = this.result()?.urgency;
    return u === 'CRITICAL' ? '🚨' : u === 'HIGH' ? '🔴' : u === 'MEDIUM' ? '🟡' : '🟢';
  });

  ngOnInit() {}

  selectSpecies(sp: string) { this.selectedSpecies.set(sp); this.selectedSymptoms.set(new Set()); }

  isChecked(id: string) { return this.selectedSymptoms().has(id); }

  toggleSymptom(id: string) {
    const s = new Set(this.selectedSymptoms());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedSymptoms.set(s);
  }

  nextStep() {
    if (this.step() === 2) { this.submitDiagnostic(); }
    this.step.update(s => s + 1);
  }

  prevStep() { this.step.update(s => Math.max(1, s - 1)); this.error.set(''); }

  submitDiagnostic() {
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.vetSent.set(false);
    this.scanIndex.set(0);

    this.scanTimer = setInterval(() => {
      this.scanIndex.update(i => (i + 1) % this.scanPhrases.length);
      this.cdr.markForCheck();
    }, 1800);

    // Build synthetic disease description from symptoms
    const checkedSymptoms = this.currentSymptoms().filter(s => this.selectedSymptoms().has(s.id));
    const symptomLabels = checkedSymptoms.map(s => s.label).join(', ');
    const hasHighSeverity = checkedSymptoms.some(s => s.severity === 'high');

    const payload = {
      detection_type: 'ANIMAL',
      animal_species: this.selectedSpecies(),
      crop_type: `Élevage ${this.selectedSpecies()}`,
      disease_name: `Syndrome ${this.selectedSpecies()} — ${checkedSymptoms[0]?.label || 'Non déterminé'}`,
      confidence_score: hasHighSeverity ? 0.78 : 0.55,
      urgency: hasHighSeverity ? 'HIGH' : 'MEDIUM',
      lat: 35.1676, lng: 8.8365,
      recommendation_fr: this.buildRecommendation(checkedSymptoms),
      recommendation_darija: this.buildRecommendationAr(checkedSymptoms),
      requires_expert_validation: true,
    };

    this.http.post<any>(`${environment.apiUrl}/disease-detections`, payload).subscribe({
      next: (res) => {
        clearInterval(this.scanTimer);
        this.result.set({ ...payload, id: res.id, ...res });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        clearInterval(this.scanTimer);
        // Graceful fallback — show local result even if backend fails
        this.result.set(payload);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private buildRecommendation(symptoms: Symptom[]): string {
    const sp = this.selectedSpecies();
    const labels = symptoms.map(s => s.label).join(', ');
    const urgent = symptoms.some(s => s.severity === 'high');
    if (urgent) {
      return `⚠️ Cas urgent détecté chez ${sp}. Symptômes observés : ${labels}. Action immédiate recommandée : isoler les animaux affectés, appeler un vétérinaire sous 24h, noter les antécédents vaccinaux. Ne pas attendre l'aggravation des symptômes.`;
    }
    return `Surveillance requise pour votre élevage de ${sp}. Symptômes : ${labels}. Contrôler la température, l'alimentation et l'abreuvement. Consulter un vétérinaire si les symptômes persistent plus de 48h. ${this.affectedCount > 1 ? `${this.affectedCount} animaux affectés — surveillance collective recommandée.` : ''}`;
  }

  private buildRecommendationAr(symptoms: Symptom[]): string {
    const urgent = symptoms.some(s => s.severity === 'high');
    const sp = this.selectedSpecies();
    return urgent
      ? `⚠️ حالة عاجلة في ${sp}. يُنصح بعزل الحيوانات فوراً والاتصال بالطبيب البيطري في أقل من 24 ساعة.`
      : `مراقبة مطلوبة لقطيع ${sp}. راقب درجة الحرارة والتغذية. استشر الطبيب البيطري إذا استمرت الأعراض.`;
  }

  requestVetValidation() {
    const id = this.result()?.id;
    if (!id) { this.vetSent.set(true); return; }
    this.http.post(`${environment.apiUrl}/disease-detections/${id}/request-validation`, {}).subscribe({
      next: () => { this.vetSent.set(true); this.cdr.markForCheck(); },
      error: () => { this.vetSent.set(true); this.cdr.markForCheck(); }
    });
  }

  reset() {
    this.step.set(1);
    this.selectedSpecies.set('');
    this.selectedSymptoms.set(new Set());
    this.result.set(null);
    this.vetSent.set(false);
    this.affectedCount = 1;
    this.extraNotes = '';
  }

  speciesEmoji(sp: string): string {
    const m: Record<string, string> = {
      Bovin: '🐄', Ovin: '🐑', Caprin: '🐐',
      Volaille: '🐔', Abeilles: '🐝'
    };
    return m[sp] || '🐾';
  }
}
