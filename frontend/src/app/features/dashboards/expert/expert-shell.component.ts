import { Component, computed, inject, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideShieldAlert, lucideSave, lucideMicroscope, lucideSprout,
  lucideDroplets, lucideMapPin, lucideHeart, lucideSyringe,
  lucideCheckCircle, lucideArrowRight, lucideArrowLeft, lucideX,
  lucideBuilding2, lucideGraduationCap, lucideGlobe, lucideUsers
} from '@ng-icons/lucide';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { ToastService } from './shared/toast.service';
import { ToastComponent } from './shared/toast.component';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

const EXPERT_TYPES = [
  {
    value: 'PHYTOPATHOLOGIST',
    label: 'Phytopathologiste',
    icon: 'lucideMicroscope',
    description: 'Diagnostic et traitement des maladies fongiques, bactériennes et virales des cultures',
    domains: ['Maladies des plantes', 'Pathogènes', 'Traitements phytosanitaires']
  },
  {
    value: 'AGRONOMIST',
    label: 'Ingénieur Agronome',
    icon: 'lucideSprout',
    description: 'Optimisation des cultures, fertilisation et gestion des sols agricoles',
    domains: ['Cultures céréalières', 'Fertilisation', 'Gestion des sols']
  },
  {
    value: 'HYDRAULIC_ENGINEER',
    label: 'Ingénieur Hydraulique',
    icon: 'lucideDroplets',
    description: 'Conception et maintenance des systèmes d\'irrigation et de drainage',
    domains: ['Irrigation goutte-à-goutte', 'Grands périmètres', 'Études hydrauliques']
  },
  {
    value: 'HYDROGEOLOGIST',
    label: 'Hydrogéologue',
    icon: 'lucideMapPin',
    description: 'Prospection et gestion des ressources en eau souterraine',
    domains: ['Forage de puits', 'Piézométrie', 'Qualité de l\'eau']
  },
  {
    value: 'ZOOTECHNICIAN',
    label: 'Spécialiste Élevage',
    icon: 'lucideHeart',
    description: 'Nutrition animale, gestion des troupeaux et reproduction',
    domains: ['Élevage ovin/caprin', 'Rations alimentaires', 'Calendrier reproductif']
  },
  {
    value: 'VETERINARY_EPIDEMIOLOGIST',
    label: 'Vétérinaire Épidémiologiste',
    icon: 'lucideSyringe',
    description: 'Santé animale, vaccinations et surveillance épidémiologique',
    domains: ['Vaccinations', 'Maladies contagieuses', 'Quarantaine']
  }
];

const PROFESSIONAL_STATUSES = [
  {
    value: 'CRDA_AGENT',
    label: 'Agent CRDA',
    icon: 'lucideShieldAlert',
    description: 'Fonctionnaire du Commissariat Régional au Développement Agricole — service gratuit pour les agriculteurs de votre zone',
    badge: 'Gratuit'
  },
  {
    value: 'LIBERAL',
    label: 'Expert Libéral',
    icon: 'lucideGlobe',
    description: 'Consultant indépendant — vous fixez vos tarifs et choisissez vos zones d\'intervention',
    badge: 'Tarif libre'
  },
  {
    value: 'CABINET_PRIVE',
    label: 'Cabinet Privé',
    icon: 'lucideBuilding2',
    description: 'Bureau d\'études ou cabinet de conseil agréé en agriculture',
    badge: 'Bureau'
  },
  {
    value: 'COOPERATIVE',
    label: 'Coopérative (GIL/SMSA)',
    icon: 'lucideUsers',
    description: 'Structure collective agricole proposant des services à ses membres',
    badge: 'Coop'
  },
  {
    value: 'ENSEIGNANT_CHERCHEUR',
    label: 'Enseignant-Chercheur',
    icon: 'lucideGraduationCap',
    description: 'Chercheur ou enseignant universitaire en agronomie (INAT, ESAK, etc.)',
    badge: 'Académique'
  }
];

const TUNISIAN_GOV = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia',
  'Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tunis', 'Zaghouan', 'Tozeur'
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-expert-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, NgIconComponent, ToastComponent],
  providers: [
    provideIcons({
      lucideShieldAlert, lucideSave, lucideMicroscope, lucideSprout,
      lucideDroplets, lucideMapPin, lucideHeart, lucideSyringe,
      lucideCheckCircle, lucideArrowRight, lucideArrowLeft, lucideX,
      lucideBuilding2, lucideGraduationCap, lucideGlobe, lucideUsers
    })
  ],
  template: `
    <div class="exp-shell">
      <ng-container *ngIf="!user()?.expert_type; else mainLayout">
        <div class="setup-wrapper">
          <div class="setup-header">
            <div class="setup-brand">
              <ng-icon name="lucideShieldAlert"></ng-icon>
              <span>ZirIA Expert</span>
            </div>
            <p class="setup-subtitle">Configurez votre profil pour acceder a votre tableau de bord</p>
          </div>

          <div class="setup-card">
            <!-- Progress Steps -->
            <div class="steps">
              <div class="step" [class.active]="step() === 1" [class.done]="step() > 1">
                <div class="step-num">{{ step() > 1 ? '&#10003;' : '1' }}</div>
                <span>Statut</span>
              </div>
              <div class="step-line" [class.active]="step() > 1"></div>
              <div class="step" [class.active]="step() === 2" [class.done]="step() > 2">
                <div class="step-num">{{ step() > 2 ? '&#10003;' : '2' }}</div>
                <span>Spécialité</span>
              </div>
              <div class="step-line" [class.active]="step() > 2"></div>
              <div class="step" [class.active]="step() === 3" [class.done]="step() > 3">
                <div class="step-num">{{ step() > 3 ? '&#10003;' : '3' }}</div>
                <span>Zone</span>
              </div>
              <div class="step-line" [class.active]="step() > 3"></div>
              <div class="step" [class.active]="step() === 4">
                <div class="step-num">4</div>
                <span>Profil</span>
              </div>
            </div>

            <!-- Step 1: Professional Status -->
            <div *ngIf="step() === 1" class="step-content">
              <h2 class="step-title">Votre statut professionnel</h2>
              <p class="step-desc">Selectionnez votre statut pour adapter votre experience sur la plateforme</p>

              <div class="status-grid">
                @for (s of professionalStatuses; track s.value) {
                  <button class="status-card" [class.selected]="professionalStatus() === s.value"
                          (click)="professionalStatus.set(s.value)">
                    <div class="status-icon">
                      <ng-icon [name]="s.icon"></ng-icon>
                    </div>
                    <div class="status-info">
                      <span class="status-label">{{ s.label }}</span>
                      <span class="status-desc">{{ s.description }}</span>
                    </div>
                    <span class="status-badge">{{ s.badge }}</span>
                    <div class="status-check" *ngIf="professionalStatus() === s.value">
                      <ng-icon name="lucideCheckCircle"></ng-icon>
                    </div>
                  </button>
                }
              </div>

              <div class="btn-row">
                <button class="btn-next" [disabled]="!professionalStatus()" (click)="onStatusNext()">
                  Continuer <ng-icon name="lucideArrowRight"></ng-icon>
                </button>
              </div>
            </div>

            <!-- Step 2: Expertise Type -->
            <div *ngIf="step() === 2" class="step-content">
              <h2 class="step-title">Choisissez votre specialite</h2>
              <p class="step-desc">Selectionnez le domaine dans lequel vous intervenez principalement</p>

              <div class="type-grid">
                @for (t of expertTypes; track t.value) {
                  <button class="type-card" [class.selected]="expertType === t.value"
                          (click)="expertType = t.value">
                    <div class="type-icon">
                      <ng-icon [name]="t.icon"></ng-icon>
                    </div>
                    <div class="type-info">
                      <span class="type-label">{{ t.label }}</span>
                      <span class="type-desc">{{ t.description }}</span>
                      <div class="type-domains">
                        @for (d of t.domains; track d) {
                          <span class="domain-tag">{{ d }}</span>
                        }
                      </div>
                    </div>
                    <div class="type-check" *ngIf="expertType === t.value">
                      <ng-icon name="lucideCheckCircle"></ng-icon>
                    </div>
                  </button>
                }
              </div>

              <div class="btn-row">
                <button class="btn-back" (click)="step.set(1)">
                  <ng-icon name="lucideArrowLeft"></ng-icon> Retour
                </button>
                <button class="btn-next" [disabled]="!expertType" (click)="step.set(3)">
                  Continuer <ng-icon name="lucideArrowRight"></ng-icon>
                </button>
              </div>
            </div>

            <!-- Step 3: Zones -->
            <div *ngIf="step() === 3" class="step-content">
              <h2 class="step-title">Zones d'intervention</h2>

              <!-- CRDA zone picker -->
              <div *ngIf="professionalStatus() === 'CRDA_AGENT'" class="crda-zone-section">
                <p class="step-desc">Selectionnez votre zone CRDA d'affectation</p>
                <div class="crda-zone-picker">
                  <select [(ngModel)]="selectedCrdaZone" name="crdaZone" class="form-select">
                    <option value="">-- Choisissez votre daaira --</option>
                    @for (z of crdaZones(); track z.id) {
                      <option [value]="z.id">{{ z.region_name }} — {{ z.district_name }}</option>
                    }
                  </select>
                </div>
                <div class="crda-rate-notice" *ngIf="selectedCrdaZone">
                  <ng-icon name="lucideCheckCircle"></ng-icon>
                  <span>Taux de consultation verrouillé à 0 TND (service CRDA gratuit)</span>
                </div>
              </div>

              <!-- Liberal governorates -->
              <div *ngIf="professionalStatus() !== 'CRDA_AGENT'" class="gov-section">
                <p class="step-desc">Selectionnez les gouvernorats ou vous intervenez (minimum 1)</p>

                <div class="gov-grid">
                  @for (gov of governorates; track gov) {
                    <button class="gov-chip" [class.selected]="selectedGovs.has(gov)"
                            (click)="toggleGov(gov)">
                      <ng-icon name="lucideMapPin"></ng-icon>
                      {{ gov }}
                    </button>
                  }
                </div>
                <div class="selected-count" *ngIf="selectedGovs.size > 0">
                  {{ selectedGovs.size }} gouvernorat{{ selectedGovs.size > 1 ? 's' : '' }} selectionne{{ selectedGovs.size > 1 ? 's' : '' }}
                </div>
              </div>

              <div class="btn-row">
                <button class="btn-back" (click)="step.set(2)">
                  <ng-icon name="lucideArrowLeft"></ng-icon> Retour
                </button>
                <button class="btn-next" [disabled]="!canGoNext()" (click)="step.set(4)">
                  Continuer <ng-icon name="lucideArrowRight"></ng-icon>
                </button>
              </div>
            </div>

            <!-- Step 4: Profile -->
            <div *ngIf="step() === 4" class="step-content">
              <h2 class="step-title">Finalisez votre profil</h2>

              <!-- Affiliation name (Cabinet / Cooperative) -->
              <div *ngIf="professionalStatus() === 'CABINET_PRIVE'" class="form-group">
                <label>Nom du Cabinet / Bureau d'études</label>
                <input type="text" [(ngModel)]="affiliationName" name="affiliationName"
                       class="form-input" placeholder="Ex: Cabinet Agro-Conseil Tunisie">
              </div>

              <div *ngIf="professionalStatus() === 'COOPERATIVE'" class="form-group">
                <label>Nom de la Coopérative</label>
                <input type="text" [(ngModel)]="affiliationName" name="affiliationNameCoop"
                       class="form-input" placeholder="Ex: SMSA El Baraka">
              </div>

              <!-- Institution name (Enseignant-Chercheur) -->
              <div *ngIf="professionalStatus() === 'ENSEIGNANT_CHERCHEUR'" class="form-group">
                <label>Institution universitaire</label>
                <input type="text" [(ngModel)]="institutionName" name="institutionName"
                       class="form-input" placeholder="Ex: INAT, ESAK, ESAM...">
              </div>

              <!-- Remote consultations toggle (Liberal) -->
              <div *ngIf="professionalStatus() === 'LIBERAL'" class="form-group">
                <label class="toggle-row">
                  <input type="checkbox" [(ngModel)]="acceptsRemote" name="acceptsRemote" class="toggle-input">
                  <span class="toggle-label">J'accepte les consultations a distance</span>
                </label>
              </div>

              <!-- Certifications -->
              <div class="form-group">
                <label>Certifications & Diplomes</label>
                <div class="tags-input">
                  @for (cert of certs; track cert; let i = $index) {
                    <span class="cert-tag">
                      {{ cert }}
                      <button class="tag-remove" (click)="removeCert(i)">
                        <ng-icon name="lucideX"></ng-icon>
                      </button>
                    </span>
                  }
                  <input type="text" [(ngModel)]="certInput" name="certInput"
                         class="tag-field" placeholder="Ajouter un diplome..."
                         (keydown.enter)="addCert(); $event.preventDefault()">
                </div>
                <span class="field-hint">Appuyez sur Entree pour ajouter</span>
              </div>

              <!-- Bio -->
              <div class="form-group">
                <label>Biographie professionnelle</label>
                <textarea [(ngModel)]="bio" name="bio" class="form-textarea" rows="4"
                          placeholder="Decrivez votre parcours, vos domaines de competences, et les types de cultures/elevages que vous traitez..."></textarea>
                <span class="field-hint">{{ bio.length }}/500 caracteres</span>
              </div>

              <div class="btn-row">
                <button class="btn-back" (click)="step.set(3)">
                  <ng-icon name="lucideArrowLeft"></ng-icon> Retour
                </button>
                <button class="btn-submit" [disabled]="loading() || !bio" (click)="onSubmit()">
                  <ng-icon name="lucideSave" *ngIf="!loading()"></ng-icon>
                  <span>{{ loading() ? 'Enregistrement...' : 'Activer mon tableau de bord' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #mainLayout>
        <router-outlet></router-outlet>
      </ng-template>
    </div>
    <app-toast></app-toast>
  `,
  styles: [`
    .exp-shell {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .setup-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      min-height: 100vh;
    }

    .setup-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .setup-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--zir-emerald);
      margin-bottom: 8px;
    }

    .setup-brand ng-icon { width: 28px; height: 28px; }

    .setup-subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    .setup-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      width: 100%;
      max-width: 720px;
      box-shadow: var(--shadow-lg);
    }

    /* Steps indicator */
    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 32px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      background: var(--bg-primary);
      border: 2px solid var(--border);
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .step.active .step-num {
      background: var(--zir-emerald);
      border-color: var(--zir-emerald);
      color: white;
    }

    .step.done .step-num {
      background: var(--zir-emerald-alpha-20);
      border-color: var(--zir-emerald);
      color: var(--zir-emerald);
    }

    .step span {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .step.active span { color: var(--zir-emerald); }

    .step-line {
      width: 60px;
      height: 2px;
      background: var(--border);
      margin: 0 8px;
      margin-bottom: 20px;
      transition: background 0.2s;
    }

    .step-line.active { background: var(--zir-emerald); }

    /* Step content */
    .step-content { animation: fadeIn 0.25s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .step-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .step-desc {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 24px;
    }

    /* Status cards */
    .status-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }

    .status-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      background: var(--bg-primary);
      border: 2px solid var(--border);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      width: 100%;
      color: var(--text-primary);
      font-family: inherit;
      position: relative;
    }

    .status-card:hover {
      border-color: var(--zir-emerald-alpha-20);
      background: var(--bg-card-hover);
    }

    .status-card.selected {
      border-color: var(--zir-gold, #D4AF37);
      background: rgba(212, 175, 55, 0.06);
    }

    .status-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--zir-emerald);
    }

    .status-card.selected .status-icon {
      background: var(--zir-gold, #D4AF37);
      color: white;
      border-color: var(--zir-gold, #D4AF37);
    }

    .status-info { flex: 1; min-width: 0; }

    .status-label {
      font-weight: 700;
      font-size: 0.9rem;
      display: block;
      margin-bottom: 2px;
    }

    .status-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      display: block;
    }

    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .status-card.selected .status-badge {
      background: var(--zir-emerald-alpha-20);
      border-color: var(--zir-emerald);
      color: var(--zir-emerald);
    }

    .status-check {
      color: var(--zir-gold, #D4AF37);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .status-check ng-icon { width: 20px; height: 20px; }

    /* CRDA zone picker */
    .crda-zone-section {
      margin-bottom: 24px;
    }

    .crda-zone-picker {
      margin-bottom: 8px;
    }

    .form-select {
      width: 100%;
      padding: 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }

    .form-select:focus {
      border-color: var(--zir-emerald);
      outline: none;
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .crda-rate-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--zir-emerald-alpha-10);
      border: 1px solid var(--zir-emerald-alpha-20);
      border-radius: 10px;
      color: var(--zir-emerald);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .crda-rate-notice ng-icon { width: 18px; height: 18px; flex-shrink: 0; }

    /* Governorate chips */
    .gov-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .gov-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      background: var(--bg-primary);
      border: 1.5px solid var(--border);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .gov-chip ng-icon { width: 14px; height: 14px; }

    .gov-chip:hover {
      border-color: var(--zir-emerald-alpha-20);
      color: var(--text-primary);
    }

    .gov-chip.selected {
      background: var(--zir-emerald);
      border-color: var(--zir-emerald);
      color: white;
    }

    .selected-count {
      text-align: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--zir-emerald);
      margin-bottom: 20px;
    }

    /* Tags input */
    .tags-input {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      min-height: 44px;
      align-items: center;
      transition: border-color 0.2s;
    }

    .tags-input:focus-within {
      border-color: var(--zir-emerald);
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .cert-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--zir-emerald-alpha-10);
      color: var(--zir-emerald);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .tag-remove {
      background: none;
      border: none;
      color: var(--zir-emerald);
      cursor: pointer;
      display: flex;
      padding: 0;
      opacity: 0.7;
    }

    .tag-remove:hover { opacity: 1; }
    .tag-remove ng-icon { width: 14px; height: 14px; }

    .tag-field {
      flex: 1;
      min-width: 120px;
      background: none;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
    }

    .tag-field::placeholder { color: var(--text-muted); }

    .field-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
      display: block;
    }

    /* Form */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 20px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-input {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: var(--zir-emerald);
      outline: none;
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .form-textarea {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s;
    }

    .form-textarea:focus {
      border-color: var(--zir-emerald);
      outline: none;
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .toggle-input {
      width: 18px;
      height: 18px;
      accent-color: var(--zir-emerald);
    }

    .toggle-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary);
      text-transform: none;
      letter-spacing: 0;
    }

    /* Buttons */
    .btn-next, .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      background: var(--zir-emerald);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: opacity 0.15s;
      font-family: inherit;
    }

    .btn-next:hover, .btn-submit:hover { opacity: 0.9; }
    .btn-next:disabled, .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-next ng-icon, .btn-submit ng-icon { width: 18px; height: 18px; }

    .btn-back {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 20px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }
    .btn-back ng-icon { width: 16px; height: 16px; }

    .btn-row {
      display: flex;
      gap: 12px;
    }

    .btn-row .btn-next,
    .btn-row .btn-submit { flex: 1; }

    /* Type grid — specialty cards */
    .type-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .type-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
      background: var(--bg-primary);
      border: 2px solid var(--border);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
      color: var(--text-primary);
      font-family: inherit;
      position: relative;
      overflow: hidden;
    }

    .type-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: transparent;
      transition: background 0.2s ease;
    }

    .type-card:hover {
      border-color: var(--zir-emerald-alpha-30);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .type-card.selected {
      border-color: var(--zir-gold, #D4AF37);
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(16, 185, 129, 0.03));
      box-shadow: 0 8px 24px rgba(212, 175, 55, 0.15);
    }

    .type-card.selected::before {
      background: linear-gradient(90deg, var(--zir-gold, #D4AF37), var(--zir-emerald));
    }

    .type-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--zir-green-deep), var(--zir-emerald));
      color: white;
      font-size: 20px;
      transition: all 0.2s ease;
    }

    .type-card.selected .type-icon {
      background: linear-gradient(135deg, #D4AF37, #F59E0B);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .type-icon ng-icon { width: 22px; height: 22px; display: block; }

    .type-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .type-label {
      font-weight: 800;
      font-size: 1rem;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .type-card.selected .type-label {
      color: var(--zir-gold, #D4AF37);
    }

    .type-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .type-domains {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }

    .domain-tag {
      display: inline-flex;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--zir-emerald-alpha-10);
      color: var(--zir-emerald);
      font-size: 0.7rem;
      font-weight: 600;
      transition: all 0.15s;
    }

    .type-card.selected .domain-tag {
      background: rgba(212, 175, 55, 0.12);
      color: #D4AF37;
    }

    .type-check {
      position: absolute;
      top: 12px;
      right: 12px;
      color: var(--zir-gold, #D4AF37);
      width: 22px;
      height: 22px;
    }

    .type-check ng-icon { width: 22px; height: 22px; display: block; }

    @media (max-width: 600px) {
      .type-grid { grid-template-columns: 1fr; }
      .setup-wrapper { padding: 20px 12px; }
      .setup-card { padding: 20px 16px; }
      .gov-grid { gap: 6px; }
      .gov-chip { padding: 6px 10px; font-size: 0.78rem; }
    }
  `]
})
export class ExpertShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly api = inject(ExpertApiService);
  private readonly toastService = inject(ToastService);

  readonly user = computed(() => this.auth.currentUser());
  readonly loading = signal(false);
  readonly step = signal(1);

  readonly expertTypes = EXPERT_TYPES;
  readonly professionalStatuses = PROFESSIONAL_STATUSES;
  readonly governorates = TUNISIAN_GOV;
  readonly selectedGovs = new Set<string>();

  readonly professionalStatus = signal('');
  readonly selectedCrdaZone = signal('');
  readonly affiliationName = signal('');
  readonly institutionName = signal('');
  readonly acceptsRemote = signal(true);
  readonly crdaZones = signal<any[]>([]);

  expertType = '';
  certInput = '';
  certs: string[] = [];
  bio = '';

  private socket: Socket | null = null;

  ngOnInit() {
    if (this.user()?.expert_type) {
      this.connectWebSocket();
    }
    // Preload CRDA zones for status selection
    this.api.getCrdaZones().subscribe({
      next: (zones) => this.crdaZones.set(zones),
    });
  }

  ngOnDestroy() {
    this.disconnectWebSocket();
  }

  canGoNext() {
    if (this.professionalStatus() === 'CRDA_AGENT') {
      return !!this.selectedCrdaZone();
    }
    return this.selectedGovs.size > 0;
  }

  onStatusNext() {
    const status = this.professionalStatus();
    if (status === 'CRDA_AGENT') {
      // Skip governorate selection — CRDA uses crda_zone instead
      this.step.set(3);
    } else {
      this.step.set(2);
    }
  }

  toggleGov(gov: string) {
    if (this.selectedGovs.has(gov)) {
      this.selectedGovs.delete(gov);
    } else {
      this.selectedGovs.add(gov);
    }
  }

  addCert() {
    const val = this.certInput.trim();
    if (val && !this.certs.includes(val)) {
      this.certs.push(val);
      this.certInput = '';
    }
  }

  removeCert(i: number) {
    this.certs.splice(i, 1);
  }

  connectWebSocket() {
    const token = this.authStore.token();
    if (!token) return;

    const wsUrl = environment.apiUrl.replace(/\/api$/, '');
    this.socket = io(`${wsUrl}/expert-dashboard`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 8000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      const zone = this.user()?.language || 'kasserine';
      this.socket?.emit('join_zone', zone);
      this.socket?.emit('join_expert', this.user()?.id);
    });

    this.socket.on('stats_update', () => {
      this.api.notifyPendingRequestRefresh();
    });

    this.socket.on('new_pending_request', (data: { farmer_name: string }) => {
      this.api.notifyPendingRequestRefresh();
      this.toastService.info('Nouvelle demande', `${data.farmer_name} souhaite être suivi`);
    });
  }

  disconnectWebSocket() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onSubmit() {
    if (!this.expertType) return;
    if (this.professionalStatus() !== 'CRDA_AGENT' && this.selectedGovs.size === 0) return;
    if (this.professionalStatus() === 'CRDA_AGENT' && !this.selectedCrdaZone()) return;
    if (!this.bio) return;

    this.loading.set(true);

    const governorate_zones = this.professionalStatus() === 'CRDA_AGENT'
      ? []
      : Array.from(this.selectedGovs);

    const payload: any = {
      expert_type: this.expertType,
      professional_status: this.professionalStatus(),
      crda_zone_id: this.selectedCrdaZone() || undefined,
      affiliation_name: this.affiliationName() || undefined,
      institution_name: this.institutionName() || undefined,
      accepts_remote_consultations: this.acceptsRemote(),
      governorate_zones,
      certifications: this.certs,
      bio: this.bio
    };

    this.api.completeProfile(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.updateUser({ expert_type: this.expertType });
        this.toastService.success('Profil activé', 'Votre profil expert a été configuré avec succès.');
        this.connectWebSocket();
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Erreur', 'Impossible d\'enregistrer le profil.');
      }
    });
  }
}
