import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideTruck, lucidePackage, lucideMapPin, lucideCalendar, lucideDollarSign,
  lucideX, lucideCheckCircle, lucideClock, lucideSend, lucideMessageSquare,
  lucideChevronRight, lucideArrowRight, lucideZap, lucideFileText, lucideCircleDot,
  lucideStar, lucidePhone, lucideUser, lucideBox, lucideFilter, lucideSearch,
  lucideNavigation, lucidePencil, lucideTrash2
} from '@ng-icons/lucide';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../expert/shared/toast.service';
import {
  ContractsApiService, MissionContract, MissionMessage
} from '../../../core/services/contracts-api.service';

interface DriverCard {
  id: string;
  user_id: string;
  user?: { id: string; name: string; phone: string; profile_picture_url?: string; governorate?: string };
  vehicle_type: string;
  capacity_tonnes: number;
  governorate: string;
  is_available: boolean;
  rating: number;
  license_number: string;
  vehicle_plate: string;
  vehicle_photo_url: string;
  lat: number;
  lng: number;
}

interface TransportRequest {
  id: string;
  cargo_type: string;
  quantity_kg: number;
  weight_tonnes: number;
  required_vehicle_type: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  loading_datetime: string;
  pickup_date: string;
  is_express: boolean;
  handling_notes: string;
  proposed_price_tnd: number | null;
  accepted_price_tnd: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  driver_profile_id: string | null;
  notes: string;
  contract_id?: string | null;
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
    lucideChevronRight, lucideArrowRight, lucideZap, lucideFileText, lucideCircleDot,
    lucideStar, lucidePhone, lucideUser, lucideBox, lucideFilter, lucideSearch,
    lucideNavigation, lucidePencil, lucideTrash2
  })],
  template: `
    <div class="tr">
      <!-- Header -->
      <div class="tr__head">
        <div class="tr__head-icon"><ng-icon name="lucideTruck"></ng-icon></div>
        <div>
          <h2>Transport & Logistique</h2>
          <p>Trouvez un transporteur ou publiez une demande</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tr__tabs">
        <button class="tr__tab" [class.active]="activeTab() === 'drivers'" (click)="switchTab('drivers')">
          <ng-icon name="lucideSearch"></ng-icon> Transporteurs
        </button>
        <button class="tr__tab" [class.active]="activeTab() === 'requests'" (click)="switchTab('requests')">
          <ng-icon name="lucidePackage"></ng-icon> Mes Demandes
        </button>
      </div>

      <!-- ═══ DRIVERS TAB ═══ -->
      @if (activeTab() === 'drivers') {
        <!-- Filter bar -->
        <div class="tr__filters">
          <div class="tr__filter">
            <ng-icon name="lucideMapPin"></ng-icon>
            <select [(ngModel)]="filters.governorate" (change)="loadDrivers()">
              <option value="">Tous les gouvernorats</option>
              @for (g of governorates; track g) {
                <option [value]="g">{{ g }}</option>
              }
            </select>
          </div>
          <div class="tr__filter">
            <ng-icon name="lucideTruck"></ng-icon>
            <select [(ngModel)]="filters.vehicle_type" (change)="loadDrivers()">
              <option value="">Tous véhicules</option>
              <option value="TRUCK">Camion</option>
              <option value="VAN">Fourgon / Van</option>
              <option value="PICKUP">Pickup</option>
              <option value="REFRIGERATED">Frigorifique</option>
              <option value="SEMI">Semi-remorque</option>
            </select>
          </div>
          <button class="tr__new-btn" (click)="switchTab('create')">
            <ng-icon name="lucidePackage"></ng-icon> Nouvelle demande
          </button>
        </div>

        @if (loadingDrivers()) {
          <div class="tr__grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skel-driver">
                <div class="skel skel--photo"></div>
                <div class="skel skel--name"></div>
                <div class="skel skel--sub"></div>
                <div class="skel skel--sub short"></div>
              </div>
            }
          </div>
        } @else if (drivers().length === 0) {
          <div class="tr__empty">
            <ng-icon name="lucideTruck"></ng-icon>
            <h3>Aucun transporteur trouvé</h3>
            <p>Essayez un autre gouvernorat ou publiez une demande</p>
            <button class="tr__cta" (click)="switchTab('create')">
              <ng-icon name="lucidePackage"></ng-icon> Publier une demande
            </button>
          </div>
        } @else {
          <div class="tr__grid">
            @for (driver of drivers(); track driver.id) {
              <div class="drv">
                <!-- Vehicle Photo -->
                <div class="drv__photo">
                  @if (driver.vehicle_photo_url) {
                    <img [src]="driver.vehicle_photo_url" [alt]="getVehicleLabel(driver.vehicle_type)" loading="lazy"
                      (error)="onImgError($event)" />
                  } @else {
                    <div class="drv__photo-placeholder"><ng-icon name="lucideTruck"></ng-icon></div>
                  }
                  <span class="drv__type-badge">{{ getVehicleLabel(driver.vehicle_type) }}</span>
                </div>

                <!-- Driver Info -->
                <div class="drv__body">
                  <div class="drv__row">
                    <div class="drv__avatar">
                      @if (driver.user && driver.user.profile_picture_url) {
                        <img [src]="driver.user.profile_picture_url" [alt]="driver.user.name" />
                      } @else {
                        <ng-icon name="lucideUser"></ng-icon>
                      }
                    </div>
                    <div class="drv__meta">
                      <h4>{{ driver.user?.name || 'Chauffeur' }}</h4>
                      <span><ng-icon name="lucideMapPin"></ng-icon> {{ driver.governorate }}</span>
                    </div>
                  </div>

                  <!-- Rating -->
                  <div class="drv__rating">
                    @for (s of [1,2,3,4,5]; track s) {
                      <ng-icon [class.filled]="s <= Math.round(driver.rating)" name="lucideStar"></ng-icon>
                    }
                    <span>{{ driver.rating | number:'1.1-1' }}</span>
                  </div>

                  <!-- Specs -->
                  <div class="drv__specs">
                    <div class="drv__spec">
                      <span class="drv__spec-val">{{ driver.capacity_tonnes }}T</span>
                      <span class="drv__spec-lbl">Capacité</span>
                    </div>
                    <div class="drv__spec">
                      <span class="drv__spec-val">{{ driver.vehicle_plate }}</span>
                      <span class="drv__spec-lbl">Plaque</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="drv__actions">
                    <button class="drv__btn drv__btn--contact" (click)="contactDriver(driver)">
                      <ng-icon name="lucidePhone"></ng-icon> Contacter
                    </button>
                    <button class="drv__btn drv__btn--demand" (click)="createDemandForDriver(driver)">
                      <ng-icon name="lucideSend"></ng-icon> Demander
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ═══ REQUESTS TAB ═══ -->
      @if (activeTab() === 'requests') {
        <!-- Stats -->
        <div class="tr__stats">
          <div class="tr__stat">
            <div class="tr__stat-icon green"><ng-icon name="lucideTruck"></ng-icon></div>
            <div><span class="tr__stat-val">{{ stats().active }}</span><span class="tr__stat-lbl">En cours</span></div>
          </div>
          <div class="tr__stat">
            <div class="tr__stat-icon amber"><ng-icon name="lucideMessageSquare"></ng-icon></div>
            <div><span class="tr__stat-val">{{ stats().negotiating }}</span><span class="tr__stat-lbl">Négociation</span></div>
          </div>
          <div class="tr__stat">
            <div class="tr__stat-icon muted"><ng-icon name="lucideCheckCircle"></ng-icon></div>
            <div><span class="tr__stat-val">{{ stats().completed }}</span><span class="tr__stat-lbl">Terminées</span></div>
          </div>
        </div>

        @if (loadingRequests()) {
          <div class="tr__list">
            @for (i of [1,2,3]; track i) {
              <div class="skel-req"></div>
            }
          </div>
        } @else if (requests().length === 0) {
          <div class="tr__empty">
            <ng-icon name="lucidePackage"></ng-icon>
            <h3>Aucune demande</h3>
            <p>Créez votre première demande de transport</p>
            <button class="tr__cta" (click)="switchTab('create')">
              <ng-icon name="lucidePackage"></ng-icon> Nouvelle demande
            </button>
          </div>
        } @else {
          <div class="tr__list">
            @for (req of requests(); track req.id) {
              <div class="req" [class.selected]="selectedRequest()?.id === req.id" (click)="selectRequest(req)">
                <div class="req__icon"><ng-icon name="lucidePackage"></ng-icon></div>
                <div class="req__body">
                  <div class="req__top">
                    <strong>{{ req.cargo_type }}</strong>
                    <span class="req__weight">{{ req.quantity_kg }} kg</span>
                  </div>
                  <div class="req__route">
                    <ng-icon name="lucideMapPin"></ng-icon>
                    {{ req.origin_address || '—' }}
                    <ng-icon name="lucideArrowRight"></ng-icon>
                    {{ req.destination_address || '—' }}
                  </div>
                  <div class="req__meta">
                    @if (req.loading_datetime) {
                      <span><ng-icon name="lucideCalendar"></ng-icon> {{ formatDate(req.loading_datetime) }}</span>
                    }
                    @if (req.is_express) {
                      <span class="req__express"><ng-icon name="lucideZap"></ng-icon> Express</span>
                    }
                    @if (req.proposed_price_tnd) {
                      <span class="req__price">{{ req.proposed_price_tnd }} TND</span>
                    }
                  </div>
                </div>
                <div class="req__right">
                  <span class="req__status" [attr.data-status]="req.status">{{ getStatusLabel(req.status) }}</span>
                  @if (canModify(req)) {
                    <button class="req__action" (click)="editRequest(req); $event.stopPropagation()" title="Modifier">
                      <ng-icon name="lucidePencil"></ng-icon>
                    </button>
                    <button class="req__action req__action--danger" (click)="confirmDelete(req); $event.stopPropagation()" title="Supprimer">
                      <ng-icon name="lucideTrash2"></ng-icon>
                    </button>
                  }
                  <ng-icon name="lucideChevronRight"></ng-icon>
                </div>
              </div>
            }
          </div>
        }

        <!-- Detail Panel -->
        @if (selectedRequest()) {
          <div class="overlay" (click)="selectedRequest.set(null)"></div>
          <div class="panel">
            <div class="panel__head">
              <h3>{{ selectedRequest()!.cargo_type }} — {{ selectedRequest()!.quantity_kg }} kg</h3>
              <div class="panel__head-actions">
                @if (canModify(selectedRequest()!)) {
                  <button class="panel__action" (click)="editRequest(selectedRequest()!)" title="Modifier">
                    <ng-icon name="lucidePencil"></ng-icon>
                  </button>
                  <button class="panel__action panel__action--danger" (click)="confirmDelete(selectedRequest()!)" title="Supprimer">
                    <ng-icon name="lucideTrash2"></ng-icon>
                  </button>
                }
                <button (click)="selectedRequest.set(null)"><ng-icon name="lucideX"></ng-icon></button>
              </div>
            </div>
            <div class="panel__body">
              <div class="panel__route">
                <div class="panel__point">
                  <div class="panel__dot green"></div>
                  <div><small>Chargement</small><span>{{ selectedRequest()!.origin_address || '—' }}</span></div>
                </div>
                <div class="panel__line"></div>
                <div class="panel__point">
                  <div class="panel__dot red"></div>
                  <div><small>Livraison</small><span>{{ selectedRequest()!.destination_address || '—' }}</span></div>
                </div>
              </div>
              <div class="panel__fields">
                <div class="panel__field"><small>Véhicule</small><span>{{ selectedRequest()!.required_vehicle_type || '—' }}</span></div>
                <div class="panel__field"><small>Date</small><span>{{ formatDate(selectedRequest()!.loading_datetime || selectedRequest()!.pickup_date) }}</span></div>
                @if (selectedRequest()!.handling_notes) {
                  <div class="panel__field full"><small>Notes</small><span>{{ selectedRequest()!.handling_notes }}</span></div>
                }
                <div class="panel__field"><small>Statut</small>
                  <span class="req__status" [attr.data-status]="selectedRequest()!.status">{{ getStatusLabel(selectedRequest()!.status) }}</span>
                </div>
                @if (selectedRequest()!.proposed_price_tnd) {
                  <div class="panel__field"><small>Prix proposé</small><span class="req__price">{{ selectedRequest()!.proposed_price_tnd }} TND</span></div>
                }
              </div>

              <!-- Negotiation Thread -->
              @if (selectedRequest()!.status === 'NEGOTIATING' && selectedRequest()!.contract_id) {
                <div class="panel__nego">
                  <h4><ng-icon name="lucideMessageSquare"></ng-icon> Négociation</h4>
                  @if (loadingMessages()) {
                    <div class="skel skel--msg"></div>
                  } @else {
                    <div class="panel__msgs">
                      @for (msg of messages(); track msg.id) {
                        <div class="msg" [class.offer]="msg.message_type === 'OFFER' || msg.message_type === 'COUNTER_OFFER'">
                          <div class="msg__head">
                            <span class="msg__badge" [attr.data-type]="msg.message_type">{{ getMessageTypeLabel(msg.message_type) }}</span>
                            <span class="msg__time">{{ formatDateTime(msg.created_at) }}</span>
                          </div>
                          <p>{{ msg.content }}</p>
                          @if (msg.offer_amount_tnd) {
                            <div class="msg__offer"><ng-icon name="lucideDollarSign"></ng-icon> <strong>{{ msg.offer_amount_tnd }} TND</strong></div>
                          }
                          @if (msg.message_type === 'OFFER' || msg.message_type === 'COUNTER_OFFER') {
                            <button class="msg__accept" (click)="acceptOffer(msg)"><ng-icon name="lucideCheckCircle"></ng-icon> Accepter</button>
                          }
                        </div>
                      }
                      @if (messages().length === 0) {
                        <p class="panel__muted">En attente de propositions...</p>
                      }
                    </div>
                    <div class="panel__offer">
                      <div class="panel__offer-row">
                        <input type="number" [(ngModel)]="newOfferAmount" placeholder="Montant TND" min="1" />
                        <button (click)="sendOffer()" [disabled]="!newOfferAmount || sendingOffer()"><ng-icon name="lucideSend"></ng-icon></button>
                      </div>
                      <textarea [(ngModel)]="newOfferMessage" rows="2" placeholder="Message optionnel..."></textarea>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ═══ CREATE TAB ═══ -->
      @if (activeTab() === 'create') {
        <div class="form">
          <div class="form__head">
            <div class="form__icon"><ng-icon name="lucidePackage"></ng-icon></div>
            <div>
              <h3>{{ editingId() ? 'Modifier la demande' : 'Demander un transport' }}</h3>
              <p>{{ editingId() ? 'Mettez à jour les détails de votre demande' : 'Remplissez les détails pour que les transporteurs puissent vous contacter' }}</p>
            </div>
          </div>

          <div class="form__grid">
            <div class="form__group">
              <label>Type de marchandise</label>
              <select [(ngModel)]="createForm.cargo_type">
                @for (t of CARGO_TYPES; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="form__group">
              <label>Quantité (kg)</label>
              <input type="number" [(ngModel)]="createForm.quantity_kg" min="1" placeholder="Ex: 500" />
            </div>
            <div class="form__group">
              <label>Type de véhicule</label>
              <select [(ngModel)]="createForm.required_vehicle_type">
                <option value="">Peu importe</option>
                <option value="TRUCK">Camion</option>
                <option value="VAN">Fourgon / Van</option>
                <option value="PICKUP">Pickup</option>
                <option value="REFRIGERATED">Frigorifique</option>
                <option value="SEMI">Semi-remorque</option>
              </select>
            </div>
            <div class="form__group">
              <label>Prix proposé (TND) — optionnel</label>
              <input type="number" [(ngModel)]="createForm.proposed_price_tnd" min="0" placeholder="Laisser vide" />
            </div>
            <div class="form__group full">
              <label><ng-icon name="lucideMapPin"></ng-icon> Gouvernorat de chargement</label>
              <select [(ngModel)]="createForm.origin_governorate">
                <option value="">Sélectionner...</option>
                @for (g of governorates; track g) { <option [value]="g">{{ g }}</option> }
              </select>
            </div>
            <div class="form__group full">
              <label>Adresse de chargement</label>
              <input type="text" [(ngModel)]="createForm.origin_address" placeholder="Ex: Route de Sfax, Km 5, Sousse" />
            </div>
            <div class="form__group full">
              <label><ng-icon name="lucideMapPin"></ng-icon> Gouvernorat de livraison</label>
              <select [(ngModel)]="createForm.destination_governorate">
                <option value="">Sélectionner...</option>
                @for (g of governorates; track g) { <option [value]="g">{{ g }}</option> }
              </select>
            </div>
            <div class="form__group full">
              <label>Adresse de livraison</label>
              <input type="text" [(ngModel)]="createForm.destination_address" placeholder="Ex: Avenue Habib Bourguiba, Tunis" />
            </div>
            <div class="form__group">
              <label>Date de chargement</label>
              <input type="datetime-local" [(ngModel)]="createForm.loading_datetime" />
            </div>
            <div class="form__group">
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="createForm.is_express" />
                <span class="toggle__sw"></span>
                Livraison express
              </label>
            </div>
            <div class="form__group full">
              <label>Notes de manipulation</label>
              <textarea [(ngModel)]="createForm.handling_notes" rows="3" placeholder="Instructions spéciales..."></textarea>
            </div>
          </div>

          @if (editingId()) {
            <div style="display:flex;gap:10px;margin-top:18px">
              <button class="form__cancel" (click)="cancelEdit()">Annuler</button>
              <button class="form__submit" (click)="submitRequest()"
                [disabled]="submitting() || !createForm.cargo_type || !createForm.quantity_kg || !createForm.origin_governorate || !createForm.destination_governorate">
                @if (submitting()) {
                  <span class="spin"></span> Enregistrement...
                } @else {
                  <ng-icon name="lucideCheckCircle"></ng-icon> Enregistrer les modifications
                }
              </button>
            </div>
          } @else {
            <button class="form__submit" (click)="submitRequest()"
              [disabled]="submitting() || !createForm.cargo_type || !createForm.quantity_kg || !createForm.origin_governorate || !createForm.destination_governorate">
              @if (submitting()) {
                <span class="spin"></span> Envoi...
              } @else {
                <ng-icon name="lucideSend"></ng-icon> Envoyer la demande
              }
            </button>
          }
        </div>
      }

      <!-- ═══ DELETE CONFIRMATION ═══ -->
      @if (showDeleteModal()) {
        <div class="overlay" (click)="showDeleteModal.set(false)"></div>
        <div class="confirm-modal">
          <div class="confirm-modal__icon"><ng-icon name="lucideTrash2"></ng-icon></div>
          <h3>Supprimer cette demande ?</h3>
          <p>Cette action est irréversible. La demande de <strong>{{ deletingRequest()?.cargo_type }}</strong> sera supprimée.</p>
          <div class="confirm-modal__actions">
            <button class="confirm-modal__cancel" (click)="showDeleteModal.set(false)">Annuler</button>
            <button class="confirm-modal__delete" (click)="deleteRequest()">
              @if (deleting()) { <span class="spin"></span> } @else { <ng-icon name="lucideTrash2"></ng-icon> Supprimer }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tr { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; height: 100%; overflow-y: auto; font-family: 'Inter', system-ui, sans-serif; }
    :host { display: block; height: 100%; }

    /* ── Header ──────────────────────────────────── */
    .tr__head { display: flex; align-items: center; gap: 14px; }
    .tr__head-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #22c55e, #0ea5e9); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tr__head-icon ng-icon { width: 22px; height: 22px; color: #fff; }
    .tr__head h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); }
    .tr__head p { margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted); }

    /* ── Tabs ────────────────────────────────────── */
    .tr__tabs { display: flex; gap: 4px; background: var(--bg-secondary, #0c1829); border-radius: 12px; padding: 3px; }
    .tr__tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: none; border-radius: 10px; background: transparent; color: var(--text-muted); font-weight: 700; font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: all 0.2s; }
    .tr__tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .tr__tab ng-icon { width: 16px; height: 16px; }

    /* ── Filters ─────────────────────────────────── */
    .tr__filters { display: flex; gap: 8px; align-items: center; }
    .tr__filter { display: flex; align-items: center; gap: 8px; padding: 9px 14px; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 10px; flex: 1; }
    .tr__filter ng-icon { width: 15px; height: 15px; color: var(--text-muted); flex-shrink: 0; }
    .tr__filter select { border: none; background: transparent; color: var(--text-primary); font-size: 0.82rem; font-family: inherit; width: 100%; outline: none; cursor: pointer; }
    .tr__filter select option { background: var(--bg-card); color: var(--text-primary); }
    .tr__new-btn { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border: none; border-radius: 10px; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; font-weight: 700; font-size: 0.82rem; font-family: inherit; cursor: pointer; white-space: nowrap; transition: transform 0.15s; }
    .tr__new-btn:hover { transform: scale(1.02); }
    .tr__new-btn ng-icon { width: 15px; height: 15px; }

    /* ── Driver Grid ─────────────────────────────── */
    .tr__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .drv { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); overflow: hidden; transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
    .drv:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); border-color: rgba(34,197,94,0.2); }

    .drv__photo { position: relative; height: 140px; background: var(--bg-secondary, #0c1829); overflow: hidden; }
    .drv__photo img { width: 100%; height: 100%; object-fit: cover; }
    .drv__photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .drv__photo-placeholder ng-icon { width: 48px; height: 48px; color: var(--text-muted); opacity: 0.3; }
    .drv__type-badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 8px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); color: #fff; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }

    .drv__body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .drv__row { display: flex; align-items: center; gap: 10px; }
    .drv__avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: var(--bg-secondary, #0c1829); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--border-color, rgba(255,255,255,0.08)); }
    .drv__avatar img { width: 100%; height: 100%; object-fit: cover; }
    .drv__avatar ng-icon { width: 18px; height: 18px; color: var(--text-muted); }
    .drv__meta { flex: 1; min-width: 0; }
    .drv__meta h4 { margin: 0; font-size: 0.88rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .drv__meta span { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }
    .drv__meta span ng-icon { width: 11px; height: 11px; }

    .drv__rating { display: flex; align-items: center; gap: 2px; }
    .drv__rating ng-icon { width: 13px; height: 13px; color: var(--border-color, rgba(255,255,255,0.1)); }
    .drv__rating ng-icon.filled { color: #f59e0b; }
    .drv__rating span { margin-left: 4px; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }

    .drv__specs { display: flex; gap: 16px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.04); }
    .drv__spec { display: flex; flex-direction: column; }
    .drv__spec-val { font-size: 0.85rem; font-weight: 800; color: var(--text-primary); }
    .drv__spec-lbl { font-size: 0.65rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

    .drv__actions { display: flex; gap: 8px; }
    .drv__btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px; border: none; border-radius: 10px; font-size: 0.78rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; }
    .drv__btn ng-icon { width: 14px; height: 14px; }
    .drv__btn--contact { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .drv__btn--contact:hover { background: rgba(59,130,246,0.2); }
    .drv__btn--demand { background: linear-gradient(135deg, #22c55e, #059669); color: #fff; }
    .drv__btn--demand:hover { box-shadow: 0 4px 12px rgba(34,197,94,0.3); }

    /* ── Stats ────────────────────────────────────── */
    .tr__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .tr__stat { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 12px; padding: 14px; }
    .tr__stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tr__stat-icon ng-icon { width: 18px; height: 18px; }
    .tr__stat-icon.green { background: rgba(34,197,94,0.1); color: #22c55e; }
    .tr__stat-icon.amber { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .tr__stat-icon.muted { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .tr__stat-val { font-size: 1.2rem; font-weight: 800; color: var(--text-primary); display: block; line-height: 1; }
    .tr__stat-lbl { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }

    /* ── Request List ─────────────────────────────── */
    .tr__list { display: flex; flex-direction: column; gap: 8px; }
    .req { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.2s; }
    .req:hover { border-color: rgba(34,197,94,0.3); }
    .req.selected { border-color: #22c55e; background: rgba(34,197,94,0.04); }
    .req__icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .req__icon ng-icon { width: 18px; height: 18px; color: #22c55e; }
    .req__body { flex: 1; min-width: 0; }
    .req__top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
    .req__top strong { font-size: 0.88rem; color: var(--text-primary); }
    .req__weight { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); background: var(--bg-secondary, #0c1829); padding: 2px 7px; border-radius: 5px; }
    .req__route { display: flex; align-items: center; gap: 4px; font-size: 0.76rem; color: var(--text-muted); margin-bottom: 3px; flex-wrap: wrap; }
    .req__route ng-icon { width: 12px; height: 12px; flex-shrink: 0; }
    .req__meta { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text-muted); }
    .req__meta ng-icon { width: 11px; height: 11px; }
    .req__express { color: #f59e0b; font-weight: 700; display: inline-flex; align-items: center; gap: 2px; }
    .req__price { font-weight: 700; color: #22c55e; }
    .req__right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .req__right ng-icon { width: 16px; height: 16px; color: var(--text-muted); }

    .req__status { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: 6px; white-space: nowrap; }
    .req__status[data-status="OPEN"] { background: rgba(34,197,94,0.1); color: #22c55e; }
    .req__status[data-status="PENDING"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .req__status[data-status="NEGOTIATING"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .req__status[data-status="ACCEPTED"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .req__status[data-status="IN_TRANSIT"] { background: rgba(139,92,246,0.1); color: #8b5cf6; }
    .req__status[data-status="DELIVERED"] { background: rgba(34,197,94,0.15); color: #059669; }
    .req__status[data-status="CANCELLED"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }

    /* ── Detail Panel ─────────────────────────────── */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 49; }
    .panel { position: fixed; top: 0; right: 0; width: 420px; max-width: 95vw; height: 100vh; background: var(--bg-card); border-left: 1px solid var(--border-color, rgba(255,255,255,0.06)); z-index: 50; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.2); }
    .panel__head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .panel__head h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .panel__head button { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
    .panel__head button ng-icon { width: 20px; height: 20px; }
    .panel__body { flex: 1; overflow-y: auto; padding: 20px; }

    .panel__route { margin-bottom: 20px; }
    .panel__point { display: flex; align-items: flex-start; gap: 10px; }
    .panel__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .panel__dot.green { background: #22c55e; }
    .panel__dot.red { background: #ef4444; }
    .panel__point small { display: block; font-size: 0.68rem; color: var(--text-muted); font-weight: 600; }
    .panel__point span { font-size: 0.82rem; color: var(--text-primary); font-weight: 600; }
    .panel__line { width: 2px; height: 20px; background: rgba(255,255,255,0.06); margin-left: 4px; }

    .panel__fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .panel__field.full { grid-column: 1 / -1; }
    .panel__field small { display: block; font-size: 0.68rem; color: var(--text-muted); font-weight: 600; margin-bottom: 2px; }
    .panel__field span { font-size: 0.82rem; color: var(--text-primary); font-weight: 600; }

    .panel__nego { border-top: 1px solid rgba(255,255,255,0.04); padding-top: 16px; }
    .panel__nego h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
    .panel__nego h4 ng-icon { width: 16px; height: 16px; }
    .panel__msgs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; max-height: 280px; overflow-y: auto; }
    .msg { padding: 10px; border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; background: var(--bg-secondary, #0c1829); }
    .msg.offer { border-left: 3px solid #22c55e; }
    .msg__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .msg__badge { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
    .msg__badge[data-type="OFFER"] { background: rgba(34,197,94,0.1); color: #22c55e; }
    .msg__badge[data-type="COUNTER_OFFER"] { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .msg__badge[data-type="TEXT"] { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .msg__badge[data-type="SYSTEM"] { background: rgba(100,116,139,0.1); color: var(--text-muted); }
    .msg__time { font-size: 0.68rem; color: var(--text-muted); }
    .msg p { margin: 0 0 6px; font-size: 0.82rem; color: var(--text-primary); line-height: 1.4; }
    .msg__offer { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 0.95rem; color: #22c55e; }
    .msg__offer ng-icon { width: 14px; height: 14px; }
    .msg__accept { display: flex; align-items: center; gap: 4px; padding: 5px 10px; border: none; border-radius: 7px; background: rgba(34,197,94,0.1); color: #22c55e; font-size: 0.75rem; font-weight: 700; font-family: inherit; cursor: pointer; }
    .msg__accept ng-icon { width: 13px; height: 13px; }

    .panel__offer { border-top: 1px solid rgba(255,255,255,0.04); padding-top: 12px; }
    .panel__offer-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .panel__offer-row input { flex: 1; padding: 9px 12px; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; background: var(--bg-secondary, #0c1829); color: var(--text-primary); font-size: 0.85rem; font-family: inherit; }
    .panel__offer-row input:focus { outline: none; border-color: #22c55e; }
    .panel__offer-row button { width: 40px; border: none; border-radius: 8px; background: #22c55e; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .panel__offer-row button ng-icon { width: 16px; height: 16px; }
    .panel__offer textarea { width: 100%; padding: 9px 12px; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; background: var(--bg-secondary, #0c1829); color: var(--text-primary); font-size: 0.82rem; font-family: inherit; resize: none; box-sizing: border-box; }
    .panel__muted { color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 16px; }

    /* ── Empty ────────────────────────────────────── */
    .tr__empty { text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: 16px; }
    .tr__empty ng-icon { width: 40px; height: 40px; color: var(--text-muted); margin-bottom: 12px; }
    .tr__empty h3 { margin: 0; font-weight: 700; color: var(--text-primary); }
    .tr__empty p { margin: 4px 0 16px; font-size: 0.82rem; color: var(--text-muted); }
    .tr__cta { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border: none; border-radius: 10px; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; font-weight: 700; font-size: 0.82rem; font-family: inherit; cursor: pointer; }
    .tr__cta ng-icon { width: 15px; height: 15px; }

    /* ── Create Form ──────────────────────────────── */
    .form { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); padding: 24px; }
    .form__head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .form__icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #22c55e, #0ea5e9); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .form__icon ng-icon { width: 20px; height: 20px; color: #fff; }
    .form__head h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .form__head p { margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted); }
    .form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form__group { display: flex; flex-direction: column; gap: 5px; }
    .form__group.full { grid-column: 1 / -1; }
    .form__group label { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .form__group label ng-icon { width: 13px; height: 13px; }
    .form__group select, .form__group input, .form__group textarea { padding: 10px 12px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 10px; background: var(--bg-secondary, #0c1829); color: var(--text-primary); font-size: 0.85rem; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; }
    .form__group select:focus, .form__group input:focus, .form__group textarea:focus { border-color: #22c55e; }
    .form__group select option { background: var(--bg-card); color: var(--text-primary); }
    .form__group textarea { resize: vertical; }

    .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .toggle input { display: none; }
    .toggle__sw { width: 38px; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.1); position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle__sw::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle input:checked + .toggle__sw { background: #22c55e; }
    .toggle input:checked + .toggle__sw::after { transform: translateX(18px); }

    .form__submit { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 12px; margin-top: 18px; border: none; border-radius: 12px; background: linear-gradient(135deg, #22c55e, #059669); color: #fff; font-size: 0.88rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; }
    .form__submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .form__submit:not(:disabled):hover { box-shadow: 0 6px 20px rgba(34,197,94,0.3); }
    .form__submit ng-icon { width: 16px; height: 16px; }
    .form__cancel { flex: 0 0 auto; padding: 12px 20px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 12px; background: transparent; color: var(--text-muted); font-weight: 700; font-size: 0.88rem; font-family: inherit; cursor: pointer; }
    .form__cancel:hover { background: rgba(255,255,255,0.03); }

    /* ── Skeletons ────────────────────────────────── */
    .skel { border-radius: 8px; background: linear-gradient(90deg, var(--bg-secondary, #0c1829) 25%, var(--bg-card) 50%, var(--bg-secondary, #0c1829) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .skel-driver { background: var(--bg-card); border-radius: 16px; padding: 14px; border: 1px solid var(--border-color, rgba(255,255,255,0.04)); }
    .skel--photo { height: 140px; margin: -14px -14px 14px; border-radius: 16px 16px 0 0; }
    .skel--name { width: 120px; height: 14px; margin-bottom: 8px; }
    .skel--sub { width: 80px; height: 10px; margin-bottom: 6px; }
    .skel--sub.short { width: 50px; }
    .skel-req { height: 72px; border-radius: 12px; background: linear-gradient(90deg, var(--bg-secondary, #0c1829) 25%, var(--bg-card) 50%, var(--bg-secondary, #0c1829) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .skel--msg { height: 60px; border-radius: 10px; }
    .spin { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Request Actions ──────────────────────────── */
    .req__action { width: 30px; height: 30px; border-radius: 7px; border: none; background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
    .req__action ng-icon { width: 14px; height: 14px; }
    .req__action:hover { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .req__action--danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

    .panel__head-actions { display: flex; align-items: center; gap: 6px; }
    .panel__head-actions button { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
    .panel__head-actions button ng-icon { width: 20px; height: 20px; }
    .panel__action { width: 32px; height: 32px; border-radius: 8px; border: none; background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .panel__action ng-icon { width: 16px; height: 16px; }
    .panel__action:hover { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .panel__action--danger:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

    /* ── Delete Confirm Modal ──────────────────────── */
    .confirm-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 380px; max-width: 92vw; background: var(--bg-card); border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 18px; box-shadow: 0 24px 64px rgba(0,0,0,0.4); z-index: 100; padding: 28px; text-align: center; }
    .confirm-modal__icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(239,68,68,0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
    .confirm-modal__icon ng-icon { width: 24px; height: 24px; color: #ef4444; }
    .confirm-modal h3 { margin: 0 0 8px; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
    .confirm-modal p { margin: 0 0 20px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
    .confirm-modal p strong { color: var(--text-primary); }
    .confirm-modal__actions { display: flex; gap: 10px; }
    .confirm-modal__cancel { flex: 1; padding: 10px; border: 1px solid var(--border-color, rgba(255,255,255,0.06)); border-radius: 10px; background: transparent; color: var(--text-muted); font-weight: 700; font-size: 0.85rem; font-family: inherit; cursor: pointer; }
    .confirm-modal__cancel:hover { background: rgba(255,255,255,0.03); }
    .confirm-modal__delete { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: none; border-radius: 10px; background: #ef4444; color: #fff; font-weight: 700; font-size: 0.85rem; font-family: inherit; cursor: pointer; transition: all 0.15s; }
    .confirm-modal__delete:hover { background: #dc2626; }
    .confirm-modal__delete ng-icon { width: 15px; height: 15px; }

    /* ── Responsive ────────────────────────────────── */
    @media (max-width: 768px) {
      .tr__filters { flex-wrap: wrap; }
      .tr__filter { min-width: 140px; }
      .tr__grid { grid-template-columns: 1fr; }
      .form__grid { grid-template-columns: 1fr; }
      .form__group.full { grid-column: auto; }
    }
  `]
})
export class FarmerServicesTransportComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private contractsApi = inject(ContractsApiService);
  private cdr = inject(ChangeDetectorRef);

  readonly Math = Math;

  readonly activeTab = signal<'drivers' | 'requests' | 'create'>('drivers');
  readonly loadingDrivers = signal(true);
  readonly loadingRequests = signal(false);
  readonly submitting = signal(false);
  readonly sendingOffer = signal(false);
  readonly loadingMessages = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deletingRequest = signal<TransportRequest | null>(null);
  readonly deleting = signal(false);

  readonly drivers = signal<DriverCard[]>([]);
  readonly requests = signal<TransportRequest[]>([]);
  readonly selectedRequest = signal<TransportRequest | null>(null);
  readonly messages = signal<MissionMessage[]>([]);
  readonly stats = signal({ active: 0, negotiating: 0, completed: 0 });

  filters = { governorate: '', vehicle_type: '' };

  createForm = {
    cargo_type: 'Céréales',
    quantity_kg: 500,
    required_vehicle_type: '',
    origin_governorate: '',
    origin_address: '',
    destination_governorate: '',
    destination_address: '',
    loading_datetime: '',
    is_express: false,
    handling_notes: '',
    proposed_price_tnd: null as number | null,
  };

  newOfferAmount: number | null = null;
  newOfferMessage = '';

  readonly CARGO_TYPES = [
    'Céréales', 'Légumes', 'Fruits', 'Olives', 'Huile d\'olive',
    'Dattes', 'Poisson', 'Produits laitiers', 'Animaux vivants',
    'Matériaux', 'Engrais', 'Autre'
  ];

  readonly governorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana',
    'Kasserine', 'Sidi Bouzid', 'Gafsa', 'Gabès', 'Médenine',
    'Tataouine', 'Tozeur', 'Kébili'
  ];

  // Tunisian governorate center coordinates for PostGIS
  private readonly GOV_COORDS: Record<string, { lat: number; lng: number }> = {
    'Tunis': { lat: 36.8065, lng: 10.1815 },
    'Ariana': { lat: 36.8665, lng: 10.1647 },
    'Ben Arous': { lat: 36.7536, lng: 10.2283 },
    'Manouba': { lat: 36.8101, lng: 10.0963 },
    'Nabeul': { lat: 36.4561, lng: 10.7378 },
    'Zaghouan': { lat: 36.4036, lng: 10.1400 },
    'Sousse': { lat: 35.8288, lng: 10.6405 },
    'Monastir': { lat: 35.7643, lng: 10.8113 },
    'Mahdia': { lat: 35.5047, lng: 11.0622 },
    'Sfax': { lat: 34.7406, lng: 10.7603 },
    'Kairouan': { lat: 35.6782, lng: 10.0963 },
    'Bizerte': { lat: 37.2744, lng: 9.8722 },
    'Béja': { lat: 36.7256, lng: 9.1841 },
    'Jendouba': { lat: 36.5017, lng: 8.7803 },
    'Le Kef': { lat: 36.1745, lng: 8.7042 },
    'Siliana': { lat: 36.0833, lng: 9.3667 },
    'Kasserine': { lat: 35.1676, lng: 8.8365 },
    'Sidi Bouzid': { lat: 34.7406, lng: 9.4839 },
    'Gafsa': { lat: 34.4311, lng: 8.6932 },
    'Gabès': { lat: 33.8815, lng: 10.0982 },
    'Médenine': { lat: 33.3547, lng: 10.5053 },
    'Tataouine': { lat: 32.9297, lng: 10.4508 },
    'Tozeur': { lat: 33.9197, lng: 8.1335 },
    'Kébili': { lat: 33.7072, lng: 8.9714 },
  };

  ngOnInit() {
    this.loadDrivers();
  }

  switchTab(tab: 'drivers' | 'requests' | 'create') {
    this.activeTab.set(tab);
    if (tab === 'drivers' && this.drivers().length === 0) this.loadDrivers();
    if (tab === 'requests' && this.requests().length === 0) this.loadRequests();
    this.cdr.markForCheck();
  }

  // ── Load Drivers ──────────────────────────────────────────────────────────
  loadDrivers() {
    this.loadingDrivers.set(true);
    this.cdr.markForCheck();
    let url = `${environment.apiUrl}/drivers`;
    const params: Record<string, string> = {};
    if (this.filters.governorate) params['governorate'] = this.filters.governorate;

    this.http.get<DriverCard[]>(url, { params }).subscribe({
      next: (data) => {
        let filtered = Array.isArray(data) ? data : [];
        if (this.filters.vehicle_type) {
          filtered = filtered.filter(d => d.vehicle_type === this.filters.vehicle_type);
        }
        this.drivers.set(filtered);
        this.loadingDrivers.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDrivers.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Load Requests ─────────────────────────────────────────────────────────
  loadRequests() {
    this.loadingRequests.set(true);
    this.cdr.markForCheck();
    this.http.get<TransportRequest[]>(`${environment.apiUrl}/drivers/my-requests`).subscribe({
      next: (data) => {
        this.requests.set(Array.isArray(data) ? data : []);
        this.computeStats();
        this.loadingRequests.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingRequests.set(false);
        this.cdr.markForCheck();
      }
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

  // ── Contact Driver ────────────────────────────────────────────────────────
  contactDriver(driver: DriverCard) {
    const phone = driver.user?.phone;
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      this.toast.info('Contact', `${driver.user?.name || 'Ce transporteur'} — pas de téléphone disponible`);
    }
  }

  // ── Create Demand for Driver ──────────────────────────────────────────────
  createDemandForDriver(driver: DriverCard) {
    this.createForm.origin_governorate = driver.governorate || '';
    this.activeTab.set('create');
    this.cdr.markForCheck();
    this.toast.info('Demande', `Créez votre demande pour ${driver.user?.name || 'ce transporteur'}`);
  }

  // ── Submit Request (Create or Update) ─────────────────────────────────────
  submitRequest() {
    if (!this.createForm.cargo_type || !this.createForm.quantity_kg ||
        !this.createForm.origin_governorate || !this.createForm.destination_governorate) return;

    this.submitting.set(true);
    this.cdr.markForCheck();

    const originCoords = this.GOV_COORDS[this.createForm.origin_governorate] || { lat: 36.8065, lng: 10.1815 };
    const destCoords = this.GOV_COORDS[this.createForm.destination_governorate] || { lat: 36.8065, lng: 10.1815 };

    const body: any = {
      cargo_type: this.createForm.cargo_type,
      quantity_kg: this.createForm.quantity_kg,
      required_vehicle_type: this.createForm.required_vehicle_type || null,
      origin_lat: originCoords.lat,
      origin_lng: originCoords.lng,
      origin_address: this.createForm.origin_address || `${this.createForm.origin_governorate}, Tunisie`,
      destination_lat: destCoords.lat,
      destination_lng: destCoords.lng,
      destination_address: this.createForm.destination_address || `${this.createForm.destination_governorate}, Tunisie`,
      is_express: this.createForm.is_express,
      handling_notes: this.createForm.handling_notes || null,
    };

    if (this.createForm.loading_datetime) {
      body.loading_datetime = new Date(this.createForm.loading_datetime).toISOString();
    }
    if (this.createForm.proposed_price_tnd) {
      body.proposed_price_tnd = this.createForm.proposed_price_tnd;
    }

    const editId = this.editingId();
    const url = editId
      ? `${environment.apiUrl}/drivers/requests/${editId}`
      : `${environment.apiUrl}/drivers/requests`;
    const request$ = editId
      ? this.http.patch<TransportRequest>(url, body)
      : this.http.post<TransportRequest>(url, body);

    request$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Demande modifiée' : 'Demande envoyée',
          editId ? 'Les modifications ont été enregistrées' : 'Les transporteurs proches ont été notifiés');
        this.submitting.set(false);
        this.editingId.set(null);
        this.resetForm();
        this.activeTab.set('requests');
        this.loadRequests();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible d\'envoyer la demande');
        this.submitting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Request Detail ────────────────────────────────────────────────────────
  selectRequest(req: TransportRequest) {
    if (this.selectedRequest()?.id === req.id) {
      this.selectedRequest.set(null);
      return;
    }
    this.selectedRequest.set(req);
    if (req.status === 'NEGOTIATING' && req.contract_id) {
      this.loadMessages(req.contract_id);
    }
    this.cdr.markForCheck();
  }

  loadMessages(contractId: string) {
    this.loadingMessages.set(true);
    this.cdr.markForCheck();
    this.contractsApi.getMessages(contractId).subscribe({
      next: (msgs) => {
        this.messages.set(Array.isArray(msgs) ? msgs : []);
        this.loadingMessages.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.messages.set([]);
        this.loadingMessages.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  sendOffer() {
    const req = this.selectedRequest();
    if (!req?.contract_id || !this.newOfferAmount) return;
    this.sendingOffer.set(true);
    this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  getVehicleLabel(type: string): string {
    const labels: Record<string, string> = {
      'TRUCK': 'Camion', 'VAN': 'Van / Fourgon', 'PICKUP': 'Pickup',
      'REFRIGERATED': 'Frigorifique', 'SEMI': 'Semi-remorque',
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente', 'OPEN': 'Ouverte', 'NEGOTIATING': 'Négociation',
      'ACCEPTED': 'Acceptée', 'IN_TRANSIT': 'En transit', 'DELIVERED': 'Livrée',
      'DISPUTED': 'Litige', 'CANCELLED': 'Annulée',
    };
    return labels[status] || status;
  }

  getMessageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'OFFER': 'Offre', 'COUNTER_OFFER': 'Contre-offre',
      'TEXT': 'Message', 'SYSTEM': 'Système',
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

  canModify(req: TransportRequest): boolean {
    return ['PENDING', 'OPEN', 'NEGOTIATING'].includes(req.status);
  }

  editRequest(req: TransportRequest) {
    this.editingId.set(req.id);
    this.createForm = {
      cargo_type: req.cargo_type,
      quantity_kg: req.quantity_kg,
      required_vehicle_type: req.required_vehicle_type || '',
      origin_governorate: this.getGovFromAddress(req.origin_address),
      origin_address: req.origin_address || '',
      destination_governorate: this.getGovFromAddress(req.destination_address),
      destination_address: req.destination_address || '',
      loading_datetime: req.loading_datetime ? this.toLocalDatetime(req.loading_datetime) : '',
      is_express: req.is_express,
      handling_notes: req.handling_notes || '',
      proposed_price_tnd: req.proposed_price_tnd,
    };
    this.activeTab.set('create');
    this.cdr.markForCheck();
  }

  cancelEdit() {
    this.editingId.set(null);
    this.resetForm();
    this.activeTab.set('requests');
    this.cdr.markForCheck();
  }

  confirmDelete(req: TransportRequest) {
    this.deletingRequest.set(req);
    this.showDeleteModal.set(true);
    this.cdr.markForCheck();
  }

  deleteRequest() {
    const req = this.deletingRequest();
    if (!req) return;
    this.deleting.set(true);
    this.cdr.markForCheck();
    this.http.delete(`${environment.apiUrl}/drivers/requests/${req.id}`).subscribe({
      next: () => {
        this.toast.success('Supprimée', `La demande "${req.cargo_type}" a été supprimée`);
        this.showDeleteModal.set(false);
        this.deletingRequest.set(null);
        this.selectedRequest.set(null);
        this.deleting.set(false);
        this.loadRequests();
      },
      error: (err) => {
        this.toast.error('Erreur', err?.error?.message || 'Impossible de supprimer');
        this.deleting.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private getGovFromAddress(address: string | null): string {
    if (!address) return '';
    for (const g of this.governorates) {
      if (address.toLowerCase().includes(g.toLowerCase())) return g;
    }
    return '';
  }

  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private resetForm() {
    this.createForm = {
      cargo_type: 'Céréales', quantity_kg: 500, required_vehicle_type: '',
      origin_governorate: '', origin_address: '',
      destination_governorate: '', destination_address: '',
      loading_datetime: '', is_express: false, handling_notes: '',
      proposed_price_tnd: null,
    };
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }
}
