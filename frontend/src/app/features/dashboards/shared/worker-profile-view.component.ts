import {
  Component, OnInit, inject, input, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { environment } from '../../../../environments/environment';
import {
  lucideMapPin, lucideStar, lucideCalendar, lucideBriefcase, lucideShield,
  lucideCheckCircle, lucideClock, lucideAward, lucideFileText, lucideImage,
  lucideX, lucideChevronDown, lucideArrowUp, lucideFilter, lucideMessageSquare,
  lucideUser, lucidePhone, lucideGlobe, lucideDroplets, lucideScissors,
  lucideSprout, lucideFlower2, lucideTractor, lucideHammer, lucideCat,
  lucideShieldCheck, lucideMoreHorizontal, lucideZap, lucideThumbsUp,
  lucideAlertTriangle, lucideTimer, lucideSparkles, lucideCheckSquare,
  lucideWheat, lucideEye, lucidePenLine, lucideLoader,
} from '@ng-icons/lucide';

interface WorkerPublicProfile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  governorate: string | null;
  delegation: string | null;
  primary_specialty: string | null;
  secondary_specialties: string[];
  daily_rate_tnd: number;
  action_radius_km: number;
  availability_status: string;
  rating: number;
  average_rating: number;
  total_missions_completed: number;
  total_jobs_done: number;
  worker_badge: string | null;
  is_ambassador_validated: boolean;
  id_card_verified: boolean;
  bio: string | null;
  languages: string[] | null;
  physical_capabilities: string[] | null;
  specialties: { code: string; name_fr: string; missions_count: number }[];
  certifications: CertificationEntry[];
  mission_history: MissionHistoryEntry[];
  evaluations: EvaluationEntry[];
  badge_counts: Record<string, number>;
  star_distribution: Record<number, number>;
  availability_calendar: AvailabilityDay[];
}

interface ApiProfileResponse {
  profile: {
    id: string;
    user_id: string;
    name: string | null;
    phone: string | null;
    governorate: string | null;
    skills: string[];
    rating: number;
    total_jobs_done: number;
    bio: string | null;
    daily_rate_tnd: number;
    is_available: boolean;
  };
  certifications: Array<{
    id: string;
    certification_name: string;
    issuing_organization: string;
    issued_date: string;
    document_url: string | null;
  }>;
  ratings: Array<{
    application_id: string;
    task_type: string;
    employer_name: string;
    rating: number;
    notes: string;
    mission_date: string;
  }>;
}

interface CertificationEntry {
  id: string;
  cert_type: string;
  certification_name: string;
  institution_name: string | null;
  year_obtained: number | null;
  document_url: string | null;
  is_public: boolean;
  is_verified_by_ambassador: boolean;
  verification_status: string;
}

interface MissionHistoryEntry {
  id: string;
  mission_title: string;
  employer_name: string | null;
  delegation: string;
  governorate: string;
  start_date: string;
  end_date: string;
  daily_rate_agreed: number | null;
  contract_type: string;
  employer_rating: number | null;
  employer_rating_badges: string[] | null;
  employer_comment: string | null;
  worker_reply: string | null;
  worker_visible: boolean;
}

interface EvaluationEntry {
  id: string;
  employer_name: string | null;
  rating: number;
  badges: string[];
  comment: string | null;
  worker_reply: string | null;
  created_at: string;
}

interface AvailabilityDay {
  date: string;
  available: boolean;
  dayNum: number;
  label: string;
  isToday: boolean;
}

@Component({
  selector: 'app-worker-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterModule],
  providers: [provideIcons({
    lucideMapPin, lucideStar, lucideCalendar, lucideBriefcase, lucideShield,
    lucideCheckCircle, lucideClock, lucideAward, lucideFileText, lucideImage,
    lucideX, lucideChevronDown, lucideArrowUp, lucideFilter, lucideMessageSquare,
    lucideUser, lucidePhone, lucideGlobe, lucideDroplets, lucideScissors,
    lucideSprout, lucideFlower2, lucideTractor, lucideHammer, lucideCat,
    lucideShieldCheck, lucideMoreHorizontal, lucideZap, lucideThumbsUp,
    lucideAlertTriangle, lucideTimer, lucideSparkles, lucideCheckSquare,
    lucideWheat, lucideEye, lucidePenLine, lucideLoader,
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="profile-shell">
      @if (loading()) {
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-30"></div>
          </div>
        </div>
        <div class="skeleton-tabs">
          <div class="skeleton-tab" *ngFor="let _ of [1,2,3,4]"></div>
        </div>
      } @else if (profile(); as p) {
        <!-- Header -->
        <div class="profile-header">
          <div class="header-photo" [class.verified-border]="p.id_card_verified">
            @if (p.photo_url) {
              <img [src]="p.photo_url" [alt]="p.name" />
            } @else {
              <div class="photo-placeholder">{{ (p.name || '?').charAt(0) }}</div>
            }
          </div>
          <div class="header-info">
            <h2>{{ p.name }}</h2>
            <div class="header-badges">
              <span class="specialty-badge" [style.--badge-color]="'var(--zir-emerald)'">
                <ng-icon name="lucideBriefcase" /> {{ p.primary_specialty || 'Non spécifié' }}
              </span>
              @if (p.worker_badge === 'CONFIRMED') {
                <span class="badge-confirmed"><ng-icon name="lucideAward" /> Travailleur Confirmé</span>
              } @else if (p.worker_badge === 'EXPERT') {
                <span class="badge-expert"><ng-icon name="lucideAward" /> Travailleur Expert</span>
              }
              @if (p.is_ambassador_validated) {
                <span class="badge-ambassador"><ng-icon name="lucideShieldCheck" /> Vérifié Ambassadeur</span>
              }
              @if (p.id_card_verified) {
                <span class="badge-id"><ng-icon name="lucideCheckCircle" /> Identité vérifiée</span>
              }
            </div>
            <div class="header-meta">
              <span><ng-icon name="lucideMapPin" /> {{ p.delegation ? p.delegation + ', ' : '' }}{{ p.governorate }}</span>
              <span class="rating-display">
                <ng-icon name="lucideStar" class="star-icon" />
                <strong>{{ p.average_rating > 0 ? p.average_rating.toFixed(1) : '—' }}</strong>
                <small>({{ p.total_missions_completed }} missions)</small>
              </span>
              <span class="availability-badge" [class.available]="p.availability_status === 'AVAILABLE_NOW'" [class.on-mission]="p.availability_status === 'ON_MISSION'">
                {{ availabilityLabel(p.availability_status) }}
              </span>
            </div>
            <div class="header-actions">
              <button class="btn btn-outline" (click)="proposeMission()">
                <ng-icon name="lucidePenLine" /> Proposer une Mission
              </button>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <nav class="tabs-bar">
          @for (tab of tabs; track tab.key) {
            <button class="tab-btn" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
              <ng-icon [name]="tab.icon" /> {{ tab.label }}
            </button>
          }
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
          @if (activeTab() === 'competences') {
            <section class="tab-panel">
              <!-- Specialties with real counts -->
              <div class="panel-section">
                <h4><ng-icon name="lucideBriefcase" /> Spécialités</h4>
                <div class="specialty-stats">
                  @for (s of p.specialties; track s.code) {
                    <div class="specialty-row">
                      <span class="specialty-name">{{ s.name_fr }}</span>
                      <span class="specialty-count">{{ s.missions_count }} mission{{ s.missions_count > 1 ? 's' : '' }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Physical Capabilities -->
              @if (p.physical_capabilities?.length) {
                <div class="panel-section">
                  <h4>Capacités physiques</h4>
                  <div class="chip-grid">
                    @for (cap of p.physical_capabilities; track cap) {
                      <span class="cap-chip">{{ capabilityLabel(cap) }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Action Radius & Languages -->
              <div class="panel-section">
                <div class="info-rows">
                  <div class="info-row">
                    <ng-icon name="lucideMapPin" />
                    <span>Intervient jusqu'à <strong>{{ p.action_radius_km }} km</strong> de {{ p.governorate }}</span>
                  </div>
                  @if (p.languages?.length) {
                    <div class="info-row">
                      <ng-icon name="lucideGlobe" />
                      <span>{{ (p.languages || []).join(', ') }}</span>
                    </div>
                  }
                  <div class="info-row">
                    <ng-icon name="lucideBriefcase" />
                    <span>Base déclarée : <strong>{{ p.daily_rate_tnd }} TND/jour</strong> — négociable</span>
                  </div>
                </div>
              </div>

              <!-- Bio -->
              @if (p.bio) {
                <div class="panel-section">
                  <p class="bio-text">{{ p.bio }}</p>
                </div>
              }

              <!-- Certifications -->
              @if (p.certifications.length) {
                <div class="panel-section">
                  <h4>Certifications</h4>
                  <div class="cert-list">
                    @for (cert of p.certifications; track cert.id) {
                      <div class="cert-card" [class.verified]="cert.is_verified_by_ambassador">
                        <div class="cert-icon"><ng-icon name="lucideFileText" /></div>
                        <div class="cert-info">
                          <strong>{{ cert.certification_name }}</strong>
                          <span>{{ cert.institution_name }} · {{ cert.year_obtained }}</span>
                          @if (cert.is_verified_by_ambassador) {
                            <span class="verify-badge verified"><ng-icon name="lucideShieldCheck" /> Vérifiée</span>
                          } @else {
                            <span class="verify-badge pending"><ng-icon name="lucideClock" /> En attente</span>
                          }
                        </div>
                        @if (cert.document_url) {
                          <button class="doc-btn" (click)="previewDoc.set(cert.document_url)"><ng-icon name="lucideImage" /></button>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </section>
          }

          @if (activeTab() === 'historique') {
            <section class="tab-panel">
              @if (p.mission_history.length === 0) {
                <div class="empty-state">
                  <ng-icon name="lucideBriefcase" class="empty-icon" />
                  <p>Aucune mission sur ZirIA pour l'instant — ce travailleur n'a pas encore d'historique vérifié.</p>
                </div>
              } @else {
                <div class="mission-list">
                  @for (m of p.mission_history; track m.id) {
                    <div class="mission-card" [style.--border-color]="missionColor(m.contract_type)">
                      <div class="mission-header">
                        <strong>{{ m.mission_title }}</strong>
                        <span class="mission-type-badge" [style.--badge-color]="missionColor(m.contract_type)">
                          {{ m.contract_type === 'JOB_MISSION' ? 'Récolte' : m.contract_type }}
                        </span>
                      </div>
                      <div class="mission-meta">
                        <span>{{ m.employer_name || 'Agriculteur vérifié ZirIA' }}</span>
                        <span><ng-icon name="lucideMapPin" /> {{ m.delegation }}, {{ m.governorate }}</span>
                        <span><ng-icon name="lucideCalendar" /> {{ m.start_date | date:'dd MMM yyyy' }} — {{ m.end_date | date:'dd MMM yyyy' }}</span>
                        @if (m.daily_rate_agreed) {
                          <span>{{ m.daily_rate_agreed }} TND/jour</span>
                        }
                      </div>
                      @if (m.employer_rating) {
                        <div class="eval-section">
                          <div class="eval-stars">
                            @for (s of [1,2,3,4,5]; track s) {
                              <span class="star" [class.filled]="s <= m.employer_rating">★</span>
                            }
                          </div>
                          @if (m.employer_rating_badges?.length) {
                            <div class="eval-badges">
                              @for (b of m.employer_rating_badges; track b) {
                                <span class="eval-badge">{{ badgeLabel(b) }}</span>
                              }
                            </div>
                          }
                          @if (m.employer_comment) {
                            <blockquote class="eval-comment">{{ m.employer_comment }}</blockquote>
                          }
                          @if (m.worker_reply) {
                            <div class="worker-reply">{{ m.worker_reply }}</div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          }

          @if (activeTab() === 'evaluations') {
            <section class="tab-panel">
              <div class="eval-summary">
                <div class="eval-score">
                  <div class="score-number">{{ p.average_rating > 0 ? p.average_rating.toFixed(1) : '—' }}</div>
                  <div class="score-stars">
                    @for (s of [1,2,3,4,5]; track s) {
                      <ng-icon name="lucideStar" class="star-icon" [class.filled]="s <= Math.round(p.average_rating)" />
                    }
                  </div>
                  <small>{{ p.total_missions_completed }} évaluations</small>
                </div>
                <div class="star-distribution">
                  @for (level of [5,4,3,2,1]; track level) {
                    <div class="dist-row">
                      <span class="dist-label">{{ level }}★</span>
                      <div class="dist-bar-bg">
                        <div class="dist-bar-fill" [style.width]="((p.star_distribution[level] || 0) / (p.total_missions_completed || 1) * 100) + '%'"></div>
                      </div>
                      <span class="dist-count">{{ p.star_distribution[level] || 0 }}</span>
                    </div>
                  }
                </div>
                <div class="badge-cloud">
                  @for (entry of topBadges(); track entry.code) {
                    <span class="badge-chip">{{ badgeLabel(entry.code) }} <small>{{ entry.count }}</small></span>
                  }
                </div>
              </div>
              <div class="eval-filter">
                <button *ngFor="let f of evalFilters" class="filter-btn" [class.active]="evalFilter() === f.val" (click)="evalFilter.set(f.val)">{{ f.label }}</button>
              </div>
              <div class="eval-list">
                @for (e of filteredEvaluations(); track e.id) {
                  <div class="eval-card">
                    <div class="eval-top">
                      <strong>{{ e.employer_name || 'Agriculteur vérifié ZirIA' }}</strong>
                      <span class="eval-date">{{ e.created_at | date:'dd MMM yyyy' }}</span>
                    </div>
                    <div class="eval-stars">
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="star" [class.filled]="s <= e.rating">★</span>
                      }
                    </div>
                    @if (e.badges.length) {
                      <div class="eval-badges">
                        @for (b of e.badges; track b) {
                          <span class="eval-badge">{{ badgeLabel(b) }}</span>
                        }
                      </div>
                    }
                    @if (e.comment) {
                      <blockquote class="eval-comment">{{ e.comment }}</blockquote>
                    }
                    @if (e.worker_reply) {
                      <div class="worker-reply">{{ e.worker_reply }}</div>
                    }
                  </div>
                }
              </div>
            </section>
          }

          @if (activeTab() === 'disponibilite') {
            <section class="tab-panel">
              <div class="calendar-shell">
                <div class="calendar-header">
                  <button (click)="prevMonth()"><ng-icon name="lucideChevronDown" class="rotate-right" /></button>
                  <span>{{ monthLabel() }}</span>
                  <button (click)="nextMonth()"><ng-icon name="lucideChevronDown" /></button>
                </div>
                <div class="calendar-grid">
                  @for (d of calendarDays(); track d.date) {
                    <div class="cal-day" [class.available]="d.available" [class.occupied]="!d.available" [class.today]="d.isToday">
                      <span class="cal-num">{{ d.dayNum }}</span>
                    </div>
                  }
                </div>
              </div>
              <button class="btn btn-outline btn-full"><ng-icon name="lucideCalendar" /> Demander une disponibilité</button>
            </section>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .profile-shell { max-width: 780px; margin: 0 auto; padding: 24px 16px; }
    .profile-header { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
    .header-photo { width: 96px; height: 96px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: var(--bg-muted); }
    .header-photo.verified-border { box-shadow: 0 0 0 3px var(--zir-emerald); }
    .header-photo img { width: 100%; height: 100%; object-fit: cover; }
    .photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: var(--text-muted); background: var(--bg-muted); }
    .header-info { flex: 1; min-width: 200px; }
    .header-info h2 { margin: 0 0 8px; font-size: 22px; }
    .header-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .specialty-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: color-mix(in srgb, var(--badge-color, var(--zir-emerald)) 15%, transparent); color: var(--badge-color, var(--zir-emerald)); }
    .badge-confirmed, .badge-expert, .badge-ambassador, .badge-id { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-confirmed { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .badge-expert { background: var(--warning-alpha); color: var(--warning); }
    .badge-ambassador { background: var(--info-alpha); color: var(--info); }
    .badge-id { background: var(--success-alpha); color: var(--success); }
    .header-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
    .header-meta ng-icon { width: 14px; height: 14px; vertical-align: middle; }
    .rating-display { display: inline-flex; align-items: center; gap: 4px; }
    .star-icon { color: var(--warning); }
    .availability-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .availability-badge.available { background: var(--success-alpha); color: var(--success); }
    .availability-badge.on-mission { background: var(--info-alpha); color: var(--info); }
    .header-actions { display: flex; gap: 8px; }
    .tabs-bar { display: flex; gap: 4px; margin: 20px 0 16px; border-bottom: 1px solid var(--border); overflow-x: auto; }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; background: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; transition: all .2s; }
    .tab-btn.active { color: var(--zir-emerald); border-bottom-color: var(--zir-emerald); }
    .tab-btn:hover { color: var(--text); }
    .tab-content { min-height: 300px; }
    .panel-section { margin-bottom: 24px; }
    .panel-section h4 { display: flex; align-items: center; gap: 6px; font-size: 15px; margin: 0 0 12px; color: var(--text); }
    .specialty-stats { display: flex; flex-direction: column; gap: 8px; }
    .specialty-row { display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-card); border-radius: 8px; }
    .specialty-name { font-weight: 500; font-size: 14px; }
    .specialty-count { font-size: 13px; color: var(--text-secondary); }
    .chip-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .cap-chip { padding: 4px 12px; border-radius: 16px; font-size: 12px; background: var(--bg-muted); color: var(--text-secondary); }
    .info-rows { display: flex; flex-direction: column; gap: 10px; }
    .info-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); }
    .info-row ng-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .bio-text { line-height: 1.6; color: var(--text-secondary); }
    .cert-list { display: flex; flex-direction: column; gap: 10px; }
    .cert-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-card); border-radius: 8px; border-left: 3px solid var(--border); }
    .cert-card.verified { border-left-color: var(--zir-emerald); }
    .cert-icon ng-icon { width: 20px; height: 20px; color: var(--text-muted); }
    .cert-info { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
    .cert-info strong { font-size: 14px; }
    .cert-info span { color: var(--text-secondary); }
    .verify-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 10px; margin-top: 4px; width: fit-content; }
    .verify-badge.verified { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .verify-badge.pending { background: var(--warning-alpha); color: var(--warning); }
    .doc-btn { border: none; background: var(--bg-muted); padding: 6px; border-radius: 6px; cursor: pointer; color: var(--text-secondary); }
    .mission-list { display: flex; flex-direction: column; gap: 12px; }
    .mission-card { padding: 14px; background: var(--bg-card); border-radius: 8px; border-left: 4px solid var(--border-color, var(--border)); }
    .mission-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .mission-type-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: color-mix(in srgb, var(--badge-color, var(--border)) 15%, transparent); color: var(--badge-color, var(--border)); }
    .mission-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; color: var(--text-secondary); }
    .mission-meta ng-icon { width: 12px; height: 12px; vertical-align: middle; }
    .eval-section { margin-top: 10px; padding: 10px; background: var(--bg-muted); border-radius: 8px; }
    .eval-stars { display: flex; gap: 2px; }
    .eval-stars .star { font-size: 16px; color: var(--border); }
    .eval-stars .star.filled { color: var(--warning); }
    .eval-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .eval-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; background: var(--bg-card); color: var(--text-secondary); }
    .eval-comment { margin: 6px 0 0; padding: 8px 12px; background: var(--bg-card); border-radius: 6px; border-left: 2px solid var(--border); font-style: italic; font-size: 13px; color: var(--text-secondary); }
    .worker-reply { margin-top: 6px; padding: 6px 12px; background: var(--zir-emerald-alpha-5); border-radius: 6px; font-size: 13px; color: var(--zir-emerald); }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon { width: 48px; height: 48px; color: var(--text-muted); }
    .empty-state p { color: var(--text-secondary); margin-top: 12px; }
    .eval-summary { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 24px; }
    .eval-score { text-align: center; min-width: 100px; }
    .score-number { font-size: 48px; font-weight: 700; line-height: 1; }
    .score-stars { display: flex; justify-content: center; gap: 2px; margin: 4px 0; }
    .score-stars .star-icon { width: 18px; height: 18px; color: var(--border); }
    .score-stars .star-icon.filled { color: var(--warning); }
    .star-distribution { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    .dist-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .dist-label { width: 24px; text-align: right; }
    .dist-bar-bg { flex: 1; height: 8px; background: var(--bg-muted); border-radius: 4px; overflow: hidden; }
    .dist-bar-fill { height: 100%; background: var(--warning); border-radius: 4px; transition: width .3s; }
    .dist-count { width: 24px; color: var(--text-secondary); font-size: 12px; }
    .badge-cloud { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; width: 100%; }
    .badge-chip { padding: 4px 10px; border-radius: 16px; font-size: 12px; background: var(--bg-muted); color: var(--text-secondary); }
    .badge-chip small { opacity: .6; }
    .eval-filter { display: flex; gap: 4px; margin-bottom: 12px; }
    .filter-btn { padding: 4px 12px; border-radius: 16px; border: 1px solid var(--border); background: none; font-size: 12px; color: var(--text-secondary); cursor: pointer; }
    .filter-btn.active { background: var(--zir-emerald); color: #fff; border-color: var(--zir-emerald); }
    .eval-list { display: flex; flex-direction: column; gap: 10px; }
    .eval-card { padding: 14px; background: var(--bg-card); border-radius: 8px; }
    .eval-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .eval-date { font-size: 12px; color: var(--text-muted); }
    .calendar-shell { margin-bottom: 16px; }
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .calendar-header button { border: none; background: none; cursor: pointer; color: var(--text-secondary); padding: 4px; }
    .rotate-right { transform: rotate(90deg); }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .cal-day { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 13px; cursor: default; }
    .cal-day.available { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .cal-day.occupied { background: var(--danger-alpha); color: var(--danger); }
    .cal-day.today { font-weight: 700; box-shadow: 0 0 0 2px var(--zir-emerald); }
    .skeleton-header { display: flex; gap: 24px; margin-bottom: 24px; }
    .skeleton-avatar { width: 96px; height: 96px; border-radius: 50%; background: var(--bg-muted); animation: pulse 1.5s infinite; }
    .skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .skeleton-line { height: 16px; background: var(--bg-muted); border-radius: 4px; animation: pulse 1.5s infinite; }
    .skeleton-line.w-40 { width: 40%; }
    .skeleton-line.w-60 { width: 60%; }
    .skeleton-line.w-30 { width: 30%; }
    .skeleton-tabs { display: flex; gap: 8px; }
    .skeleton-tab { height: 36px; width: 120px; background: var(--bg-muted); border-radius: 4px; animation: pulse 1.5s infinite; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; border: none; }
    .btn-primary { background: var(--zir-emerald); color: #fff; }
    .btn-primary:hover { opacity: .9; }
    .btn-outline { background: none; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { background: var(--bg-muted); }
    .btn-full { width: 100%; justify-content: center; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  `],
})
export class WorkerProfileViewComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  readonly workerId = input<string>('');
  readonly loading = signal(true);
  readonly proposing = signal(false);
  readonly profile = signal<WorkerPublicProfile | null>(null);
  readonly activeTab = signal('competences');
  readonly evalFilter = signal('all');
  readonly previewDoc = signal<string | null>(null);

  readonly Math = Math;

  readonly tabs = [
    { key: 'competences', label: 'Compétences & Profil', icon: 'lucideBriefcase' },
    { key: 'historique', label: 'Historique des Missions', icon: 'lucideFileText' },
    { key: 'evaluations', label: 'Évaluations', icon: 'lucideStar' },
    { key: 'disponibilite', label: 'Disponibilité', icon: 'lucideCalendar' },
  ];

  readonly evalFilters = [
    { val: 'all', label: 'Toutes' },
    { val: 'positive', label: '4+ étoiles' },
    { val: 'critical', label: 'Critiques' },
  ];

  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());

  readonly monthLabel = computed(() => {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${months[this.currentMonth()]} ${this.currentYear()}`;
  });

  readonly calendarDays = computed(() => {
    const cached = this.availabilityCache();
    const key = `${this.currentYear()}-${this.currentMonth()}`;
    if (cached[key]) return cached[key];

    const days: AvailabilityDay[] = [];
    const firstDay = new Date(this.currentYear(), this.currentMonth(), 1);
    const lastDay = new Date(this.currentYear(), this.currentMonth() + 1, 0);
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = lastDay.getDate();
    const today = new Date();
    for (let i = 0; i < startPad; i++) {
      days.push({ date: '', available: false, dayNum: 0, label: '', isToday: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(this.currentYear(), this.currentMonth(), d);
      const isToday = date.toDateString() === today.toDateString();
      days.push({
        date: date.toISOString().split('T')[0],
        available: true,
        dayNum: d,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        isToday,
      });
    }
    return days;
  });

  readonly availabilityCache = signal<Record<string, AvailabilityDay[]>>({});

  readonly topBadges = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return Object.entries(p.badge_counts || {})
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  readonly filteredEvaluations = computed(() => {
    const p = this.profile();
    if (!p) return [];
    const filter = this.evalFilter();
    if (filter === 'positive') return p.evaluations.filter(e => e.rating >= 4);
    if (filter === 'critical') return p.evaluations.filter(e => e.rating <= 2);
    return p.evaluations;
  });

  ngOnInit() {
    this.loadProfile();
  }

  proposeMission() {
    const id = this.workerId();
    if (!id) return;
    this.router.navigate(['/dashboard/farmer/services'], { queryParams: { proposeTo: id } });
  }

  loadProfile() {
    const id = this.workerId();
    if (!id) { this.loading.set(false); return; }
    this.http.get<ApiProfileResponse>(`${environment.apiUrl}/workers/profiles/${id}/public`).subscribe({
      next: (p) => {
        const profile = p.profile;
        this.profile.set({
          id: profile.id,
          user_id: profile.user_id,
          name: profile.name,
          phone: profile.phone,
          photo_url: null,
          governorate: profile.governorate ?? '',
          delegation: null,
          primary_specialty: null,
          secondary_specialties: [],
          daily_rate_tnd: profile.daily_rate_tnd,
          action_radius_km: 0,
          availability_status: profile.is_available ? 'AVAILABLE_NOW' : 'UNAVAILABLE',
          rating: profile.rating,
          average_rating: profile.rating,
          total_missions_completed: profile.total_jobs_done,
          total_jobs_done: profile.total_jobs_done,
          worker_badge: null,
          is_ambassador_validated: false,
          id_card_verified: false,
          bio: profile.bio,
          languages: null,
          physical_capabilities: null,
          specialties: (profile.skills || []).map((s: string) => ({ code: s, name_fr: s, missions_count: 0 })),
          certifications: (p.certifications || []).map(c => ({
            id: c.id,
            cert_type: c.certification_name,
            certification_name: c.certification_name,
            institution_name: c.issuing_organization,
            year_obtained: null,
            document_url: c.document_url,
            is_public: true,
            is_verified_by_ambassador: false,
            verification_status: 'VERIFIED',
          })),
          mission_history: [],
          evaluations: (p.ratings || []).map(r => ({
            id: r.application_id,
            employer_name: r.employer_name,
            rating: r.rating,
            badges: [],
            comment: r.notes,
            worker_reply: null,
            created_at: r.mission_date,
          })),
          badge_counts: {},
          star_distribution: {},
          availability_calendar: [],
        });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
    this.loadAvailability();
  }

  loadAvailability() {
    const id = this.workerId();
    if (!id) return;
    const key = `${this.currentYear()}-${this.currentMonth()}`;
    this.http.get<{ date: string; available: boolean }[]>(
      `${environment.apiUrl}/workers/profiles/${id}/availability`,
      { params: { year: this.currentYear(), month: this.currentMonth() + 1 } }
    ).subscribe({
      next: (data) => {
        this.availabilityCache.update(cache => ({
          ...cache,
          [key]: data.map(d => {
            const dt = d.date ? new Date(d.date) : null;
            const today = new Date();
            return {
              date: d.date,
              available: d.available,
              dayNum: dt ? dt.getDate() : 0,
              label: dt ? dt.toLocaleDateString('fr-FR', { weekday: 'short' }) : '',
              isToday: dt ? dt.toDateString() === today.toDateString() : false,
            };
          }),
        }));
        this.cdr.markForCheck();
      },
    });
  }

  availabilityLabel(status: string): string {
    const map: Record<string, string> = {
      AVAILABLE_NOW: 'Disponible immédiatement',
      AVAILABLE_FROM: 'Disponible à partir du',
      UNAVAILABLE_UNTIL: 'Non disponible jusqu\'au',
      ON_MISSION: 'En mission actuellement',
    };
    return map[status] || status;
  }

  capabilityLabel(cap: string): string {
    const map: Record<string, string> = {
      TRAVAUX_LOURDS: 'Travaux lourds',
      TRAVAUX_HAUTEUR: 'Travaux en hauteur',
      CONDUITE_VEHICULE: 'Conduite véhicule léger',
      CONDUITE_ENGIN: 'Conduite engin agricole',
      TRAVAUX_PRECISION: 'Travaux de précision',
      CONDITIONS_DIFFICILES: 'Conditions difficiles',
    };
    return map[cap] || cap;
  }

  badgeLabel(code: string): string {
    const map: Record<string, string> = {
      PONCTUEL: 'Ponctuel', TRAVAIL_SOIGNE: 'Travail soigné',
      RESPECTE_CONSIGNES: 'Respecte consignes', AUTONOME: 'Autonome',
      BONNE_CADENCE: 'Bonne cadence', PREND_SOIN_MATERIEL: 'Prend soin matériel',
      RECOMMANDE: 'Recommandé', RETARDS_FREQUENTS: 'Retards fréquents',
      TRAVAIL_BACLE: 'Travail bâclé', MAUVAISE_COMMUNICATION: 'Mauvaise communication',
    };
    return map[code] || code;
  }

  missionColor(type: string): string {
    const map: Record<string, string> = {
      JOB_MISSION: 'var(--zir-emerald)', RECOLTE_OLIVES: 'var(--zir-emerald)',
      TAILLE_ARBRES: 'var(--teal)', IRRIGATION: 'var(--blue)',
      TRAITEMENT_PHYTO: 'var(--orange)',
    };
    return map[type] || 'var(--border)';
  }

  prevMonth() {
    if (this.currentMonth() === 0) { this.currentMonth.set(11); this.currentYear.update(y => y - 1); }
    else { this.currentMonth.update(m => m - 1); }
    this.loadAvailability();
  }

  nextMonth() {
    if (this.currentMonth() === 11) { this.currentMonth.set(0); this.currentYear.update(y => y + 1); }
    else { this.currentMonth.update(m => m + 1); }
    this.loadAvailability();
  }
}
