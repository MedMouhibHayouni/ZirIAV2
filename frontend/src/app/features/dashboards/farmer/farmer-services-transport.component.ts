import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTruck, lucidePackage, lucideMapPin, lucideCalendar, lucideDollarSign,
  lucideX, lucideCheckCircle, lucideClock, lucideSend, lucideMessageSquare,
  lucideChevronRight, lucideArrowRight, lucideZap, lucideFileText, lucideCircleDot
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';
import {
  ContractsApiService, MissionContract, MissionMessage
} from '../../../core/services/contracts-api.service';

interface TransportRequest {
  id: string;
  cargo_type: string;
  weight_kg: number;
  vehicle_type: string;
  pickup_address: string;
  delivery_address: string;
  pickup_datetime: string;
  express_delivery: boolean;
  handling_notes: string;
  proposed_price_tnd: number | null;
  status: 'OPEN' | 'NEGOTIATING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  contract_id: string | null;
  driver_name?: string;
}

@Component({
  selector: 'app-farmer-services-transport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideTruck, lucidePackage, lucideMapPin, lucideCalendar, lucideDollarSign,
    lucideX, lucideCheckCircle, lucideClock, lucideSend, lucideMessageSquare,
    lucideChevronRight, lucideArrowRight, lucideZap, lucideFileText, lucideCircleDot
  })],
  template: `
    <div class="page">
      <div class="page-top">
        <h2>Transport & Logistique</h2>
        <button class="btn btn-primary" (click)="activeTab.set('create')">
          <ng-icon name="lucidePackage"></ng-icon> Nouvelle demande
        </button>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'list'" (click)="switchTab('list')">
          Mes Demandes
        </button>
        <button class="tab" [class.active]="activeTab() === 'create'" (click)="switchTab('create')">
          Nouvelle Demande
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon active-icon"><ng-icon name="lucideTruck"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().active }}</span>
            <span class="stat-label">En cours</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon negotiate-icon"><ng-icon name="lucideMessageSquare"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().negotiating }}</span>
            <span class="stat-label">En négociation</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed-icon"><ng-icon name="lucideCheckCircle"></ng-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats().completed }}</span>
            <span class="stat-label">Terminées</span>
          </div>
        </div>
      </div>

      @if (activeTab() === 'create') {
        <div class="form-panel">
          <h3>Demander un transport</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Type de marchandise</label>
              <select [(ngModel)]="createForm.cargo_type" class="form-el">
                @for (type of CARGO_TYPES; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Quantité en kg</label>
              <input type="number" [(ngModel)]="createForm.weight_kg" class="form-el" min="1" placeholder="Ex: 500" />
            </div>
            <div class="form-group">
              <label>Type de véhicule requis</label>
              <select [(ngModel)]="createForm.vehicle_type" class="form-el">
                @for (v of VEHICLE_TYPES; track v) {
                  <option [value]="v">{{ v }}</option>
                }
              </select>
            </div>
            <div class="form-group full-width">
              <label>Adresse de chargement</label>
              <div class="input-with-icon">
                <ng-icon name="lucideMapPin"></ng-icon>
                <input type="text" [(ngModel)]="createForm.pickup_address" class="form-el" placeholder="Ex: Route de Sfax, Km 5, Sousse" />
              </div>
            </div>
            <div class="form-group full-width">
              <label>Adresse de livraison</label>
              <div class="input-with-icon">
                <ng-icon name="lucideMapPin"></ng-icon>
                <input type="text" [(ngModel)]="createForm.delivery_address" class="form-el" placeholder="Ex: Avenue Habib Bourguiba, Tunis" />
              </div>
            </div>
            <div class="form-group">
              <label>Date et heure de chargement</label>
              <input type="datetime-local" [(ngModel)]="createForm.pickup_datetime" class="form-el" />
            </div>
            <div class="form-group">
              <label>Prix proposé (TND) — optionnel</label>
              <div class="input-with-icon">
                <ng-icon name="lucideDollarSign"></ng-icon>
                <input type="number" [(ngModel)]="createForm.proposed_price_tnd" class="form-el" min="0" placeholder="Laisser vide pour offre ouverte" />
              </div>
            </div>
            <div class="form-group full-width">
              <label class="toggle-label">
                <input type="checkbox" [(ngModel)]="createForm.express_delivery" class="toggle-input" />
                <span class="toggle-switch"></span>
                Livraison express
              </label>
            </div>
            <div class="form-group full-width">
              <label>Notes de manipulation</label>
              <textarea [(ngModel)]="createForm.handling_notes" class="form-el" rows="3"
                placeholder="Instructions spéciales pour le chargement/déchargement..."></textarea>
            </div>
          </div>
          <button class="btn btn-primary btn-submit" (click)="submitRequest()"
            [disabled]="submitting() || !createForm.cargo_type || !createForm.weight_kg || !createForm.pickup_address || !createForm.delivery_address || !createForm.pickup_datetime">
            @if (submitting()) {
              <span class="spinner-sm"></span> Envoi...
            } @else {
              <ng-icon name="lucideSend"></ng-icon> Envoyer la demande
            }
          </button>
        </div>
      }

      @if (activeTab() === 'list') {
        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div></div>
        } @else if (requests().length === 0) {
          <div class="empty-state">
            <ng-icon name="lucideTruck" class="empty-icon"></ng-icon>
            <h3>Aucune demande de transport</h3>
            <p>Créez votre première demande pour trouver un transporteur</p>
            <button class="btn btn-primary" (click)="activeTab.set('create')">
              <ng-icon name="lucidePackage"></ng-icon> Nouvelle demande
            </button>
          </div>
        } @else {
          <div class="request-list">
            @for (req of requests(); track req.id) {
              <div class="request-card" [class.selected]="selectedRequest()?.id === req.id"
                (click)="selectRequest(req)">
                <div class="req-left">
                  <div class="req-icon"><ng-icon name="lucidePackage"></ng-icon></div>
                  <div class="req-info">
                    <div class="req-title-row">
                      <strong>{{ req.cargo_type }}</strong>
                      <span class="req-weight">{{ req.weight_kg }} kg</span>
                    </div>
                    <div class="req-route">
                      <ng-icon name="lucideMapPin"></ng-icon>
                      {{ req.pickup_address }}
                      <ng-icon name="lucideArrowRight"></ng-icon>
                      {{ req.delivery_address }}
                    </div>
                    <div class="req-meta">
                      <span><ng-icon name="lucideCalendar"></ng-icon> {{ formatDateTime(req.pickup_datetime) }}</span>
                      @if (req.express_delivery) {
                        <span class="express-badge"><ng-icon name="lucideZap"></ng-icon> Express</span>
                      }
                      @if (req.proposed_price_tnd) {
                        <span class="price-badge">{{ req.proposed_price_tnd }} TND</span>
                      }
                    </div>
                  </div>
                </div>
                <div class="req-right">
                  <span class="status-badge" [attr.data-status]="req.status">{{ getStatusLabel(req.status) }}</span>
                  <ng-icon name="lucideChevronRight" class="chevron"></ng-icon>
                </div>
              </div>
            }
          </div>
        }

        <!-- Detail Panel -->
        @if (selectedRequest()) {
          <div class="detail-panel">
            <div class="detail-header">
              <h3>{{ selectedRequest()!.cargo_type }} — {{ selectedRequest()!.weight_kg }} kg</h3>
              <button class="close-btn" (click)="selectedRequest.set(null)"><ng-icon name="lucideX"></ng-icon></button>
            </div>

            <div class="detail-body">
              <div class="detail-route">
                <div class="route-point">
                  <div class="route-dot pickup"></div>
                  <div>
                    <small>Chargement</small>
                    <span>{{ selectedRequest()!.pickup_address }}</span>
                  </div>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                  <div class="route-dot delivery"></div>
                  <div>
                    <small>Livraison</small>
                    <span>{{ selectedRequest()!.delivery_address }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-fields">
                <div class="field">
                  <small>Véhicule</small>
                  <span>{{ selectedRequest()!.vehicle_type }}</span>
                </div>
                <div class="field">
                  <small>Date de chargement</small>
                  <span>{{ formatDateTime(selectedRequest()!.pickup_datetime) }}</span>
                </div>
                @if (selectedRequest()!.handling_notes) {
                  <div class="field full">
                    <small>Notes de manipulation</small>
                    <span>{{ selectedRequest()!.handling_notes }}</span>
                  </div>
                }
                @if (selectedRequest()!.driver_name) {
                  <div class="field">
                    <small>Chauffeur</small>
                    <span>{{ selectedRequest()!.driver_name }}</span>
                  </div>
                }
                <div class="field">
                  <small>Statut</small>
                  <span class="status-badge" [attr.data-status]="selectedRequest()!.status">
                    {{ getStatusLabel(selectedRequest()!.status) }}
                  </span>
                </div>
              </div>

              <!-- Negotiation Thread -->
              @if (selectedRequest()!.status === 'NEGOTIATING' && selectedRequest()!.contract_id) {
                <div class="negotiation-section">
                  <h4><ng-icon name="lucideMessageSquare"></ng-icon> Négociation en cours</h4>

                  @if (loadingMessages()) {
                    <div class="loading-state"><div class="spinner"></div></div>
                  } @else {
                    <div class="messages-thread">
                      @for (msg of messages(); track msg.id) {
                        <div class="message-card" [class.offer]="msg.message_type === 'OFFER' || msg.message_type === 'COUNTER_OFFER'"
                          [class.system]="msg.message_type === 'SYSTEM'">
                          <div class="msg-header">
                            <span class="msg-type-badge" [attr.data-type]="msg.message_type">
                              {{ getMessageTypeLabel(msg.message_type) }}
                            </span>
                            <span class="msg-time">{{ formatDateTime(msg.created_at) }}</span>
                          </div>
                          <p class="msg-content">{{ msg.content }}</p>
                          @if (msg.offer_amount_tnd) {
                            <div class="msg-offer-amount">
                              <ng-icon name="lucideDollarSign"></ng-icon>
                              <strong>{{ msg.offer_amount_tnd }} TND</strong>
                            </div>
                          }
                          @if (msg.message_type === 'OFFER' || msg.message_type === 'COUNTER_OFFER') {
                            <button class="btn-sm success" (click)="acceptOffer(msg)">
                              <ng-icon name="lucideCheckCircle"></ng-icon> Accepter cette offre
                            </button>
                          }
                        </div>
                      }
                      @if (messages().length === 0) {
                        <p class="text-muted">En attente de propositions de transporteurs...</p>
                      }
                    </div>

                    <div class="offer-form">
                      <label>Nouvelle Offre</label>
                      <div class="offer-input-row">
                        <div class="offer-input-group">
                          <ng-icon name="lucideDollarSign"></ng-icon>
                          <input type="number" [(ngModel)]="newOfferAmount" class="form-el" min="1" placeholder="Montant TND" />
                        </div>
                        <button class="btn btn-primary" (click)="sendOffer()" [disabled]="!newOfferAmount || sendingOffer()">
                          <ng-icon name="lucideSend"></ng-icon> Envoyer
                        </button>
                      </div>
                      <textarea [(ngModel)]="newOfferMessage" class="form-el" rows="2"
                        placeholder="Message optionnel..."></textarea>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .page { padding: 20px; max-width: 900px; margin: 0 auto; }
    .page-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 12px; }
    .page-top h2 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--text-primary); }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
    .btn-primary { background: var(--zir-emerald); color: white; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .btn-sm.success { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .btn-sm ng-icon { width: 14px; height: 14px; }

    .tabs { display: flex; gap: 4px; background: var(--bg-secondary); border-radius: 10px; padding: 3px; margin-bottom: 16px; }
    .tab { flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: transparent; color: var(--text-muted); font-weight: 600; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
    .tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon ng-icon { width: 20px; height: 20px; }
    .active-icon { background: var(--zir-emerald-alpha-10); color: var(--zir-emerald); }
    .negotiate-icon { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .completed-icon { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.3rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

    .form-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
    .form-panel h3 { font-size: 1.05rem; font-weight: 800; margin: 0 0 18px; color: var(--text-primary); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .form-el { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--bg-primary); color: var(--text-primary); font-size: 0.88rem; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; }
    .form-el:focus { border-color: var(--zir-emerald); }
    textarea.form-el { resize: vertical; }
    select.form-el { cursor: pointer; }

    .input-with-icon { position: relative; }
    .input-with-icon ng-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-muted); pointer-events: none; }
    .input-with-icon .form-el { padding-left: 34px; }

    .toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .toggle-input { display: none; }
    .toggle-switch { width: 40px; height: 22px; border-radius: 11px; background: var(--border); position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-switch::after { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle-input:checked + .toggle-switch { background: var(--zir-emerald); }
    .toggle-input:checked + .toggle-switch::after { transform: translateX(18px); }

    .btn-submit { margin-top: 18px; width: 100%; justify-content: center; padding: 12px; }

    .loading-state { display: flex; justify-content: center; padding: 40px; }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--zir-emerald); border-radius: 50%; animation: spin 0.6s linear infinite; }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state h3 { color: var(--text-primary); font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .empty-state p { margin: 0 0 16px; font-size: 0.85rem; }

    .request-list { display: flex; flex-direction: column; gap: 8px; }
    .request-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.15s; }
    .request-card:hover { border-color: var(--zir-emerald); }
    .request-card.selected { border-color: var(--zir-emerald); background: var(--zir-emerald-alpha-10); }
    .req-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
    .req-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--zir-emerald-alpha-10); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .req-icon ng-icon { width: 18px; height: 18px; color: var(--zir-emerald); }
    .req-info { flex: 1; min-width: 0; }
    .req-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .req-title-row strong { font-size: 0.9rem; color: var(--text-primary); }
    .req-weight { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); background: var(--bg-secondary); padding: 1px 6px; border-radius: 4px; }
    .req-route { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px; flex-wrap: wrap; }
    .req-route ng-icon { width: 12px; height: 12px; flex-shrink: 0; }
    .req-meta { display: flex; align-items: center; gap: 8px; font-size: 0.73rem; color: var(--text-muted); flex-wrap: wrap; }
    .req-meta ng-icon { width: 12px; height: 12px; }
    .express-badge { display: inline-flex; align-items: center; gap: 2px; color: #f59e0b; font-weight: 700; }
    .price-badge { font-weight: 700; color: var(--zir-emerald); }

    .req-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .chevron { width: 16px; height: 16px; color: var(--text-muted); }

    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
    .status-badge[data-status="OPEN"] { background: rgba(16,185,129,0.1); color: #10b981; }
    .status-badge[data-status="NEGOTIATING"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .status-badge[data-status="ACCEPTED"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .status-badge[data-status="IN_TRANSIT"] { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    .status-badge[data-status="DELIVERED"] { background: rgba(16,185,129,0.15); color: #059669; }
    .status-badge[data-status="CANCELLED"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }

    .detail-panel { position: fixed; top: 0; right: 0; width: 420px; max-width: 90vw; height: 100vh; background: var(--bg-card); border-left: 1px solid var(--border); z-index: 50; display: flex; flex-direction: column; box-shadow: -4px 0 20px rgba(0,0,0,0.1); }
    .detail-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .detail-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
    .close-btn ng-icon { width: 20px; height: 20px; }
    .detail-body { flex: 1; overflow-y: auto; padding: 20px; }

    .detail-route { margin-bottom: 20px; }
    .route-point { display: flex; align-items: flex-start; gap: 10px; }
    .route-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
    .route-dot.pickup { background: var(--zir-emerald); }
    .route-dot.delivery { background: #ef4444; }
    .route-point small { display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
    .route-point span { font-size: 0.85rem; color: var(--text-primary); font-weight: 600; }
    .route-line { width: 2px; height: 24px; background: var(--border); margin-left: 5px; }

    .detail-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .detail-fields .field.full { grid-column: 1 / -1; }
    .field small { display: block; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-bottom: 2px; }
    .field span { font-size: 0.85rem; color: var(--text-primary); font-weight: 600; }

    .negotiation-section { border-top: 1px solid var(--border); padding-top: 16px; }
    .negotiation-section h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 14px; font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .negotiation-section h4 ng-icon { width: 16px; height: 16px; }

    .messages-thread { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; max-height: 300px; overflow-y: auto; }
    .message-card { padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-primary); }
    .message-card.offer { border-left: 3px solid var(--zir-emerald); }
    .message-card.system { border-left: 3px solid var(--text-muted); opacity: 0.8; }
    .msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .msg-type-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .msg-type-badge[data-type="OFFER"] { background: rgba(16,185,129,0.1); color: #10b981; }
    .msg-type-badge[data-type="COUNTER_OFFER"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .msg-type-badge[data-type="TEXT"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .msg-type-badge[data-type="SYSTEM"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .msg-time { font-size: 0.7rem; color: var(--text-muted); }
    .msg-content { margin: 0 0 8px; font-size: 0.85rem; color: var(--text-primary); line-height: 1.4; }
    .msg-offer-amount { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; font-size: 1rem; color: var(--zir-emerald); }
    .msg-offer-amount ng-icon { width: 16px; height: 16px; }

    .offer-form { border-top: 1px solid var(--border); padding-top: 14px; }
    .offer-form label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block; }
    .offer-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .offer-input-group { flex: 1; position: relative; }
    .offer-input-group ng-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-muted); pointer-events: none; }
    .offer-input-group .form-el { padding-left: 34px; }

    .text-muted { color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px; }
  `]
})
export class FarmerServicesTransportComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private contractsApi = inject(ContractsApiService);

  readonly activeTab = signal<'list' | 'create'>('list');
  readonly loading = signal(true);
  readonly requests = signal<TransportRequest[]>([]);
  readonly selectedRequest = signal<TransportRequest | null>(null);
  readonly messages = signal<MissionMessage[]>([]);
  readonly loadingMessages = signal(false);
  readonly submitting = signal(false);
  readonly sendingOffer = signal(false);

  readonly stats = signal({ active: 0, negotiating: 0, completed: 0 });

  createForm = {
    cargo_type: 'Céréales',
    weight_kg: 500,
    vehicle_type: 'Peu importe',
    pickup_address: '',
    delivery_address: '',
    pickup_datetime: '',
    express_delivery: false,
    handling_notes: '',
    proposed_price_tnd: null as number | null,
  };

  newOfferAmount: number | null = null;
  newOfferMessage = '';

  readonly CARGO_TYPES = [
    'Céréales', 'Légumes', 'Fruits', 'Animaux vivants',
    'Produits laitiers', 'Matériaux', 'Autre'
  ];
  readonly VEHICLE_TYPES = [
    'Peu importe', 'Camion bâché', 'Camion frigorifique',
    'Camionnette', 'Tracteur avec remorque', 'Fourgon'
  ];

  ngOnInit() {
    this.loadRequests();
  }

  switchTab(tab: 'list' | 'create') {
    this.activeTab.set(tab);
    if (tab === 'list' && this.requests().length === 0) {
      this.loadRequests();
    }
  }

  loadRequests() {
    this.loading.set(true);
    this.http.get<TransportRequest[]>(`${environment.apiUrl}/drivers/requests`, { params: { my: 'true' } }).subscribe({
      next: (data) => {
        this.requests.set(Array.isArray(data) ? data : []);
        this.computeStats();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  computeStats() {
    const all = this.requests();
    this.stats.set({
      active: all.filter(r => ['OPEN', 'ACCEPTED', 'IN_TRANSIT'].includes(r.status)).length,
      negotiating: all.filter(r => r.status === 'NEGOTIATING').length,
      completed: all.filter(r => r.status === 'DELIVERED' || r.status === 'CANCELLED').length,
    });
  }

  submitRequest() {
    if (!this.createForm.cargo_type || !this.createForm.weight_kg ||
        !this.createForm.pickup_address || !this.createForm.delivery_address ||
        !this.createForm.pickup_datetime) return;

    this.submitting.set(true);
    const body: any = {
      cargo_type: this.createForm.cargo_type,
      weight_kg: this.createForm.weight_kg,
      vehicle_type: this.createForm.vehicle_type,
      pickup_address: this.createForm.pickup_address,
      delivery_address: this.createForm.delivery_address,
      pickup_datetime: this.createForm.pickup_datetime,
      express_delivery: this.createForm.express_delivery,
      handling_notes: this.createForm.handling_notes,
    };
    if (this.createForm.proposed_price_tnd) {
      body.proposed_price_tnd = this.createForm.proposed_price_tnd;
    }

    this.http.post<TransportRequest>(`${environment.apiUrl}/drivers/requests`, body).subscribe({
      next: () => {
        this.toast.success('Demande envoyée', 'Les transporteurs disponibles ont été notifiés');
        this.submitting.set(false);
        this.createForm = {
          cargo_type: 'Céréales', weight_kg: 500, vehicle_type: 'Peu importe',
          pickup_address: '', delivery_address: '', pickup_datetime: '',
          express_delivery: false, handling_notes: '', proposed_price_tnd: null,
        };
        this.activeTab.set('list');
        this.loadRequests();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible d\'envoyer la demande');
        this.submitting.set(false);
      }
    });
  }

  selectRequest(req: TransportRequest) {
    if (this.selectedRequest()?.id === req.id) {
      this.selectedRequest.set(null);
      return;
    }
    this.selectedRequest.set(req);
    if (req.status === 'NEGOTIATING' && req.contract_id) {
      this.loadMessages(req.contract_id);
    }
  }

  loadMessages(contractId: string) {
    this.loadingMessages.set(true);
    this.contractsApi.getMessages(contractId).subscribe({
      next: (msgs) => {
        this.messages.set(Array.isArray(msgs) ? msgs : []);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.messages.set([]);
        this.loadingMessages.set(false);
      }
    });
  }

  sendOffer() {
    const req = this.selectedRequest();
    if (!req?.contract_id || !this.newOfferAmount) return;

    this.sendingOffer.set(true);
    const content = this.newOfferMessage || `Offre de ${this.newOfferAmount} TND`;
    this.contractsApi.sendMessage(req.contract_id, content, 'OFFER', this.newOfferAmount).subscribe({
      next: () => {
        this.toast.success('Offre envoyée', 'Le transporteur a été notifié');
        this.newOfferAmount = null;
        this.newOfferMessage = '';
        this.sendingOffer.set(false);
        this.loadMessages(req.contract_id!);
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Erreur lors de l\'envoi');
        this.sendingOffer.set(false);
      }
    });
  }

  acceptOffer(msg: MissionMessage) {
    const req = this.selectedRequest();
    if (!req?.contract_id) return;

    this.contractsApi.acceptOffer(req.contract_id, msg.id).subscribe({
      next: () => {
        this.toast.success('Offre acceptée', 'Le contrat a été confirmé');
        this.loadMessages(req.contract_id!);
        this.loadRequests();
      },
      error: (err) => this.toast.error('Erreur', err?.error?.message || 'Erreur lors de l\'acceptation')
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'OPEN': 'Ouverte',
      'NEGOTIATING': 'Négociation',
      'ACCEPTED': 'Acceptée',
      'IN_TRANSIT': 'En transit',
      'DELIVERED': 'Livrée',
      'CANCELLED': 'Annulée',
    };
    return labels[status] || status;
  }

  getMessageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'OFFER': 'Offre',
      'COUNTER_OFFER': 'Contre-offre',
      'TEXT': 'Message',
      'SYSTEM': 'Système',
    };
    return labels[type] || type;
  }

  private dfDate = new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' });
  private dfDateTime = new Intl.DateTimeFormat('fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  formatDate(d: string): string {
    return d ? this.dfDate.format(new Date(d)) : '—';
  }

  formatDateTime(d: string): string {
    return d ? this.dfDateTime.format(new Date(d)) : '—';
  }
}
