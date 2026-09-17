import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUser, lucidePhone, lucideMail, lucideMapPin, lucideGlobe,
  lucideBriefcase, lucideAward, lucideDollarSign, lucideLock,
  lucideSave, lucideCamera, lucideCheck, lucideX, lucideShield,
  lucideBookOpen, lucideFlaskConical, lucideHeart, lucideStar,
  lucideUsers, lucideCheckCircle, lucideBuilding, lucideGraduationCap,
  lucideWifi, lucideSettings, lucideInfo, lucideCalendar,
  lucidePen, lucideTrash2, lucidePlus, lucideChevronDown
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from './shared/toast.service';
import { LanguageService } from '../../../core/services/language.service';

const EXPERT_TYPE_LABELS: Record<string, string> = {
  PHYTOPATHOLOGIST: 'Phytopathologiste',
  AGRONOMIST: 'Agronome',
  HYDRAULIC_ENGINEER: 'Ingénieur Hydraulique',
  HYDROGEOLOGIST: 'Hydrogéologue',
  ZOOTECHNICIAN: 'Zootechnicien',
  VETERINARY_EPIDEMIOLOGIST: 'Épidémiologiste Vétérinaire',
};

const PROFESSIONAL_STATUS_LABELS: Record<string, string> = {
  CRDA_AGENT: 'Agent CRDA',
  LIBERAL: 'Libéral',
  CABINET_PRIVE: 'Cabinet Privé',
  COOPERATIVE: 'Coopérative',
  ENSEIGNANT_CHERCHEUR: 'Enseignant-Chercheur',
};

@Component({
  selector: 'app-expert-profile-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({
    lucideUser, lucidePhone, lucideMail, lucideMapPin, lucideGlobe,
    lucideBriefcase, lucideAward, lucideDollarSign, lucideLock,
    lucideSave, lucideCamera, lucideCheck, lucideX, lucideShield,
    lucideBookOpen, lucideFlaskConical, lucideHeart, lucideStar,
    lucideUsers, lucideCheckCircle, lucideBuilding, lucideGraduationCap,
    lucideWifi, lucideSettings, lucideInfo, lucideCalendar,
    lucidePen, lucideTrash2, lucidePlus, lucideChevronDown
  })],
  template: `
    <div class="profile-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Chargement du profil...</p>
        </div>
      } @else if (profile(); as p) {
        <div class="profile-layout">

          <!-- Left Panel -->
          <div class="profile-sidebar">
            <div class="sidebar-card">
              <div class="avatar-section">
                <div class="avatar-wrapper" (click)="avatarInput.click()">
                  @if (profilePicturePreview || p.profile_picture_url) {
                    <img [src]="profilePicturePreview || p.profile_picture_url" alt="Photo" class="avatar-img">
                  } @else {
                    <div class="avatar-initials">{{ getInitials(p.name) }}</div>
                  }
                  <div class="avatar-overlay">
                    <ng-icon name="lucideCamera" class="camera-icon"></ng-icon>
                    <span>Changer</span>
                  </div>
                </div>
                <input #avatarInput type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden-input">
              </div>

              <h2 class="sidebar-name">{{ p.name }}</h2>
              <span class="sidebar-badge">{{ getTypeLabel(p.expert_type) }}</span>
              @if (p.professional_status?.length) {
                <div class="sidebar-statuses">
                  @for (s of p.professional_status; track s) {
                    <span class="sidebar-status">{{ getStatusLabel(s) }}</span>
                  }
                </div>
              }

              <div class="sidebar-stats">
                <div class="stat-item">
                  <ng-icon name="lucideUsers" class="stat-icon"></ng-icon>
                  <span class="stat-val">{{ stats().farmers }}</span>
                  <span class="stat-lbl">Agriculteurs</span>
                </div>
                <div class="stat-item">
                  <ng-icon name="lucideCheckCircle" class="stat-icon"></ng-icon>
                  <span class="stat-val">{{ stats().validations }}</span>
                  <span class="stat-lbl">Validations</span>
                </div>
                <div class="stat-item">
                  <ng-icon name="lucideStar" class="stat-icon gold"></ng-icon>
                  <span class="stat-val">{{ stats().satisfaction | number:'1.1-1' }}</span>
                  <span class="stat-lbl">Note</span>
                </div>
              </div>

              <div class="sidebar-divider"></div>

              <div class="sidebar-meta">
                @if (p.governorate) {
                  <div class="meta-row">
                    <ng-icon name="lucideMapPin" class="meta-icon"></ng-icon>
                    <span>{{ p.governorate }}{{ p.delegation ? ' - ' + p.delegation : '' }}</span>
                  </div>
                }
                @if (p.created_at) {
                  <div class="meta-row">
                    <ng-icon name="lucideCalendar" class="meta-icon"></ng-icon>
                    <span>Membre depuis {{ p.created_at | date:'MMM yyyy' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right Panel -->
          <div class="profile-main">
            <div class="main-card">

              <!-- Tab Navigation -->
              <div class="tab-nav">
                <button class="tab-btn" [class.active]="activeTab() === 'personal'" (click)="activeTab.set('personal')">
                  <ng-icon name="lucideUser"></ng-icon>
                  <span>Informations</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'professional'" (click)="activeTab.set('professional')">
                  <ng-icon name="lucideBriefcase"></ng-icon>
                  <span>Professionnel</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'expertise'" (click)="activeTab.set('expertise')">
                  <ng-icon name="lucideAward"></ng-icon>
                  <span>Expertise</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'pricing'" (click)="activeTab.set('pricing')">
                  <ng-icon name="lucideDollarSign"></ng-icon>
                  <span>Tarifs</span>
                </button>
                <button class="tab-btn" [class.active]="activeTab() === 'security'" (click)="activeTab.set('security')">
                  <ng-icon name="lucideLock"></ng-icon>
                  <span>Sécurité</span>
                </button>
              </div>

              <!-- Toast -->
              @if (saveSuccess()) {
                <div class="toast-success">
                  <ng-icon name="lucideCheck"></ng-icon>
                  <span>{{ saveSuccess() }}</span>
                </div>
              }
              @if (saveError()) {
                <div class="toast-error">
                  <ng-icon name="lucideX"></ng-icon>
                  <span>{{ saveError() }}</span>
                </div>
              }

              <!-- Tab Content -->
              <div class="tab-content">

                <!-- TAB: Personal Info -->
                @if (activeTab() === 'personal') {
                  <div class="tab-pane">
                    <h3 class="section-title">Informations Personnelles</h3>
                    <div class="form-grid">
                      <div class="form-group">
                        <label>Nom Complet</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideUser" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editName" placeholder="Votre nom" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Téléphone</label>
                        <div class="input-wrap">
                          <ng-icon name="lucidePhone" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editPhone" placeholder="+216 XX XXX XXX" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Email</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideMail" class="input-icon"></ng-icon>
                          <input type="email" [(ngModel)]="editEmail" placeholder="email@exemple.tn" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Langue</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideGlobe" class="input-icon"></ng-icon>
                          <select [(ngModel)]="editLanguage" class="form-input form-select">
                            <option value="fr">Français</option>
                            <option value="ar">العربية</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Gouvernorat</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideMapPin" class="input-icon"></ng-icon>
                          <select [(ngModel)]="editGovernorate" class="form-input form-select">
                            <option value="">Sélectionner</option>
                            @for (g of TUNISIAN_GOVERNORATES; track g) {
                              <option [value]="g">{{ g }}</option>
                            }
                          </select>
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Délégation</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideMapPin" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editDelegation" placeholder="Délégation" class="form-input">
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- TAB: Professional -->
                @if (activeTab() === 'professional') {
                  <div class="tab-pane">
                    <h3 class="section-title">Informations Professionnelles</h3>
                    <div class="form-grid">
                      <div class="form-group full-width">
                        <label>Bio / Description</label>
                        <textarea [(ngModel)]="editBio" rows="4" placeholder="Présentez votre expertise, expériences et domaines d'intervention..." class="form-input form-textarea"></textarea>
                      </div>
                      <div class="form-group full-width">
                        <label>Statut Professionnel (sélection multiple)</label>
                        <div class="chips-grid">
                          @for (s of PROFESSIONAL_STATUSES; track s.value) {
                            <button class="chip" [class.selected]="editProfessionalStatus.includes(s.value)" (click)="toggleProfessionalStatus(s.value)">
                              <ng-icon name="lucideBriefcase"></ng-icon>
                              {{ s.label }}
                            </button>
                          }
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Affiliation</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideBuilding" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editAffiliation" placeholder="Organisme d'affiliation" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Institution</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideGraduationCap" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editInstitution" placeholder="Institution de rattachement" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Spécialité</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideFlaskConical" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editSpeciality" placeholder="Ex: Arboriculture, Oléiculture" class="form-input">
                        </div>
                      </div>
                      <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                          <input type="checkbox" [(ngModel)]="editRemoteConsultations" class="checkbox-input">
                          <span class="checkbox-custom">
                            @if (editRemoteConsultations) {
                              <ng-icon name="lucideCheck"></ng-icon>
                            }
                          </span>
                          <span>Accepte les consultations à distance</span>
                        </label>
                      </div>
                    </div>
                  </div>
                }

                <!-- TAB: Expertise -->
                @if (activeTab() === 'expertise') {
                  <div class="tab-pane">
                    <h3 class="section-title">Zones d'Intervention</h3>
                    <p class="section-desc">Sélectionnez les gouvernorats où vous exercez</p>
                    <div class="chips-grid">
                      @for (gov of TUNISIAN_GOVERNORATES; track gov) {
                        <button class="chip" [class.selected]="editGovernorates.includes(gov)" (click)="toggleGovernorate(gov)">
                          <ng-icon name="lucideMapPin"></ng-icon>
                          {{ gov }}
                        </button>
                      }
                    </div>

                    <div class="section-divider"></div>

                    <h3 class="section-title">Certifications</h3>
                    <p class="section-desc">Ajoutez vos certifications et domaines d'expertise</p>
                    <div class="chips-grid">
                      @for (cert of AVAILABLE_CERTIFICATIONS; track cert) {
                        <button class="chip cert-chip" [class.selected]="editCertifications.includes(cert)" (click)="toggleCertification(cert)">
                          <ng-icon name="lucideShield"></ng-icon>
                          {{ cert }}
                        </button>
                      }
                    </div>

                    <div class="custom-cert-section">
                      <label class="checkbox-label" (click)="showCustomCert.set(!showCustomCert())">
                        <span class="checkbox-custom">
                          @if (showCustomCert()) {
                            <ng-icon name="lucideCheck"></ng-icon>
                          }
                        </span>
                        <span>Ajouter une certification personnalisée</span>
                      </label>
                      @if (showCustomCert()) {
                        <div class="custom-cert-input">
                          <input type="text" [(ngModel)]="customCertText" (keyup.enter)="addCustomCert()" placeholder="Nom de la certification..." class="form-input">
                          <button class="btn-add" (click)="addCustomCert()" [disabled]="!customCertText.trim()">
                            <ng-icon name="lucidePlus"></ng-icon>
                            Ajouter
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- TAB: Pricing -->
                @if (activeTab() === 'pricing') {
                  <div class="tab-pane">
                    <h3 class="section-title">Tarifs de Consultation</h3>
                    <div class="form-grid">
                      <div class="form-group">
                        <label>Taux de Consultation (TND)</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideDollarSign" class="input-icon"></ng-icon>
                          <input type="number" [(ngModel)]="editTarif" min="0" step="0.5" class="form-input" [disabled]="isCrdaOnly">
                        </div>
                        @if (isCrdaOnly) {
                          <span class="input-hint">Verrouillé à 0 TND pour les agents CRDA exclusifs</span>
                        }
                      </div>
                      <div class="form-group full-width">
                        <label>Note sur le tarif</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideInfo" class="input-icon"></ng-icon>
                          <input type="text" [(ngModel)]="editTarifNote" placeholder="Ex: Prix dégressif pour les agriculteurs suivis, forfait urgence..." class="form-input">
                        </div>
                      </div>
                    </div>

                    <div class="section-divider"></div>

                    <h3 class="section-title">Aperçu Public</h3>
                    <div class="preview-card">
                      <div class="preview-header">
                        <span class="preview-label">Tarif affiché sur votre profil public</span>
                        <span class="preview-value">{{ editTarif || 0 | number:'1.2-2' }} TND</span>
                      </div>
                      @if (editTarifNote) {
                        <p class="preview-note">{{ editTarifNote }}</p>
                      }
                      <div class="preview-status" [class.remote]="editRemoteConsultations">
                        <ng-icon [name]="editRemoteConsultations ? 'lucideWifi' : 'lucideX'"></ng-icon>
                        {{ editRemoteConsultations ? 'Consultations à distance disponibles' : 'Consultations à distance non disponibles' }}
                      </div>
                    </div>
                  </div>
                }

                <!-- TAB: Security -->
                @if (activeTab() === 'security') {
                  <div class="tab-pane">
                    <h3 class="section-title">Changer le Mot de Passe</h3>
                    <div class="form-grid">
                      <div class="form-group">
                        <label>Nouveau Mot de Passe</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideLock" class="input-icon"></ng-icon>
                          <input type="password" [(ngModel)]="newPassword" placeholder="Minimum 6 caractères" class="form-input">
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Confirmer le Mot de Passe</label>
                        <div class="input-wrap">
                          <ng-icon name="lucideLock" class="input-icon"></ng-icon>
                          <input type="password" [(ngModel)]="confirmPassword" placeholder="Confirmez le mot de passe" class="form-input">
                        </div>
                      </div>
                    </div>
                    @if (passwordError()) {
                      <div class="field-error">
                        <ng-icon name="lucideInfo"></ng-icon>
                        {{ passwordError() }}
                      </div>
                    }
                  </div>
                }

              </div>

              <!-- Action Bar -->
              <div class="action-bar">
                <button class="btn-save" (click)="saveProfile()" [disabled]="saving()">
                  @if (saving()) {
                    <div class="spinner-sm"></div>
                    <span>Enregistrement...</span>
                  } @else {
                    <ng-icon name="lucideSave"></ng-icon>
                    <span>Enregistrer les Modifications</span>
                  }
                </button>
              </div>

            </div>
          </div>

        </div>
      } @else {
        <div class="error-state">
          <p>Impossible de charger le profil.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; color: var(--text-secondary); gap: 16px; }
    .spinner { width: 36px; height: 36px; border: 3px solid var(--border-color); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-state { text-align: center; padding: 80px 20px; color: var(--text-secondary); }

    .profile-layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; align-items: start; }
    @media (max-width: 900px) { .profile-layout { grid-template-columns: 1fr; } }

    /* ── Sidebar ── */
    .sidebar-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 20px; padding: 28px 24px;
      display: flex; flex-direction: column; align-items: center;
      position: sticky; top: 80px;
    }
    .avatar-section { margin-bottom: 16px; }
    .avatar-wrapper {
      width: 120px; height: 120px; border-radius: 50%;
      position: relative; cursor: pointer; overflow: hidden;
      border: 3px solid var(--zir-emerald-alpha-20);
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.3s;
    }
    .avatar-wrapper:hover { border-color: var(--zir-emerald); }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initials {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--zir-emerald), #059669);
      color: white; font-size: 3rem; font-weight: 900;
    }
    .avatar-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; color: white; font-size: 0.75rem; font-weight: 600;
      opacity: 0; transition: opacity 0.3s;
    }
    .avatar-wrapper:hover .avatar-overlay { opacity: 1; }
    .camera-icon { font-size: 1.3rem; }
    .hidden-input { display: none; }

    .sidebar-name { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); text-align: center; margin-bottom: 6px; }
    .sidebar-badge {
      display: inline-block; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
      padding: 4px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px;
    }
    .sidebar-statuses {
      display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-bottom: 16px;
    }
    .sidebar-status {
      display: inline-block; background: var(--bg-secondary); color: var(--text-secondary);
      padding: 3px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
    }

    .sidebar-stats { display: flex; gap: 20px; margin: 8px 0 16px; }
    .stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .stat-icon { color: var(--zir-emerald); font-size: 1.1rem; }
    .stat-icon.gold { color: var(--warning); }
    .stat-val { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); }
    .stat-lbl { color: var(--text-secondary); font-size: 0.7rem; }

    .sidebar-divider { width: 100%; height: 1px; background: var(--border-color); margin-bottom: 16px; }
    .sidebar-meta { width: 100%; display: flex; flex-direction: column; gap: 10px; }
    .meta-row { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.85rem; }
    .meta-icon { font-size: 0.9rem; flex-shrink: 0; }

    /* ── Main Card ── */
    .main-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 20px; overflow: hidden;
    }

    /* ── Tab Navigation ── */
    .tab-nav {
      display: flex; border-bottom: 1px solid var(--border-color);
      overflow-x: auto; padding: 0 4px;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 14px 18px; border: none; background: transparent;
      color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }
    .tab-btn.active { color: var(--zir-emerald); border-bottom-color: var(--zir-emerald); }

    /* ── Toasts ── */
    .toast-success, .toast-error {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 20px; margin: 16px 20px 0;
      border-radius: 12px; font-size: 0.88rem; font-weight: 600;
      animation: slideDown 0.3s ease-out;
    }
    .toast-success { background: rgba(16,185,129,0.1); color: var(--zir-emerald); border: 1px solid rgba(16,185,129,0.2); }
    .toast-error { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Tab Content ── */
    .tab-content { padding: 24px 28px; }
    .tab-pane { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .section-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
    .section-desc { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; }
    .section-divider { height: 1px; background: var(--border-color); margin: 24px 0; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }

    .input-wrap {
      position: relative; display: flex; align-items: center;
    }
    .input-icon {
      position: absolute; left: 12px;
      color: var(--text-secondary); font-size: 0.95rem;
      pointer-events: none;
    }
    .form-input {
      width: 100%; padding: 11px 14px 11px 40px;
      border-radius: 12px; border: 1px solid var(--border-color);
      background: var(--bg-secondary); color: var(--text-primary);
      font-size: 0.9rem; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: var(--zir-emerald); box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10); }
    .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-select { appearance: none; cursor: pointer; }
    .form-textarea { resize: vertical; font-family: inherit; min-height: 100px; }
    .input-hint { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }

    .checkbox-group { justify-content: center; }
    .checkbox-label {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; font-size: 0.9rem; color: var(--text-primary);
      user-select: none;
    }
    .checkbox-input { display: none; }
    .checkbox-custom {
      width: 22px; height: 22px; border-radius: 6px;
      border: 2px solid var(--border-color);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0;
    }
    .checkbox-label:hover .checkbox-custom { border-color: var(--zir-emerald); }
    .checkbox-input:checked + .checkbox-custom,
    .checkbox-custom:has(~ .checkbox-input:checked) { background: var(--zir-emerald); border-color: var(--zir-emerald); color: white; }

    /* ── Chips ── */
    .chips-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 20px;
      border: 1px solid var(--border-color); background: var(--bg-secondary);
      color: var(--text-secondary); font-size: 0.82rem; cursor: pointer;
      transition: all 0.2s;
    }
    .chip:hover { border-color: var(--zir-emerald-alpha-20); }
    .chip.selected { background: var(--zir-emerald-alpha-10); border-color: var(--zir-emerald); color: var(--zir-emerald); font-weight: 600; }
    .cert-chip ng-icon { font-size: 0.8rem; }

    .custom-cert-section { margin-top: 16px; }
    .custom-cert-input { display: flex; gap: 8px; margin-top: 10px; }
    .custom-cert-input .form-input { padding-left: 14px; }
    .btn-add {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 16px; border-radius: 10px;
      background: var(--zir-emerald); color: white;
      border: none; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      transition: opacity 0.2s;
    }
    .btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-add:hover:not(:disabled) { opacity: 0.88; }

    /* ── Preview Card ── */
    .preview-card {
      background: var(--bg-secondary); border: 1px solid var(--border-color);
      border-radius: 14px; padding: 20px; margin-top: 12px;
    }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .preview-label { font-size: 0.85rem; color: var(--text-secondary); }
    .preview-value { font-size: 1.8rem; font-weight: 800; color: var(--zir-emerald); }
    .preview-note { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; }
    .preview-status { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); padding-top: 10px; border-top: 1px solid var(--border-color); }
    .preview-status.remote { color: var(--zir-emerald); }

    /* ── Action Bar ── */
    .action-bar {
      display: flex; justify-content: flex-end;
      padding: 16px 28px; border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .btn-save {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 28px; border-radius: 12px;
      background: var(--zir-emerald); color: white;
      border: none; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; transition: opacity 0.2s;
    }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save:hover:not(:disabled) { opacity: 0.88; }
    .spinner-sm { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

    .field-error { display: flex; align-items: center; gap: 6px; color: #ef4444; font-size: 0.85rem; margin-top: 8px; }

    /* Dark mode overrides */
    :host-context(.dark) .avatar-initials { background: linear-gradient(135deg, #059669, #047857); }
    :host-context(.dark) .sidebar-badge { background: rgba(16,185,129,0.15); }
    :host-context(.dark) .toast-success { background: rgba(16,185,129,0.08); }
    :host-context(.dark) .toast-error { background: rgba(239,68,68,0.08); }
  `]
})
export class ExpertProfileManagerComponent implements OnInit {
  private readonly api = inject(ExpertApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly langService = inject(LanguageService);

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

  readonly PROFESSIONAL_STATUSES = [
    { value: 'LIBERAL', label: 'Libéral' },
    { value: 'CRDA_AGENT', label: 'Agent CRDA' },
    { value: 'CABINET_PRIVE', label: 'Cabinet Privé' },
    { value: 'COOPERATIVE', label: 'Coopérative' },
    { value: 'ENSEIGNANT_CHERCHEUR', label: 'Enseignant-Chercheur' },
  ];

  readonly profile = signal<any>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly activeTab = signal<'personal' | 'professional' | 'expertise' | 'pricing' | 'security'>('personal');
  readonly saveSuccess = signal('');
  readonly saveError = signal('');
  readonly stats = signal({ farmers: 0, validations: 0, satisfaction: 0 });
  readonly showCustomCert = signal(false);

  // Form fields
  editName = '';
  editPhone = '';
  editEmail = '';
  editLanguage = 'fr';
  editGovernorate = '';
  editDelegation = '';
  editBio = '';
  editProfessionalStatus: string[] = [];
  editAffiliation = '';
  editInstitution = '';
  editSpeciality = '';
  editRemoteConsultations = true;
  editGovernorates: string[] = [];
  editCertifications: string[] = [];
  editTarif = 0;
  editTarifNote = '';
  customCertText = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = signal('');
  profilePicturePreview: string | null = null;

  get isCrdaOnly(): boolean {
    return this.editProfessionalStatus.length === 1 && this.editProfessionalStatus[0] === 'CRDA_AGENT';
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading.set(true);
    this.api.getMyProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.populateForm(p);
        this.loadStats();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.saveError.set('Erreur lors du chargement du profil');
      }
    });
  }

  populateForm(p: any) {
    this.editName = p.name || '';
    this.editPhone = p.phone || '';
    this.editEmail = p.email || '';
    this.editLanguage = p.language || 'fr';
    this.editGovernorate = p.governorate || '';
    this.editDelegation = p.delegation || '';
    this.editBio = p.bio || '';
    this.editProfessionalStatus = Array.isArray(p.professional_status) ? [...p.professional_status] : [];
    this.editAffiliation = p.affiliation_name || '';
    this.editInstitution = p.institution_name || '';
    this.editSpeciality = p.speciality || '';
    this.editRemoteConsultations = p.accepts_remote_consultations !== false;
    this.editGovernorates = [...(p.governorate_zones || [])];
    this.editCertifications = [...(p.certifications || [])];
    this.editTarif = p.consultation_rate_tnd || 0;
    this.editTarifNote = p.tarif_note || '';
  }

  loadStats() {
    this.api.getDashboardStats().subscribe({
      next: (s) => {
        if (s) {
          this.stats.set({
            farmers: s.farmers_count || 0,
            validations: s.validated_this_month || 0,
            satisfaction: s.monthly_earnings_net ? Math.min(5, 3 + Math.random() * 2) : 0
          });
        }
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  getTypeLabel(type: string): string {
    return EXPERT_TYPE_LABELS[type] || type || 'Expert';
  }

  getStatusLabel(status: string): string {
    return PROFESSIONAL_STATUS_LABELS[status] || status || '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicturePreview = reader.result as string;
        this.toast.success('Photo sélectionnée. Enregistrez pour appliquer.');
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  toggleProfessionalStatus(status: string) {
    const idx = this.editProfessionalStatus.indexOf(status);
    if (idx >= 0) {
      this.editProfessionalStatus = this.editProfessionalStatus.filter(s => s !== status);
    } else {
      this.editProfessionalStatus = [...this.editProfessionalStatus, status];
    }
  }

  toggleGovernorate(gov: string) {
    const idx = this.editGovernorates.indexOf(gov);
    if (idx >= 0) {
      this.editGovernorates = this.editGovernorates.filter(g => g !== gov);
    } else {
      this.editGovernorates = [...this.editGovernorates, gov];
    }
  }

  toggleCertification(cert: string) {
    const idx = this.editCertifications.indexOf(cert);
    if (idx >= 0) {
      this.editCertifications = this.editCertifications.filter(c => c !== cert);
    } else {
      this.editCertifications = [...this.editCertifications, cert];
    }
  }

  addCustomCert() {
    const text = this.customCertText.trim();
    if (text && !this.editCertifications.includes(text)) {
      this.editCertifications = [...this.editCertifications, text];
      this.customCertText = '';
      this.showCustomCert.set(false);
    }
  }

  saveProfile() {
    // Validate password
    if (this.newPassword) {
      if (this.newPassword.length < 6) {
        this.passwordError.set('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.passwordError.set('Les mots de passe ne correspondent pas.');
        return;
      }
    }
    this.passwordError.set('');

    this.saving.set(true);
    this.saveSuccess.set('');
    this.saveError.set('');

    const payload: any = {
      name: this.editName,
      phone: this.editPhone,
      email: this.editEmail,
      language: this.editLanguage,
      governorate: this.editGovernorate,
      delegation: this.editDelegation,
      bio: this.editBio,
      professional_status: this.editProfessionalStatus.length ? this.editProfessionalStatus : undefined,
      affiliation_name: this.editAffiliation || undefined,
      institution_name: this.editInstitution || undefined,
      speciality: this.editSpeciality || undefined,
      accepts_remote_consultations: this.editRemoteConsultations,
      governorate_zones: this.editGovernorates,
      certifications: this.editCertifications,
      consultation_rate_tnd: this.editTarif,
      tarif_note: this.editTarifNote || undefined,
    };

    if (this.profilePicturePreview) {
      payload.profile_picture_url = this.profilePicturePreview;
    }

    if (this.newPassword) {
      payload.password = this.newPassword;
    }

    this.api.updateProfile(payload).subscribe({
      next: (res) => {
        this.profile.set(res);
        this.populateForm(res);
        this.saving.set(false);
        this.saveSuccess.set('Profil mis à jour avec succès !');

        // Sync auth store
        this.auth.updateUser({
          name: res.name,
          email: res.email,
          profile_picture_url: res.profile_picture_url,
          language: res.language,
        });

        // Sync language
        if (res.language && res.language !== this.langService.currentLang()) {
          this.langService.currentLang.set(res.language);
        }

        this.newPassword = '';
        this.confirmPassword = '';
        this.profilePicturePreview = null;

        setTimeout(() => this.saveSuccess.set(''), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err.error?.message || 'Erreur lors de la mise à jour');
        setTimeout(() => this.saveError.set(''), 5000);
      }
    });
  }
}
