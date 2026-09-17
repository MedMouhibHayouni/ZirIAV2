import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ContractsApiService, MissionContract } from '../../../core/services/contracts-api.service';
import { NotificationStore } from '../../../core/state/notification.store';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTruck, lucideMapPin, lucidePackage, lucideClock,
  lucideCheckCircle, lucideLoader, lucideArrowRight, lucideX,
  lucideWeight, lucideRoute, lucideMessageSquare, lucideSend,
  lucideStar, lucideNavigation, lucideHistory, lucideGlobe,
  lucideCircleDot, lucideFileText, lucideDollarSign, lucideZap,
  lucideEye, lucidePlay
} from '@ng-icons/lucide';

export interface TransportRequest {
  id: string;
  cargo_type: string;
  quantity_kg: number;
  weight_tonnes?: number;
  origin_address: string;
  destination_address: string;
  loading_datetime: string;
  proposed_price_tnd: number | null;
  required_vehicle_type: string;
  is_express: boolean;
  status: string;
  requester_id: string;
  requester?: { name: string; phone: string; id: string };
  created_at: string;
}

@Component({
  selector: 'app-driver-missions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideTruck, lucideMapPin, lucidePackage, lucideClock,
    lucideCheckCircle, lucideLoader, lucideArrowRight, lucideX,
    lucideWeight, lucideRoute, lucideMessageSquare, lucideSend,
    lucideStar, lucideNavigation, lucideHistory, lucideGlobe,
    lucideCircleDot, lucideFileText, lucideDollarSign, lucideZap,
    lucideEye, lucidePlay
  })],
  template: `
    <div class="driver-missions zir-animate-in">

      <!-- Header -->
      <div class="missions-header">
        <div class="header-info">
          <h1><ng-icon name="lucideTruck"></ng-icon> Missions Transport</h1>
          <p>Découvrez les demandes de transport et gérez vos missions actives.</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'available'" (click)="switchTab('available')">
          <ng-icon name="lucideGlobe"></ng-icon>
          Missions Disponibles
          @if (availableRequests().length) {
            <span class="tab-count">{{ availableRequests().length }}</span>
          }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'active'" (click)="switchTab('active')">
          <ng-icon name="lucideNavigation"></ng-icon>
          En Cours
          @if (activeMissions().length) {
            <span class="tab-count">{{ activeMissions().length }}</span>
          }
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'history'" (click)="switchTab('history')">
          <ng-icon name="lucideHistory"></ng-icon>
          Historique
          @if (historyMissions().length) {
            <span class="tab-count">{{ historyMissions().length }}</span>
          }
        </button>
      </div>

      <!-- ═══════════════ TAB 1: Missions Disponibles ═══════════════ -->
      @if (activeTab() === 'available') {
        @if (isLoadingAvailable()) {
          <div class="loading-state">
            <div class="zir-spinner"></div>
            <p>Chargement des missions disponibles...</p>
          </div>
        } @else {
          <div class="missions-grid">
            @for (req of availableRequests(); track req.id) {
              <div class="mission-card">
                <!-- Price / Express Banner -->
                <div class="card-banner">
                  <div class="price-block">
                    @if (req.proposed_price_tnd) {
                      <span class="price-amount">{{ req.proposed_price_tnd | number:'1.0-0' }}</span>
                      <span class="price-currency">TND</span>
                    } @else {
                      <span class="price-free">Prix libre</span>
                    }
                  </div>
                  <div class="banner-badges">
                    @if (req.is_express) {
                      <span class="badge badge--express">
                        <ng-icon name="lucideZap"></ng-icon> Express
                      </span>
                    }
                    <span class="badge badge--cargo">
                      <ng-icon name="lucidePackage"></ng-icon>
                      {{ req.cargo_type }}
                    </span>
                  </div>
                </div>

                <!-- Route -->
                <div class="route-section">
                  <div class="route-point origin">
                    <div class="point-dot origin-dot"></div>
                    <div class="point-info">
                      <label>Départ</label>
                      <span>{{ req.origin_address }}</span>
                    </div>
                  </div>
                  <div class="route-line">
                    <ng-icon name="lucideArrowRight"></ng-icon>
                  </div>
                  <div class="route-point destination">
                    <div class="point-dot dest-dot"></div>
                    <div class="point-info">
                      <label>Arrivée</label>
                      <span>{{ req.destination_address }}</span>
                    </div>
                  </div>
                </div>

                <!-- Meta -->
                <div class="mission-meta">
                  <div class="meta-item">
                    <ng-icon name="lucideWeight"></ng-icon>
                    <span>{{ req.quantity_kg | number:'1.0-0' }} kg</span>
                  </div>
                  <div class="meta-item">
                    <ng-icon name="lucideTruck"></ng-icon>
                    <span>{{ req.required_vehicle_type || 'Standard' }}</span>
                  </div>
                  @if (req.loading_datetime) {
                    <div class="meta-item">
                      <ng-icon name="lucideClock"></ng-icon>
                      <span>{{ req.loading_datetime | date:'dd MMM HH:mm' }}</span>
                    </div>
                  }
                </div>

                <!-- Footer -->
                <div class="card-footer">
                  @if (req.requester?.name) {
                    <div class="requester-info">
                      <div class="requester-avatar">{{ req.requester!.name![0] | uppercase }}</div>
                      <span class="requester-name">{{ req.requester!.name }}</span>
                    </div>
                  } @else {
                    <span></span>
                  }
                  <div class="footer-actions">
                    <button class="zir-btn zir-btn--ghost btn-sm" (click)="openOfferModal(req)">
                      <ng-icon name="lucideDollarSign"></ng-icon>
                      Faire une Offre
                    </button>
                    @if (req.proposed_price_tnd) {
                      <button class="btn-accept-price" (click)="acceptPrice(req)" [disabled]="acceptingId() === req.id">
                        @if (acceptingId() === req.id) {
                          <div class="zir-spinner zir-spinner--white"></div>
                        } @else {
                          <ng-icon name="lucideCheckCircle"></ng-icon>
                          Accepter le Prix
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon"><ng-icon name="lucidePackage"></ng-icon></div>
                <h3>Aucune mission disponible</h3>
                <p>Aucune demande de transport n'est disponible pour le moment. Revenez bientôt.</p>
              </div>
            }
          </div>
        }
      }

      <!-- ═══════════════ TAB 2: En Cours ═══════════════ -->
      @if (activeTab() === 'active') {
        @if (isLoadingActive()) {
          <div class="loading-state">
            <div class="zir-spinner"></div>
            <p>Chargement des missions en cours...</p>
          </div>
        } @else {
          <div class="missions-grid">
            @for (mission of activeMissions(); track mission.id) {
              <div class="mission-card mission-card--active">
                <!-- Status Banner -->
                <div class="card-banner card-banner--active">
                  <div class="status-block">
                    <span class="status-badge status-badge--progress">
                      <ng-icon name="lucideNavigation"></ng-icon>
                      En Cours
                    </span>
                  </div>
                  <div class="amount-block">
                    @if (mission.final_amount_tnd || mission.proposed_amount_tnd) {
                      <span class="price-amount">{{ (mission.final_amount_tnd || mission.proposed_amount_tnd) | number:'1.0-0' }}</span>
                      <span class="price-currency">TND</span>
                    }
                  </div>
                </div>

                <!-- Route from terms_snapshot -->
                <div class="route-section">
                  <div class="route-point origin">
                    <div class="point-dot origin-dot"></div>
                    <div class="point-info">
                      <label>Départ</label>
                      <span>{{ mission.terms_snapshot['origin_address'] || 'N/A' }}</span>
                    </div>
                  </div>
                  <div class="route-line">
                    <ng-icon name="lucideArrowRight"></ng-icon>
                  </div>
                  <div class="route-point destination">
                    <div class="point-dot dest-dot"></div>
                    <div class="point-info">
                      <label>Arrivée</label>
                      <span>{{ mission.terms_snapshot['destination_address'] || 'N/A' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Cargo Info -->
                <div class="mission-meta">
                  <div class="meta-item">
                    <ng-icon name="lucidePackage"></ng-icon>
                    <span>{{ mission.terms_snapshot['cargo_type'] || 'Fret' }}</span>
                  </div>
                  @if (mission.terms_snapshot['quantity_kg']) {
                    <div class="meta-item">
                      <ng-icon name="lucideWeight"></ng-icon>
                      <span>{{ mission.terms_snapshot['quantity_kg'] | number:'1.0-0' }} kg</span>
                    </div>
                  }
                  <div class="meta-item">
                    <ng-icon name="lucideClock"></ng-icon>
                    <span>{{ mission.created_at | date:'dd MMM HH:mm' }}</span>
                  </div>
                </div>

                <!-- Checkpoints -->
                <div class="checkpoints-section">
                  <label class="section-label">Points de suivi</label>
                  <div class="checkpoint-actions">
                    <button class="checkpoint-btn" (click)="sendCheckpoint(mission, 'Chargement effectué')" [disabled]="sendingCheckpoint() === mission.id">
                      <ng-icon name="lucideCircleDot"></ng-icon>
                      Chargement effectué
                    </button>
                    <button class="checkpoint-btn" (click)="sendCheckpoint(mission, 'En route')" [disabled]="sendingCheckpoint() === mission.id">
                      <ng-icon name="lucideTruck"></ng-icon>
                      En route
                    </button>
                    <button class="checkpoint-btn" (click)="sendCheckpoint(mission, 'Arrivée à destination')" [disabled]="sendingCheckpoint() === mission.id">
                      <ng-icon name="lucideMapPin"></ng-icon>
                      Arrivée à destination
                    </button>
                  </div>
                </div>

                <!-- Footer -->
                <div class="card-footer">
                  <div class="requester-info">
                    @if (mission.counterparty_id) {
                      <div class="requester-avatar">{{ getInitial(mission.counterparty_id) }}</div>
                      <span class="requester-name">{{ mission.counterparty_id | slice:0:8 }}</span>
                    }
                  </div>
                  <div class="footer-actions">
                    <button class="zir-btn zir-btn--ghost btn-sm" (click)="viewDetails(mission.id)">
                      <ng-icon name="lucideEye"></ng-icon>
                      Voir les Détails
                    </button>
                    <button class="btn-complete" (click)="confirmDelivery(mission)" [disabled]="completingId() === mission.id">
                      @if (completingId() === mission.id) {
                        <div class="zir-spinner zir-spinner--white"></div>
                      } @else {
                        <ng-icon name="lucideCheckCircle"></ng-icon>
                        Confirmer la Livraison
                      }
                    </button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon"><ng-icon name="lucideNavigation"></ng-icon></div>
                <h3>Aucune mission en cours</h3>
                <p>Vous n'avez aucune mission active pour le moment. Acceptez une mission disponible pour commencer.</p>
              </div>
            }
          </div>
        }
      }

      <!-- ═══════════════ TAB 3: Historique ═══════════════ -->
      @if (activeTab() === 'history') {
        @if (isLoadingHistory()) {
          <div class="loading-state">
            <div class="zir-spinner"></div>
            <p>Chargement de l'historique...</p>
          </div>
        } @else {
          <div class="missions-grid">
            @for (mission of historyMissions(); track mission.id) {
              <div class="mission-card mission-card--history">
                <!-- Amount Banner -->
                <div class="card-banner card-banner--history">
                  <div class="status-block">
                    <span class="status-badge status-badge--completed">
                      <ng-icon name="lucideCheckCircle"></ng-icon>
                      Terminé
                    </span>
                  </div>
                  <div class="amount-block">
                    @if (mission.final_amount_tnd || mission.proposed_amount_tnd) {
                      <span class="price-amount">{{ (mission.final_amount_tnd || mission.proposed_amount_tnd) | number:'1.0-0' }}</span>
                      <span class="price-currency">TND</span>
                    }
                  </div>
                </div>

                <!-- Route -->
                <div class="route-section">
                  <div class="route-point origin">
                    <div class="point-dot origin-dot"></div>
                    <div class="point-info">
                      <label>Départ</label>
                      <span>{{ mission.terms_snapshot['origin_address'] || 'N/A' }}</span>
                    </div>
                  </div>
                  <div class="route-line">
                    <ng-icon name="lucideArrowRight"></ng-icon>
                  </div>
                  <div class="route-point destination">
                    <div class="point-dot dest-dot"></div>
                    <div class="point-info">
                      <label>Arrivée</label>
                      <span>{{ mission.terms_snapshot['destination_address'] || 'N/A' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Meta -->
                <div class="mission-meta">
                  <div class="meta-item">
                    <ng-icon name="lucidePackage"></ng-icon>
                    <span>{{ mission.terms_snapshot['cargo_type'] || 'Fret' }}</span>
                  </div>
                  <div class="meta-item">
                    <ng-icon name="lucideClock"></ng-icon>
                    <span>{{ mission.completed_at | date:'dd MMM yyyy HH:mm' }}</span>
                  </div>
                  @if (mission.provider_rated_farmer) {
                    <div class="meta-item meta-item--rating">
                      <ng-icon name="lucideStar"></ng-icon>
                      <span>{{ mission.provider_rated_farmer }}/5</span>
                    </div>
                  }
                </div>

                <!-- Footer -->
                <div class="card-footer">
                  <div class="requester-info">
                    @if (mission.counterparty_id) {
                      <div class="requester-avatar">{{ getInitial(mission.counterparty_id) }}</div>
                      <span class="requester-name">{{ mission.counterparty_id | slice:0:8 }}</span>
                    }
                  </div>
                  <button class="zir-btn zir-btn--ghost btn-sm" (click)="viewDetails(mission.id)">
                    <ng-icon name="lucideEye"></ng-icon>
                    Voir les Détails
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon"><ng-icon name="lucideHistory"></ng-icon></div>
                <h3>Aucun historique</h3>
                <p>Vous n'avez pas encore terminé de mission. Vos missions complétées apparaîtront ici.</p>
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- ═══════════════ Offer Modal ═══════════════ -->
    @if (showOfferModal()) {
      <div class="zir-modal">
        <div class="zir-modal__backdrop" (click)="closeOfferModal()"></div>
        <div class="zir-modal__content offer-modal">

          <div class="offer-modal-header">
            <div>
              <h3>
                <ng-icon name="lucideDollarSign"></ng-icon>
                Faire une Offre
              </h3>
              <p>{{ selectedRequest()?.cargo_type }} · {{ selectedRequest()?.quantity_kg | number:'1.0-0' }} kg · {{ selectedRequest()?.origin_address }} → {{ selectedRequest()?.destination_address }}</p>
            </div>
            <button class="close-btn" (click)="closeOfferModal()">
              <ng-icon name="lucideX"></ng-icon>
            </button>
          </div>

          <div class="offer-modal-body">
            <div class="offer-field">
              <label>Prix proposé (TND)</label>
              <div class="price-input-wrapper">
                <input type="number"
                       class="zir-input price-input"
                       [ngModel]="offerPrice()"
                       (ngModelChange)="offerPrice.set($event)"
                       placeholder="Ex: 350"
                       min="0"
                       step="10">
                <span class="price-suffix">TND</span>
              </div>
              @if (selectedRequest()?.proposed_price_tnd) {
                <p class="field-hint">Prix proposé par le client : {{ selectedRequest()?.proposed_price_tnd | number:'1.0-0' }} TND</p>
              }
            </div>

            <div class="offer-field">
              <label>Notes (optionnel)</label>
              <textarea class="zir-input offer-textarea"
                        [ngModel]="offerNotes()"
                        (ngModelChange)="offerNotes.set($event)"
                        placeholder="Conditions, remarques, délai estimé..."
                        rows="4"></textarea>
            </div>
          </div>

          <div class="offer-modal-footer">
            <button class="zir-btn zir-btn--ghost" (click)="closeOfferModal()">Annuler</button>
            <button class="btn-submit-offer" (click)="submitOffer()" [disabled]="isSubmittingOffer() || !offerPrice()">
              @if (isSubmittingOffer()) {
                <div class="zir-spinner zir-spinner--white"></div>
                Envoi...
              } @else {
                <ng-icon name="lucideSend"></ng-icon>
                Soumettre l'Offre
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .driver-missions {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .missions-header {
      margin-bottom: 1.5rem;

      .header-info {
        h1 {
          font-size: 1.75rem; font-weight: 800; color: var(--text-primary);
          display: flex; align-items: center; gap: 12px; margin: 0 0 4px;
          ng-icon { color: var(--zir-emerald); font-size: 1.5rem; }
        }
        p { font-size: 0.95rem; color: var(--text-muted); margin: 0; }
      }
    }

    /* ── Tabs ── */
    .tabs-bar {
      display: flex; gap: 4px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 4px;
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: 10px;
      background: transparent; border: none;
      color: var(--text-secondary);
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      ng-icon { font-size: 16px; }

      &:hover { background: var(--bg-card); color: var(--text-primary); }

      &.active {
        background: var(--zir-emerald);
        color: white;
        box-shadow: 0 2px 8px rgba(16,185,129,0.3);
      }

      .tab-count {
        background: rgba(255,255,255,0.2);
        padding: 1px 7px; border-radius: 10px;
        font-size: 11px; font-weight: 700;
      }

      &:not(.active) .tab-count {
        background: var(--bg-card);
        border: 1px solid var(--border);
        color: var(--text-muted);
      }
    }

    /* ── Loading ── */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 80px 24px; color: var(--text-muted);
      .zir-spinner { width: 32px; height: 32px; }
      p { font-size: 0.95rem; margin: 0; }
    }

    /* ── Grid ── */
    .missions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
      margin-bottom: 2rem;
    }

    /* ── Card ── */
    .mission-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      display: flex; flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.08);
        border-color: rgba(16,185,129,0.2);
      }
    }

    .card-banner {
      background: linear-gradient(135deg, #0f2027, #203a43);
      padding: 16px 20px;
      display: flex; justify-content: space-between; align-items: center;

      .price-block {
        display: flex; align-items: baseline; gap: 4px;
      }
      .price-amount {
        font-size: 1.6rem; font-weight: 900; color: white; letter-spacing: -0.5px;
      }
      .price-currency {
        font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.6);
      }
      .price-free {
        font-size: 1.1rem; font-weight: 700; color: rgba(255,255,255,0.5);
        font-style: italic;
      }

      .banner-badges {
        display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;
      }

      &.card-banner--active {
        background: linear-gradient(135deg, #0d3320, #1a5c3a);
      }
      &.card-banner--history {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
      }

      .status-block { display: flex; align-items: center; }
      .amount-block { display: flex; align-items: baseline; gap: 4px; }
    }

    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
      ng-icon { font-size: 12px; }
    }

    .badge--express {
      background: rgba(245,158,11,0.15);
      border: 1px solid rgba(245,158,11,0.3);
      color: #fbbf24;
    }

    .badge--cargo {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.3);
      color: #6ee7b7;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
      ng-icon { font-size: 13px; }
    }

    .status-badge--progress {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.3);
      color: #6ee7b7;
    }

    .status-badge--completed {
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.3);
      color: #a5b4fc;
    }

    /* ── Route ── */
    .route-section {
      padding: 16px 20px;
      display: flex; align-items: center; gap: 8px;
      border-bottom: 1px dashed var(--border);

      .route-point {
        display: flex; align-items: flex-start; gap: 8px; flex: 1;

        .point-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
          &.origin-dot { background: var(--zir-emerald); }
          &.dest-dot { background: #f59e0b; }
        }

        .point-info {
          display: flex; flex-direction: column;
          label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
          span { font-size: 14px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
        }
      }

      .route-line {
        color: var(--text-muted); flex-shrink: 0;
        ng-icon { font-size: 18px; }
      }
    }

    /* ── Meta ── */
    .mission-meta {
      padding: 12px 20px;
      display: flex; gap: 16px; flex-wrap: wrap;
      border-bottom: 1px solid var(--border);

      .meta-item {
        display: flex; align-items: center; gap: 6px;
        font-size: 13px; color: var(--text-secondary);
        ng-icon { font-size: 14px; color: var(--text-muted); }
      }
      .meta-item--rating {
        color: #f59e0b;
        ng-icon { color: #f59e0b; }
      }
    }

    /* ── Checkpoints ── */
    .checkpoints-section {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);

      .section-label {
        display: block;
        font-size: 11px; font-weight: 800; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.5px;
        margin-bottom: 10px;
      }

      .checkpoint-actions {
        display: flex; flex-wrap: wrap; gap: 8px;
      }
    }

    .checkpoint-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s ease;

      ng-icon { font-size: 14px; }

      &:hover:not(:disabled) {
        background: var(--zir-emerald-alpha-10);
        border-color: var(--zir-emerald);
        color: var(--zir-emerald);
      }

      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* ── Footer ── */
    .card-footer {
      padding: 14px 20px;
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; flex-wrap: wrap;
      margin-top: auto;

      .requester-info {
        display: flex; align-items: center; gap: 8px;

        .requester-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(16,185,129,0.1);
          color: var(--zir-emerald); font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .requester-name {
          font-size: 13px; font-weight: 600; color: var(--text-secondary);
          max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
      }

      .footer-actions {
        display: flex; gap: 8px; flex-wrap: wrap;
      }
    }

    .btn-accept-price {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px;
      background: var(--zir-emerald); color: white;
      border: none; cursor: pointer;
      font-size: 13px; font-weight: 700;
      transition: all 0.2s ease;

      &:hover:not(:disabled) { background: #059669; transform: scale(1.02); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      ng-icon { font-size: 14px; }
      .zir-spinner { width: 14px; height: 14px; }
    }

    .btn-complete {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px;
      background: var(--zir-emerald); color: white;
      border: none; cursor: pointer;
      font-size: 13px; font-weight: 700;
      transition: all 0.2s ease;

      &:hover:not(:disabled) { background: #059669; transform: scale(1.02); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      ng-icon { font-size: 14px; }
      .zir-spinner { width: 14px; height: 14px; }
    }

    /* ── Empty State ── */
    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center;
      padding: 80px 24px; text-align: center;
      border: 1px dashed var(--border);
      border-radius: 16px; background: var(--bg-card);

      .empty-icon {
        width: 72px; height: 72px; border-radius: 50%;
        background: rgba(16,185,129,0.06);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 1rem;
        ng-icon { font-size: 2rem; color: var(--zir-emerald); }
      }

      h3 { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
      p { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 1.5rem; max-width: 400px; line-height: 1.5; }
    }

    /* ── Offer Modal ── */
    .zir-modal {
      position: fixed; inset: 0; z-index: 1050;
      display: flex; align-items: center; justify-content: center;
      padding: 24px; pointer-events: auto;
    }

    .zir-modal__backdrop {
      position: fixed; inset: 0;
      background: rgba(8,15,29,0.75);
      backdrop-filter: blur(10px);
      z-index: 0;
    }

    .offer-modal {
      position: relative; z-index: 1;
      width: 100%; max-width: 520px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
      overflow: hidden;
      animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: scale(0.95) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .offer-modal-header {
      padding: 24px 24px 16px;
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 1px solid var(--border);

      h3 {
        margin: 0 0 6px; font-size: 18px; font-weight: 800;
        display: flex; align-items: center; gap: 8px;
        color: var(--text-primary);
        ng-icon { color: var(--zir-emerald); font-size: 20px; }
      }
      p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.4; }

      .close-btn {
        background: none; border: none; cursor: pointer;
        color: var(--text-muted); display: flex; padding: 4px;
        transition: color 0.15s ease;
        &:hover { color: #ef4444; }
      }
    }

    .offer-modal-body {
      padding: 24px;
      display: flex; flex-direction: column; gap: 20px;
    }

    .offer-field {
      display: flex; flex-direction: column; gap: 6px;

      label {
        font-size: 13px; font-weight: 700; color: var(--text-secondary);
      }

      .price-input-wrapper {
        position: relative;
        .price-input { padding-right: 52px; width: 100%; }
        .price-suffix {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          font-size: 14px; font-weight: 700; color: var(--text-muted);
        }
      }

      .field-hint {
        font-size: 12px; color: var(--text-muted); margin: 2px 0 0;
      }
    }

    .offer-textarea {
      resize: vertical; min-height: 80px; font-family: inherit;
    }

    .offer-modal-footer {
      padding: 16px 24px 24px;
      display: flex; justify-content: flex-end; gap: 10px;
      border-top: 1px solid var(--border);
    }

    .btn-submit-offer {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 24px; border-radius: 12px;
      background: var(--zir-emerald); color: white;
      border: none; cursor: pointer;
      font-size: 14px; font-weight: 700;
      transition: all 0.2s ease;

      &:hover:not(:disabled) { background: #059669; transform: scale(1.02); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      ng-icon { font-size: 16px; }
      .zir-spinner { width: 16px; height: 16px; }
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .driver-missions { padding: 1rem; }

      .tabs-bar {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .missions-grid { grid-template-columns: 1fr; }

      .card-footer {
        flex-direction: column; align-items: flex-start;
        .footer-actions { width: 100%; }
      }

      .offer-modal { border-radius: 16px; margin: 0 8px; }
    }
  `]
})
export class DriverMissionsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notifs = inject(NotificationStore);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly contractsApi = inject(ContractsApiService);

  readonly activeTab = signal<'available' | 'active' | 'history'>('available');

  readonly availableRequests = signal<TransportRequest[]>([]);
  readonly isLoadingAvailable = signal(true);

  readonly activeMissions = signal<MissionContract[]>([]);
  readonly isLoadingActive = signal(true);

  readonly historyMissions = signal<MissionContract[]>([]);
  readonly isLoadingHistory = signal(true);

  readonly acceptingId = signal<string | null>(null);
  readonly completingId = signal<string | null>(null);
  readonly sendingCheckpoint = signal<string | null>(null);

  readonly showOfferModal = signal(false);
  readonly selectedRequest = signal<TransportRequest | null>(null);
  readonly offerPrice = signal<number | null>(null);
  readonly offerNotes = signal('');
  readonly isSubmittingOffer = signal(false);

  ngOnInit() {
    this.loadAvailable();
  }

  switchTab(tab: 'available' | 'active' | 'history') {
    this.activeTab.set(tab);
    if (tab === 'available') {
      this.loadAvailable();
    } else if (tab === 'active') {
      this.loadActiveMissions();
    } else {
      this.loadHistory();
    }
  }

  // ── Tab 1: Available Transport Requests ──────────────────────────────────

  private loadAvailable() {
    this.isLoadingAvailable.set(true);
    this.http.get<TransportRequest[]>(`${environment.apiUrl}/drivers/transport-requests/available`).subscribe({
      next: (data) => {
        this.availableRequests.set(data || []);
        this.isLoadingAvailable.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableRequests.set([]);
        this.isLoadingAvailable.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  acceptPrice(req: TransportRequest) {
    if (!req.proposed_price_tnd) return;
    this.acceptingId.set(req.id);
    this.http.post<MissionContract>(`${environment.apiUrl}/contracts`, {
      contract_type: 'TRANSPORT_MISSION',
      reference_id: req.id,
      proposed_amount_tnd: req.proposed_price_tnd,
      terms_snapshot: {
        origin_address: req.origin_address,
        destination_address: req.destination_address,
        cargo_type: req.cargo_type,
        quantity_kg: req.quantity_kg,
        required_vehicle_type: req.required_vehicle_type,
        loading_datetime: req.loading_datetime,
      }
    }).subscribe({
      next: (contract) => {
        this.contractsApi.acceptContract(contract.id).subscribe({
          next: () => {
            this.notifs.showSuccess('Mission acceptée ! Le contrat est maintenant actif.');
            this.acceptingId.set(null);
            this.loadAvailable();
            this.cdr.markForCheck();
          },
          error: () => {
            this.notifs.showSuccess('Offre soumise. En attente de confirmation.');
            this.acceptingId.set(null);
            this.loadAvailable();
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Impossible d\'accepter cette mission.');
        this.acceptingId.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  openOfferModal(req: TransportRequest) {
    this.selectedRequest.set(req);
    this.offerPrice.set(null);
    this.offerNotes.set('');
    this.showOfferModal.set(true);
  }

  closeOfferModal() {
    this.showOfferModal.set(false);
    this.selectedRequest.set(null);
  }

  submitOffer() {
    const req = this.selectedRequest();
    const price = this.offerPrice();
    if (!req || !price || price <= 0) return;

    this.isSubmittingOffer.set(true);

    this.http.post<MissionContract>(`${environment.apiUrl}/contracts`, {
      contract_type: 'TRANSPORT_MISSION',
      reference_id: req.id,
      proposed_amount_tnd: price,
      description: this.offerNotes() || null,
      terms_snapshot: {
        origin_address: req.origin_address,
        destination_address: req.destination_address,
        cargo_type: req.cargo_type,
        quantity_kg: req.quantity_kg,
        required_vehicle_type: req.required_vehicle_type,
        loading_datetime: req.loading_datetime,
      }
    }).subscribe({
      next: () => {
        this.notifs.showSuccess(`Offre de ${price} TND soumise avec succès !`);
        this.isSubmittingOffer.set(false);
        this.closeOfferModal();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Impossible de soumettre l\'offre.');
        this.isSubmittingOffer.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Tab 2: Active Missions ───────────────────────────────────────────────

  private loadActiveMissions() {
    this.isLoadingActive.set(true);
    this.contractsApi.getContractsByType('TRANSPORT_MISSION').subscribe({
      next: (contracts) => {
        const active = (contracts || []).filter(c => c.status === 'IN_PROGRESS');
        this.activeMissions.set(active);
        this.isLoadingActive.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.activeMissions.set([]);
        this.isLoadingActive.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  sendCheckpoint(mission: MissionContract, checkpoint: string) {
    this.sendingCheckpoint.set(mission.id);
    this.contractsApi.sendMessage(mission.id, checkpoint, 'SYSTEM').subscribe({
      next: () => {
        this.notifs.showSuccess(`Point de suivi envoyé : ${checkpoint}`);
        this.sendingCheckpoint.set(null);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de l\'envoi du checkpoint.');
        this.sendingCheckpoint.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelivery(mission: MissionContract) {
    this.completingId.set(mission.id);
    this.contractsApi.completeMission(mission.id).subscribe({
      next: () => {
        this.notifs.showSuccess('Livraison confirmée ! La mission est terminée.');
        this.completingId.set(null);
        this.loadActiveMissions();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notifs.showError(err?.error?.message || 'Erreur lors de la confirmation.');
        this.completingId.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Tab 3: History ───────────────────────────────────────────────────────

  private loadHistory() {
    this.isLoadingHistory.set(true);
    this.contractsApi.getContractsByType('TRANSPORT_MISSION').subscribe({
      next: (contracts) => {
        const completed = (contracts || []).filter(c => c.status === 'COMPLETED');
        this.historyMissions.set(completed);
        this.isLoadingHistory.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.historyMissions.set([]);
        this.isLoadingHistory.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  viewDetails(contractId: string) {
    this.router.navigate(['/dashboard/contracts', contractId]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getInitial(id: string): string {
    return id ? id[0]?.toUpperCase() || '?' : '?';
  }
}
