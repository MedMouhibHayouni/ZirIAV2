import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
  OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft, lucideFileText, lucideSend, lucideCheck,
  lucideClock, lucideUser, lucideMapPin, lucideCalendar,
  lucideDollarSign, lucideTruck, lucideBriefcase, lucideWrench,
  lucideDownload, lucideMessageSquare, lucideCheckCircle,
  lucideAlertTriangle, lucideXCircle, lucideInfo,
  lucideHash, lucideTimer, lucideBookOpen, lucidePackage,
  lucideStar, lucideAward, lucideFlag, lucideThumbsUp, lucidePen, lucidePlayCircle,
} from '@ng-icons/lucide';
import {
  ContractsApiService,
  MissionContract,
  MissionMessage,
  MissionContractDocument
} from '../../../core/services/contracts-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../expert/shared/toast.service';

type DetailTab = 'details' | 'messages' | 'documents' | 'history';

interface TabDef {
  key: DetailTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideArrowLeft, lucideFileText, lucideSend, lucideCheck,
    lucideClock, lucideUser, lucideMapPin, lucideCalendar,
    lucideDollarSign, lucideTruck, lucideBriefcase, lucideWrench,
    lucideDownload, lucideMessageSquare, lucideCheckCircle,
    lucideAlertTriangle, lucideXCircle, lucideInfo,
  lucideHash, lucideTimer, lucideBookOpen, lucidePackage,
  lucideStar, lucideAward, lucideFlag, lucideThumbsUp, lucidePen, lucidePlayCircle,
})],
  template: `
    <!-- Loading -->
    @if (loading()) {
      <div class="cd-loading">
        <div class="cd-spinner"></div>
        <span>Chargement du contrat…</span>
      </div>
    }

    @if (contract(); as c) {
      <div class="cd">

        <!-- Header -->
        <header class="cd-header">
          <div class="cd-header__top">
            <button class="cd-back" (click)="goBack()">
              <ng-icon name="lucideArrowLeft" size="18"></ng-icon>
            </button>
            <div class="cd-header__info">
              <h1 class="cd-header__title">
                <ng-icon [name]="typeIcon(c.contract_type)" size="20"></ng-icon>
                {{ typeLabel(c.contract_type) }}
                <span class="cd-header__ref">#{{ c.id.slice(0, 8) }}</span>
              </h1>
              <div class="cd-header__badges">
                <span class="cd-badge" [class]="'cd-badge--status-' + c.status.toLowerCase()">
                  <ng-icon [name]="statusIcon(c.status)" size="12"></ng-icon>
                  {{ statusLabel(c.status) }}
                </span>
                <span class="cd-badge cd-badge--type">
                  {{ typeLabel(c.contract_type) }}
                </span>
                <span class="cd-header__party" *ngIf="otherParty()">
                  <ng-icon name="lucideUser" size="13"></ng-icon>
                  {{ otherParty() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Tab bar -->
          <div class="cd-tabs">
            @for (tab of tabs; track tab.key) {
              <button
                class="cd-tab"
                [class.active]="activeTab() === tab.key"
                (click)="activeTab.set(tab.key)"
              >
                <ng-icon [name]="tab.icon" size="15"></ng-icon>
                {{ tab.label }}
              </button>
            }
          </div>
        </header>

        <!-- Tab content -->
        <main class="cd-body">

          <!-- ═══════════════ TAB 1: DETAILS ═══════════════ -->
          @if (activeTab() === 'details') {
            <div class="tab-details">

              <!-- Contract overview cards -->
              <div class="d-grid">
                <!-- Type & Status -->
                <div class="d-card">
                  <div class="d-card__header">
                    <ng-icon name="lucideInfo" size="16"></ng-icon>
                    <span class="d-card__title">Informations Générales</span>
                  </div>
                  <div class="d-card__body">
                    <div class="d-field">
                      <span class="d-field__label">Type de contrat</span>
                      <span class="d-field__value">{{ typeLabel(c.contract_type) }}</span>
                    </div>
                    <div class="d-field">
                      <span class="d-field__label">Statut</span>
                      <span class="cd-badge cd-badge--status" [class]="'cd-badge--status-' + c.status.toLowerCase()">
                        {{ statusLabel(c.status) }}
                      </span>
                    </div>
                    <div class="d-field" *ngIf="c.start_date || c.end_date">
                      <span class="d-field__label">Période</span>
                      <span class="d-field__value d-field__dates">
                        <span *ngIf="c.start_date">
                          <ng-icon name="lucideCalendar" size="13"></ng-icon>
                          {{ c.start_date | date:'dd/MM/yyyy' }}
                        </span>
                        <span class="d-arrow" *ngIf="c.end_date">→</span>
                        <span *ngIf="c.end_date">
                          <ng-icon name="lucideCalendar" size="13"></ng-icon>
                          {{ c.end_date | date:'dd/MM/yyyy' }}
                        </span>
                      </span>
                    </div>
                    <div class="d-field" *ngIf="c.duration_days">
                      <span class="d-field__label">Durée</span>
                      <span class="d-field__value">
                        <ng-icon name="lucideTimer" size="13"></ng-icon>
                        {{ c.duration_days }} jours
                      </span>
                    </div>
                    <div class="d-field" *ngIf="c.description">
                      <span class="d-field__label">Description</span>
                      <p class="d-field__desc">{{ c.description }}</p>
                    </div>
                  </div>
                </div>

                <!-- Financial Summary -->
                <div class="d-card d-card--finance">
                  <div class="d-card__header">
                    <ng-icon name="lucideDollarSign" size="16"></ng-icon>
                    <span class="d-card__title">Résumé Financier</span>
                  </div>
                  <div class="d-card__body">
                    <div class="d-finance-row">
                      <span class="d-finance__label">Montant proposé</span>
                      <span class="d-finance__value">{{ fmt(c.proposed_amount_tnd) }} TND</span>
                    </div>
                    <div class="d-finance-row" *ngIf="c.final_amount_tnd">
                      <span class="d-finance__label">Montant final</span>
                      <span class="d-finance__value d-finance__final">{{ fmt(c.final_amount_tnd) }} TND</span>
                    </div>
                    <div class="d-finance-row" *ngIf="c.platform_commission_tnd">
                      <span class="d-finance__label">Commission plateforme</span>
                      <span class="d-finance__value d-finance__commission">- {{ fmt(c.platform_commission_tnd) }} TND</span>
                    </div>
                    <div class="d-finance-row" *ngIf="c.net_to_provider_tnd">
                      <span class="d-finance__label">Net au prestataire</span>
                      <span class="d-finance__value d-finance__net">{{ fmt(c.net_to_provider_tnd) }} TND</span>
                    </div>
                    <div class="d-finance-row d-finance-row--total">
                      <span class="d-finance__label">Montant total</span>
                      <span class="d-finance__value d-finance__total">{{ fmt(c.total_amount_tnd) }} TND</span>
                    </div>
                    <div class="d-finance-row" *ngIf="c.commission_amount_tnd">
                      <span class="d-finance__label">Commission totale</span>
                      <span class="d-finance__value">{{ fmt(c.commission_amount_tnd) }} TND</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Profiles row -->
              <div class="d-grid d-grid--profiles">
                <!-- Provider -->
                <div class="d-card d-card--profile">
                  <div class="d-card__header">
                    <ng-icon name="lucideBriefcase" size="16"></ng-icon>
                    <span class="d-card__title">Prestataire</span>
                  </div>
                  <div class="d-card__body d-card__body--profile">
                    <div class="d-avatar">
                      {{ providerName().charAt(0).toUpperCase() }}
                    </div>
                    <div class="d-profile-info">
                      <span class="d-profile-name">{{ providerName() }}</span>
                      <span class="d-profile-role">Prestataire</span>
                    </div>
                    <button class="d-msg-btn" (click)="openQuickMessage()">
                      <ng-icon name="lucideMessageSquare" size="14"></ng-icon>
                      Message
                    </button>
                  </div>
                </div>

                <!-- Farmer -->
                <div class="d-card d-card--profile">
                  <div class="d-card__header">
                    <ng-icon name="lucideTruck" size="16"></ng-icon>
                    <span class="d-card__title">Fermier</span>
                  </div>
                  <div class="d-card__body d-card__body--profile">
                    <div class="d-avatar d-avatar--farmer">
                      {{ farmerName().charAt(0).toUpperCase() }}
                    </div>
                    <div class="d-profile-info">
                      <span class="d-profile-name">{{ farmerName() }}</span>
                      <span class="d-profile-role">Fermier</span>
                    </div>
                    <button class="d-msg-btn" (click)="openQuickMessage()">
                      <ng-icon name="lucideMessageSquare" size="14"></ng-icon>
                      Message
                    </button>
                  </div>
                </div>
              </div>

              <!-- Parcel info -->
              @if (c.terms_snapshot && (c.terms_snapshot['parcel_name'] || c.terms_snapshot['parcel_location'] || c.terms_snapshot['parcel_size'])) {
                <div class="d-card d-card--parcel">
                  <div class="d-card__header">
                    <ng-icon name="lucideMapPin" size="16"></ng-icon>
                    <span class="d-card__title">Parcelle</span>
                  </div>
                  <div class="d-card__body">
                    <div class="d-field" *ngIf="c.terms_snapshot['parcel_name']">
                      <span class="d-field__label">Nom</span>
                      <span class="d-field__value">{{ c.terms_snapshot['parcel_name'] }}</span>
                    </div>
                    <div class="d-field" *ngIf="c.terms_snapshot['parcel_location']">
                      <span class="d-field__label">Localisation</span>
                      <span class="d-field__value">
                        <ng-icon name="lucideMapPin" size="13"></ng-icon>
                        {{ c.terms_snapshot['parcel_location'] }}
                      </span>
                    </div>
                    <div class="d-field" *ngIf="c.terms_snapshot['parcel_size']">
                      <span class="d-field__label">Superficie</span>
                      <span class="d-field__value">{{ c.terms_snapshot['parcel_size'] }} ha</span>
                    </div>
                  </div>
                </div>
              }

              <!-- ─── SIGNATURE & COMPLETION ACTIONS ─── -->
              @if (c.status === 'EN_ATTENTE_SIGNATURE') {
                <div class="d-card d-card--signature">
                  <div class="d-card__header">
                    <ng-icon name="lucideCheckCircle" size="18"></ng-icon>
                    <span class="d-card__title">Signer le contrat</span>
                  </div>
                  <div class="d-card__body d-card__body--signature">
                    <p class="signature-intro">
                      Ce contrat est prêt à être signé. Vérifiez tous les détails ci-dessous avant de confirmer.
                    </p>
                    <div class="signature-summary">
                      <div class="sig-row">
                        <span>Taux journalier</span>
                        <strong>{{ fmt(c.daily_rate_agreed || c.terms_snapshot['daily_rate_tnd'] || 0) }} TND/jour</strong>
                      </div>
                      <div class="sig-row">
                        <span>Durée</span>
                        <strong>{{ c.duration_days || c.total_days || 0 }} jours</strong>
                      </div>
                      <div class="sig-row">
                        <span>Montant total</span>
                        <strong>{{ fmt(c.total_amount_tnd || c.total_amount_agreed || 0) }} TND</strong>
                      </div>
                      <div class="sig-row">
                        <span>Commission plateforme</span>
                        <strong>{{ fmt(c.commission_amount_tnd) }} TND</strong>
                      </div>
                    </div>
                    <div class="signature-actions">
                      <button
                        class="btn btn-primary btn-lg btn-full"
                        (click)="signContract()"
                        [disabled]="signing()"
                      >
                        <ng-icon name="lucideCheckCircle" size="18"></ng-icon>
                        {{ signing() ? 'Signature en cours…' : 'Signer et Confirmer' }}
                      </button>
                      <a class="sig-problem-link" (click)="openDispute()">Signaler un problème</a>
                    </div>
                  </div>
                </div>
              }

              @if (c.status === 'EN_COURS' || c.status === 'IN_PROGRESS' || c.status === 'ACTIF') {
                @if (isProvider()) {
                  <div class="d-card d-card--complete">
                    <div class="d-card__header">
                      <ng-icon name="lucideFlag" size="16"></ng-icon>
                      <span class="d-card__title">Mission en cours</span>
                    </div>
                    <div class="d-card__body">
                      @if (c.worker_marked_complete) {
                        <p>Vous avez marqué cette mission comme terminée. En attente de confirmation du fermier.</p>
                      } @else {
                        <p>La mission est active. Marquez-la comme terminée une fois le travail fini.</p>
                        <button class="btn btn-primary btn-full" (click)="workerMarkComplete()" [disabled]="markingComplete()">
                          <ng-icon name="lucideCheck" size="16"></ng-icon>
                          Marquer comme Terminée
                        </button>
                      }
                    </div>
                  </div>
                } @else if (!isProvider() && c.worker_marked_complete) {
                  <div class="d-card d-card--confirm">
                    <div class="d-card__header">
                      <ng-icon name="lucideThumbsUp" size="16"></ng-icon>
                      <span class="d-card__title">Confirmer la fin de mission</span>
                    </div>
                    <div class="d-card__body">
                      <p>Le travailleur a marqué la mission comme terminée. Confirmez pour libérer le paiement.</p>
                      <button class="btn btn-primary btn-full" (click)="farmerConfirmComplete()" [disabled]="confirming()">
                        <ng-icon name="lucideCheckCircle" size="16"></ng-icon>
                        Confirmer et Payer
                      </button>
                    </div>
                  </div>
                }
              }

              @if (c.status === 'ACTIF' && isProvider()) {
                <div class="d-card d-card--gps">
                  <div class="d-card__header">
                    <ng-icon name="lucideMapPin" size="16"></ng-icon>
                    <span class="d-card__title">Accès à la parcelle</span>
                  </div>
                  <div class="d-card__body">
                    @if (c.terms_snapshot['parcel_lat'] && c.terms_snapshot['parcel_lng']) {
                      <a class="btn btn-outline btn-full"
                         [href]="'https://www.google.com/maps/dir/?api=1&destination=' + c.terms_snapshot['parcel_lat'] + ',' + c.terms_snapshot['parcel_lng']"
                         target="_blank">
                        <ng-icon name="lucideMapPin" size="16"></ng-icon>
                        Naviguer vers la parcelle
                      </a>
                      <div class="parcel-meta" *ngIf="c.terms_snapshot['parcel_size']">
                        <span>Superficie: {{ c.terms_snapshot['parcel_size'] }} ha</span>
                      </div>
                    } @else {
                      <span class="text-muted">Coordonnées GPS non disponibles</span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- ═══════════════ TAB 2: MESSAGES ═══════════════ -->
          @if (activeTab() === 'messages') {
            <div class="tab-messages">
              <div class="msg-area" #messagesArea>
                @if (msgsLoading()) {
                  <div class="msg-skel">
                    <div class="msg-skel__bubble theirs"></div>
                    <div class="msg-skel__bubble mine"></div>
                    <div class="msg-skel__bubble theirs short"></div>
                  </div>
                }

                @if (!msgsLoading()) {
                  <div class="msg-inner">
                    @if (messages().length === 0) {
                      <div class="msg-empty">
                        <ng-icon name="lucideMessageSquare" size="40"></ng-icon>
                        <p>Aucun message</p>
                        <small>Commencez la conversation pour ce contrat</small>
                      </div>
                    }

                    @for (m of messages(); track m.id; let i = $index) {
                      <!-- Date separator -->
                      @if (showDateSep(m)) {
                        <div class="msg-date-sep">
                          <span class="msg-date-sep__label">{{ getDateLabel(m.created_at) }}</span>
                        </div>
                      }

                      <!-- SYSTEM message -->
                      @if (m.message_type === 'SYSTEM') {
                        <div class="msg-system">
                          <span class="msg-system__content">{{ m.content }}</span>
                          <span class="msg-system__time">{{ m.created_at | date:'HH:mm' }}</span>
                        </div>
                      }

                      <!-- TEXT message -->
                      @if (m.message_type === 'TEXT') {
                        <div class="msg-bubble-wrap" [class.mine]="m.sender_id === myId()">
                          <div class="msg-bubble" [class.mine]="m.sender_id === myId()" [class.theirs]="m.sender_id !== myId()">
                            @if (m.sender_id !== myId()) {
                              <span class="msg-sender">{{ senderName(m.sender_id) }}</span>
                            }
                            <span class="msg-body">{{ m.content }}</span>
                            <span class="msg-meta">{{ m.created_at | date:'HH:mm' }}</span>
                          </div>
                        </div>
                      }

                      <!-- OFFER / COUNTER_OFFER message as structured card -->
                      @if (m.message_type === 'OFFER' || m.message_type === 'COUNTER_OFFER') {
                        <div class="msg-bubble-wrap" [class.mine]="m.sender_id === myId()">
                          <div class="msg-offer-card" [class.mine]="m.sender_id === myId()" [class.theirs]="m.sender_id !== myId()">
                            @if (m.sender_id !== myId()) {
                              <span class="msg-offer__sender">{{ senderName(m.sender_id) }}</span>
                            }
                            <span class="msg-offer__type-label">
                              {{ m.message_type === 'OFFER' ? 'Proposition' : 'Contre-offre' }}
                            </span>
                            <div class="msg-offer__amount">
                              {{ fmt(m.offer_amount_tnd || 0) }}
                              <span class="msg-offer__currency">TND</span>
                            </div>

                            <!-- Action buttons: only for receiver (not sender) and only if not yet responded.
                                 FIX B — masquées sur les contrats nés d'une négociation structurée :
                                 le prix y est déjà fixé (rounds AGREED), le chat reste TEXT/SYSTEM. -->
                            @if (m.sender_id !== myId() && !hasResponded(m.id) && !isNegotiationBorn()) {
                              <div class="msg-offer__actions">
                                <button
                                  class="msg-offer__btn msg-offer__btn--accept"
                                  (click)="acceptOffer(m)"
                                  [disabled]="actionLoading()"
                                >
                                  <ng-icon name="lucideCheck" size="14"></ng-icon>
                                  Accepter
                                </button>
                                <button
                                  class="msg-offer__btn msg-offer__btn--counter"
                                  (click)="toggleCounterOffer(m.id)"
                                >
                                  <ng-icon name="lucideArrowLeft" size="14"></ng-icon>
                                  Faire une contre-offre
                                </button>
                              </div>

                              <!-- Inline counter-offre expansion -->
                              <div class="msg-counter-expand" [class.open]="counterTarget() === m.id">
                                <div class="msg-counter-expand__inner">
                                  <div class="msg-counter-input">
                                    <input
                                      type="number"
                                      [(ngModel)]="counterAmount"
                                      placeholder="Montant en TND"
                                      class="counter-input"
                                      min="0"
                                    />
                                    <button
                                      class="msg-offer__btn msg-offer__btn--send"
                                      (click)="sendCounterOffer(m)"
                                      [disabled]="!counterAmount || counterAmount <= 0 || actionLoading()"
                                    >
                                      <ng-icon name="lucideSend" size="14"></ng-icon>
                                      Envoyer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            }

                            <!-- If sent by current user: show "En attente" badge -->
                            @if (m.sender_id === myId() && !hasResponded(m.id)) {
                              <span class="msg-offer__pending-badge">
                                <ng-icon name="lucideClock" size="12"></ng-icon>
                                En attente de réponse
                              </span>
                            }

                            <!-- If responded to (counter sent): show status -->
                            @if (hasResponded(m.id)) {
                              <span class="msg-offer__responded">
                                {{ m.message_type === 'OFFER' ? 'Contre-offre envoyée' : 'Réponse envoyée' }}
                              </span>
                            }

                            <span class="msg-offer__time">{{ m.created_at | date:'HH:mm' }}</span>
                          </div>
                        </div>
                      }
              }

              <!-- Evaluation & Worker Reply -->
              @if (c.status === 'COMPLETED' && c.employer_rating) {
                <div class="d-card d-card--evaluation">
                  <div class="d-card__header">
                    <ng-icon name="lucideStar" size="16"></ng-icon>
                    <span class="d-card__title">Évaluation du travailleur</span>
                  </div>
                  <div class="d-card__body">
                    <div class="eval-stars">
                      @for (s of [1,2,3,4,5]; track s) {
                        <span class="star" [class.filled]="s <= (c.employer_rating || 0)">★</span>
                      }
                      <span class="eval-score">{{ c.employer_rating }}/5</span>
                    </div>
                    @if (c.employer_rating_badges?.length) {
                      <div class="eval-badges">
                        @for (b of c.employer_rating_badges; track b) {
                          <span class="eval-badge">{{ badgeLabel(b) }}</span>
                        }
                      </div>
                    }
                    @if (c.employer_comment) {
                      <blockquote class="eval-comment">{{ c.employer_comment }}</blockquote>
                    }
                    @if (c.worker_reply) {
                      <div class="worker-reply">
                        <strong>Votre réponse :</strong>
                        <p>{{ c.worker_reply }}</p>
                      </div>
                    } @else if (isProvider()) {
                      <div class="worker-reply-form">
                        <label>Répondre à l'évaluation (1 chance, 200 caractères max)</label>
                        <textarea [(ngModel)]="workerReplyText" class="form-input" rows="2" maxlength="200"></textarea>
                        <div class="reply-actions">
                          <span class="char-count">{{ workerReplyText().length }}/200</span>
                          <button class="btn btn-primary btn-sm" (click)="submitWorkerReply()"
                            [disabled]="!workerReplyText().trim() || submittingReply()">
                            Envoyer la réponse
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
              </div>

              <!-- Message input -->
              <footer class="msg-footer">
                <div class="msg-input-wrap">
                  <textarea
                    class="msg-input"
                    [(ngModel)]="draft"
                    placeholder="Écrire un message…"
                    rows="1"
                    (keydown.enter)="onEnter($event)"
                    (input)="autoResize($event)"
                  ></textarea>
                </div>
                <button
                  class="msg-send"
                  (click)="sendMessage()"
                  [disabled]="!draft.trim() || sending()"
                  [class.active]="draft.trim()"
                >
                  <ng-icon name="lucideSend" size="18"></ng-icon>
                </button>
              </footer>
            </div>
          }

          <!-- ═══════════════ TAB 3: DOCUMENTS ═══════════════ -->
          @if (activeTab() === 'documents') {
            <div class="tab-documents">
              @if (docsLoading()) {
                <div class="cd-docs-loading">
                  <div class="cd-spinner"></div>
                  <span>Chargement des documents…</span>
                </div>
              } @else if (documents().length === 0) {
                <div class="cd-docs-empty">
                  <ng-icon name="lucideFileText" size="48"></ng-icon>
                  <h3>Aucun document</h3>
                  <p>Les documents générés automatiquement apparaîtront ici une fois le contrat en cours.</p>
                </div>
              } @else {
                <div class="cd-docs-list">
                  @for (doc of documents(); track doc.id) {
                    <div class="cd-doc-row">
                      <div class="cd-doc-row__icon">
                        <ng-icon name="lucideFileText" size="20"></ng-icon>
                      </div>
                      <div class="cd-doc-row__info">
                        <span class="cd-doc-row__type">{{ docTypeLabel(doc.document_type) }}</span>
                        <span class="cd-doc-row__date">Généré le {{ doc.generated_at | date:'dd/MM/yyyy à HH:mm' }}</span>
                      </div>
                      <button class="cd-doc-row__download" (click)="downloadDoc(doc)">
                        <ng-icon name="lucideDownload" size="14"></ng-icon>
                        Télécharger PDF
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- ═══════════════ TAB 4: HISTORY ═══════════════ -->
          @if (activeTab() === 'history') {
            <div class="tab-history">
              @if (historyLoading()) {
                <div class="cd-history-loading">
                  <div class="cd-spinner"></div>
                  <span>Chargement de l'historique…</span>
                </div>
              } @else if (history().length === 0) {
                <div class="cd-history-empty">
                  <ng-icon name="lucideBookOpen" size="48"></ng-icon>
                  <h3>Aucun historique</h3>
                  <p>Les actions effectuées sur ce contrat seront affichées ici.</p>
                </div>
              } @else {
                <div class="cd-timeline">
                  @for (entry of history(); track $index) {
                    <div class="tl-entry">
                      <div class="tl-dot"></div>
                      <div class="tl-line"></div>
                      <div class="tl-content">
                        <span class="tl-action">{{ entry.action }}</span>
                        <span class="tl-by" *ngIf="entry.by_name">
                          <ng-icon name="lucideUser" size="12"></ng-icon>
                          {{ entry.by_name }}
                        </span>
                        <span class="tl-time">{{ entry.at | date:'dd/MM/yyyy à HH:mm:ss' }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

        </main>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Loading ── */
    .cd-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 80px 16px; color: var(--text-muted); font-size: 14px;
    }
    .cd-spinner {
      width: 32px; height: 32px; border: 3px solid var(--border);
      border-top-color: var(--zir-emerald); border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .cd {
      background: var(--bg-primary); min-height: calc(100vh - 64px);
      display: flex; flex-direction: column;
    }

    /* ── Header ── */
    .cd-header {
      position: sticky; top: 0; z-index: 10;
      background: var(--bg-card); border-bottom: 1px solid var(--border);
    }
    .cd-header__top {
      display: flex; align-items: center; gap: 14px; padding: 16px 24px 12px;
    }
    .cd-back {
      width: 36px; height: 36px; border-radius: 8px;
      background: var(--bg-primary); border: 1px solid var(--border);
      color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; flex-shrink: 0;
    }
    .cd-back:hover { border-color: var(--zir-emerald); color: var(--zir-emerald); }
    .cd-header__info { flex: 1; min-width: 0; }
    .cd-header__title {
      font-size: 1.15rem; font-weight: 800; color: var(--text-primary);
      margin: 0; display: flex; align-items: center; gap: 8px;
    }
    .cd-header__ref {
      font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
      background: var(--bg-primary); padding: 2px 8px; border-radius: 6px;
    }
    .cd-header__badges {
      display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;
    }
    .cd-header__party {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);
    }

    /* ── Badges ── */
    .cd-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; padding: 3px 10px; border-radius: 999px;
    }
    .cd-badge--type {
      background: rgba(255,255,255,0.06); color: var(--text-muted);
    }
    .cd-badge--status-DRAFT { background: rgba(255,255,255,0.08); color: var(--text-muted); }
    .cd-badge--status-NEGOTIATING {
      background: var(--warning-alpha, rgba(245,158,11,0.1)); color: #fbbf24;
    }
    .cd-badge--status-ACCEPTED {
      background: var(--zir-emerald-alpha-10, rgba(34,197,94,0.1)); color: var(--zir-emerald);
    }
    .cd-badge--status-IN_PROGRESS {
      background: rgba(59,130,246,0.12); color: #60a5fa;
    }
    .cd-badge--status-COMPLETED {
      background: rgba(139,92,246,0.12); color: #a78bfa;
    }
    .cd-badge--status-CANCELLED {
      background: rgba(107,114,128,0.12); color: #9ca3af;
    }
    .cd-badge--status-DISPUTED {
      background: rgba(239,68,68,0.12); color: #f87171;
    }

    /* ── Tabs ── */
    .cd-tabs {
      display: flex; gap: 2px; padding: 0 24px;
      background: var(--bg-card);
    }
    .cd-tab {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 16px; border: none; border-radius: 0;
      background: transparent; color: var(--text-muted);
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .cd-tab:hover { color: var(--text-secondary); }
    .cd-tab.active {
      color: var(--zir-emerald); border-bottom-color: var(--zir-emerald);
    }

    /* ── Body ── */
    .cd-body {
      flex: 1; padding: 24px; overflow-y: auto;
    }

    /* ═══ TAB 1: DETAILS ═══ */
    .tab-details {
      display: flex; flex-direction: column; gap: 20px;
      max-width: 900px;
    }
    .d-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .d-grid--profiles {
      grid-template-columns: 1fr 1fr;
    }

    .d-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .d-card--finance { grid-column: span 1; }
    .d-card--parcel { grid-column: span 1; }
    .d-card--evaluation { grid-column: span 2; margin-top: 16px; }

    .eval-stars { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .eval-stars .star { font-size: 22px; color: var(--border); }
    .eval-stars .star.filled { color: var(--warning); }
    .eval-stars .eval-score { margin-left: 8px; font-weight: 700; font-size: 14px; color: var(--text); }
    .eval-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .eval-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; background: var(--bg-muted); color: var(--text-secondary); }
    .eval-comment { margin: 0 0 8px; padding: 8px 12px; background: var(--bg-muted); border-radius: 6px; border-left: 2px solid var(--border); font-style: italic; font-size: 13px; color: var(--text-secondary); }
    .worker-reply { margin-top: 8px; padding: 8px 12px; background: var(--zir-emerald-alpha-5); border-radius: 6px; font-size: 13px; color: var(--zir-emerald); }
    .worker-reply strong { display: block; margin-bottom: 4px; font-size: 12px; }
    .worker-reply p { margin: 0; }
    .worker-reply-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
    .worker-reply-form label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
    .form-input { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-size: 14px; box-sizing: border-box; resize: vertical; }
    .form-input:focus { outline: none; border-color: var(--zir-emerald); }
    .reply-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .char-count { font-size: 11px; color: var(--text-muted); }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; border: none; }
    .btn-primary { background: var(--zir-emerald); color: #fff; }
    .btn-primary:hover { opacity: .9; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-sm { padding: 6px 12px; font-size: 13px; }

    .d-card__header {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }
    .d-card__header ng-icon { color: var(--zir-emerald); }
    .d-card__title {
      font-size: 0.82rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-muted);
    }
    .d-card__body { padding: 16px; }
    .d-card__body--profile {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }

    .d-field { margin-bottom: 12px; }
    .d-field:last-child { margin-bottom: 0; }
    .d-field__label {
      display: block; font-size: 0.72rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--text-muted); margin-bottom: 4px;
    }
    .d-field__value {
      display: flex; align-items: center; gap: 5px;
      font-size: 0.88rem; font-weight: 600; color: var(--text-primary);
    }
    .d-field__dates { display: flex; align-items: center; gap: 6px; }
    .d-field__dates span { display: inline-flex; align-items: center; gap: 4px; }
    .d-arrow { color: var(--text-muted); font-weight: 400; }
    .d-field__desc {
      margin: 0; font-size: 0.85rem; line-height: 1.5;
      color: var(--text-secondary);
    }

    .d-finance-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--border);
    }
    .d-finance-row:last-child { border-bottom: none; }
    .d-finance-row--total {
      padding-top: 12px; margin-top: 4px;
      border-top: 2px solid var(--border); border-bottom: none;
    }
    .d-finance__label { font-size: 0.82rem; color: var(--text-muted); }
    .d-finance__value { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
    .d-finance__final { color: var(--zir-emerald); }
    .d-finance__commission { color: #f87171; }
    .d-finance__net { color: #60a5fa; }
    .d-finance__total { font-size: 1.05rem; font-weight: 800; }

    /* Profile cards */
    .d-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--zir-emerald); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.1rem; flex-shrink: 0;
    }
    .d-avatar--farmer {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }
    .d-profile-info { flex: 1; min-width: 0; }
    .d-profile-name {
      display: block; font-size: 0.92rem; font-weight: 700; color: var(--text-primary);
    }
    .d-profile-role {
      display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;
    }
    .d-msg-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary);
      font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .d-msg-btn:hover {
      border-color: var(--zir-emerald); color: var(--zir-emerald);
      background: var(--zir-emerald-alpha-10);
    }

    /* ═══ TAB 2: MESSAGES ═══ */
    .tab-messages {
      display: flex; flex-direction: column; height: calc(100vh - 160px);
    }

    .msg-area {
      flex: 1; overflow-y: auto; padding: 0 16px;
    }
    .msg-inner { display: flex; flex-direction: column; padding: 16px 0; }

    .msg-skel { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
    .msg-skel__bubble {
      height: 44px; border-radius: 14px; animation: pulse 1.5s infinite; max-width: 55%;
    }
    .msg-skel__bubble.mine { align-self: flex-end; background: var(--zir-emerald-alpha-10); }
    .msg-skel__bubble.theirs { align-self: flex-start; background: var(--bg-card); border: 1px solid var(--border); }
    .msg-skel__bubble.short { max-width: 35%; height: 32px; }

    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    .msg-empty {
      text-align: center; padding: 60px 16px; color: var(--text-muted);
    }
    .msg-empty ng-icon { opacity: 0.3; margin-bottom: 12px; }
    .msg-empty p { font-weight: 700; margin: 0 0 4px; color: var(--text-secondary); }
    .msg-empty small { font-size: 0.82rem; }

    /* Date separator */
    .msg-date-sep { text-align: center; margin: 16px 0; }
    .msg-date-sep__label {
      font-size: 0.72rem; color: var(--text-muted); background: var(--bg-primary);
      padding: 2px 12px; border-radius: 10px;
    }

    /* System messages */
    .msg-system {
      display: flex; flex-direction: column; align-items: center;
      gap: 3px; margin: 12px 0;
    }
    .msg-system__content {
      font-size: 0.78rem; color: var(--text-muted); font-style: italic;
      background: rgba(255,255,255,0.04); padding: 4px 14px; border-radius: 8px;
    }
    .msg-system__time { font-size: 0.65rem; color: var(--text-muted); }

    /* TEXT bubbles */
    .msg-bubble-wrap { display: flex; margin-bottom: 4px; }
    .msg-bubble-wrap.mine { justify-content: flex-end; }

    .msg-bubble {
      max-width: 70%; padding: 10px 14px; border-radius: 16px;
      font-size: 0.88rem; line-height: 1.4; position: relative;
    }
    .msg-bubble.mine {
      background: var(--zir-emerald); color: white;
      border-bottom-right-radius: 4px;
    }
    .msg-bubble.theirs {
      background: var(--bg-card); border: 1px solid var(--border);
      color: var(--text-primary); border-bottom-left-radius: 4px;
    }
    .msg-sender {
      display: block; font-size: 0.7rem; font-weight: 700; margin-bottom: 3px;
      opacity: 0.7;
    }
    .msg-bubble.mine .msg-sender { display: none; }
    .msg-body { display: block; }
    .msg-meta {
      display: block; text-align: right;
      font-size: 0.65rem; margin-top: 4px; opacity: 0.6;
    }
    .msg-bubble.mine .msg-meta { color: rgba(255,255,255,0.8); }
    .msg-bubble.theirs .msg-meta { color: var(--text-muted); }

    /* OFFER / COUNTER_OFFER cards */
    .msg-offer-card {
      max-width: 320px; padding: 16px; border-radius: 14px;
      border: 1px solid var(--border);
    }
    .msg-offer-card.theirs {
      background: var(--zir-emerald-alpha-10, rgba(34,197,94,0.08));
      border-color: rgba(34,197,94,0.2);
    }
    .msg-offer-card.mine {
      background: var(--bg-card); border-color: var(--border);
    }
    .msg-offer__sender {
      display: block; font-size: 0.7rem; font-weight: 700;
      color: var(--text-secondary); margin-bottom: 6px;
    }
    .msg-offer__type-label {
      display: block; font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--zir-emerald); margin-bottom: 4px;
    }
    .msg-offer__amount {
      display: block; font-size: 1.6rem; font-weight: 800;
      color: var(--text-primary); margin-bottom: 12px;
      line-height: 1;
    }
    .msg-offer__currency {
      font-size: 0.8rem; font-weight: 600; color: var(--text-muted);
      margin-left: 2px;
    }

    /* Offer actions */
    .msg-offer__actions {
      display: flex; gap: 6px; margin-bottom: 8px;
    }
    .msg-offer__btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: 8px; border: none;
      font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s; flex: 1; justify-content: center;
    }
    .msg-offer__btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .msg-offer__btn--accept {
      background: var(--zir-emerald); color: white;
    }
    .msg-offer__btn--accept:hover:not(:disabled) { opacity: 0.85; }
    .msg-offer__btn--counter {
      background: var(--bg-primary); border: 1px solid var(--border);
      color: var(--text-secondary);
    }
    .msg-offer__btn--counter:hover:not(:disabled) {
      border-color: var(--zir-emerald); color: var(--zir-emerald);
    }
    .msg-offer__btn--send {
      background: var(--zir-emerald); color: white;
      flex: 0 0 auto; padding: 7px 16px;
    }
    .msg-offer__btn--send:hover:not(:disabled) { opacity: 0.85; }

    /* Inline counter-offer expansion */
    .msg-counter-expand {
      max-height: 0; overflow: hidden; transition: max-height 0.3s ease;
    }
    .msg-counter-expand.open { max-height: 120px; }
    .msg-counter-expand__inner {
      padding-top: 8px;
    }
    .msg-counter-input {
      display: flex; gap: 6px; align-items: stretch;
    }
    .counter-input {
      flex: 1; padding: 8px 12px;
      background: var(--bg-primary); border: 1.5px solid var(--border);
      border-radius: 8px; color: var(--text-primary);
      font-size: 0.88rem; font-weight: 600;
      outline: none; font-family: inherit;
    }
    .counter-input:focus { border-color: var(--zir-emerald); }

    /* Pending / Responded badges on offer cards */
    .msg-offer__pending-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.7rem; font-weight: 600; color: var(--text-muted);
      background: rgba(245,158,11,0.1); padding: 4px 10px;
      border-radius: 6px; margin-bottom: 6px;
    }
    .msg-offer__responded {
      display: block; font-size: 0.72rem; font-weight: 600;
      color: var(--text-muted); margin-bottom: 6px;
      font-style: italic;
    }
    .msg-offer__time {
      display: block; text-align: right;
      font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;
    }

    /* Message footer / input */
    .msg-footer {
      display: flex; align-items: flex-end; gap: 10px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: var(--bg-card);
    }
    .msg-input-wrap { flex: 1; }
    .msg-input {
      width: 100%; background: var(--bg-primary);
      border: 1.5px solid var(--border); border-radius: 14px;
      color: var(--text-primary); font-size: 0.92rem;
      padding: 11px 16px; resize: none; max-height: 120px;
      overflow-y: auto; outline: none; font-family: inherit;
      transition: border-color 0.2s; line-height: 1.4;
    }
    .msg-input::placeholder { color: var(--text-muted); }
    .msg-input:focus { border-color: var(--zir-emerald); }

    .msg-send {
      width: 44px; height: 44px; border-radius: 14px;
      background: var(--border); color: var(--text-muted);
      border: none; cursor: not-allowed; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: all 0.25s;
    }
    .msg-send.active {
      background: var(--zir-emerald); color: white; cursor: pointer;
    }
    .msg-send.active:hover { opacity: 0.9; }
    .msg-send:disabled { opacity: 0.5; }

    /* ═══ TAB 3: DOCUMENTS ═══ */
    .tab-documents {
      max-width: 700px;
    }
    .cd-docs-loading, .cd-history-loading {
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px; color: var(--text-muted);
    }
    .cd-docs-empty, .cd-history-empty {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px; text-align: center; color: var(--text-muted);
    }
    .cd-docs-empty ng-icon, .cd-history-empty ng-icon { opacity: 0.3; }
    .cd-docs-empty h3, .cd-history-empty h3 {
      margin: 0; font-size: 1rem; color: var(--text-secondary);
    }
    .cd-docs-empty p, .cd-history-empty p {
      margin: 0; font-size: 0.85rem; max-width: 320px;
    }

    .cd-docs-list {
      display: flex; flex-direction: column; gap: 10px;
    }
    .cd-doc-row {
      display: flex; align-items: center; gap: 14px;
      padding: 16px; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: 12px;
      transition: border-color 0.15s;
    }
    .cd-doc-row:hover { border-color: rgba(255,255,255,0.12); }
    .cd-doc-row__icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: rgba(59,130,246,0.12); color: #60a5fa;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cd-doc-row__info { flex: 1; min-width: 0; }
    .cd-doc-row__type {
      display: block; font-size: 0.88rem; font-weight: 700; color: var(--text-primary);
    }
    .cd-doc-row__date {
      display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;
    }
    .cd-doc-row__download {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary);
      font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s; white-space: nowrap;
    }
    .cd-doc-row__download:hover {
      border-color: var(--zir-emerald); color: var(--zir-emerald);
      background: var(--zir-emerald-alpha-10);
    }

    /* ═══ TAB 4: HISTORY ═══ */
    .tab-history { max-width: 700px; }

    .cd-timeline { display: flex; flex-direction: column; }
    .tl-entry {
      position: relative; padding: 16px 0 16px 32px;
    }
    .tl-entry:last-child .tl-line { display: none; }
    .tl-dot {
      position: absolute; left: 8px; top: 20px;
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--zir-emerald); border: 2px solid var(--bg-primary);
      z-index: 1;
    }
    .tl-line {
      position: absolute; left: 13px; top: 32px; bottom: 0;
      width: 2px; background: var(--border);
    }
    .tl-content {
      display: flex; flex-direction: column; gap: 4px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 10px; padding: 12px 16px;
    }
    .tl-action {
      font-size: 0.88rem; font-weight: 600; color: var(--text-primary);
    }
    .tl-by {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.78rem; color: var(--text-secondary);
    }
    .tl-time { font-size: 0.72rem; color: var(--text-muted); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .cd-body { padding: 16px; }
      .d-grid { grid-template-columns: 1fr; }
      .d-grid--profiles { grid-template-columns: 1fr; }
      .cd-header__top { padding: 12px 16px 8px; }
      .cd-tabs { padding: 0 16px; overflow-x: auto; }
      .cd-tab { padding: 8px 12px; font-size: 0.78rem; white-space: nowrap; }
      .msg-area { padding: 0 8px; }
    }
  `]
})
export class ContractDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly api = inject(ContractsApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  @ViewChild('messagesArea') private messagesArea!: ElementRef<HTMLDivElement>;

  readonly tabs: TabDef[] = [
    { key: 'details', label: 'Détails', icon: 'lucideInfo' },
    { key: 'messages', label: 'Messagerie', icon: 'lucideMessageSquare' },
    { key: 'documents', label: 'Documents', icon: 'lucideFileText' },
    { key: 'history', label: 'Historique', icon: 'lucideBookOpen' },
  ];

  readonly loading = signal(true);
  readonly contract = signal<MissionContract | null>(null);
  readonly activeTab = signal<DetailTab>('details');
  readonly messages = signal<MissionMessage[]>([]);
  readonly msgsLoading = signal(false);
  readonly sending = signal(false);
  readonly documents = signal<MissionContractDocument[]>([]);
  readonly docsLoading = signal(false);
  readonly history = signal<any[]>([]);
  readonly historyLoading = signal(false);
  readonly myId = signal<string>('');
  readonly actionLoading = signal(false);
  readonly counterTarget = signal<string | null>(null);
  readonly respondedIds = signal<Set<string>>(new Set());
  readonly workerReplyText = signal('');
  readonly submittingReply = signal(false);
  readonly signing = signal(false);
  readonly markingComplete = signal(false);
  readonly confirming = signal(false);

  draft = '';
  counterAmount: number | null = null;
  private shouldScrollBottom = false;

  private lastDateSep = '';

  readonly otherParty = computed(() => {
    const c = this.contract();
    if (!c) return '';
    const snap = c.terms_snapshot ?? {};
    const user = this.auth.currentUser();
    if (user && c.initiator_id === user.id) {
      return snap['counterparty_name'] ?? snap['provider_name'] ?? snap['farmer_name'] ?? 'Autre partie';
    }
    return snap['initiator_name'] ?? snap['farmer_name'] ?? snap['provider_name'] ?? 'Autre partie';
  });

  readonly providerName = computed(() => {
    const c = this.contract();
    if (!c) return 'Prestataire';
    const snap = c.terms_snapshot ?? {};
    return snap['provider_name'] ?? snap['counterparty_name'] ?? 'Prestataire';
  });

  readonly farmerName = computed(() => {
    const c = this.contract();
    if (!c) return 'Fermier';
    const snap = c.terms_snapshot ?? {};
    return snap['farmer_name'] ?? snap['initiator_name'] ?? 'Fermier';
  });

  readonly isProvider = computed(() => {
    const c = this.contract();
    const uid = this.myId();
    if (!c || !uid) return false;
    return c.provider_id === uid || c.counterparty_id === uid;
  });

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user?.id) this.myId.set(user.id);

    const contractId = this.route.snapshot.paramMap.get('contractId');
    if (!contractId) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.api.getContract(contractId).subscribe({
      next: (c) => {
        this.contract.set(c);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });

    this.loadMessages();
    this.loadDocuments();
    this.loadHistory();
  }

  ngOnDestroy() {}

  ngAfterViewChecked() {
    if (this.shouldScrollBottom) {
      this.scrollBottom();
      this.shouldScrollBottom = false;
    }
  }

  goBack() { this.router.navigate(['/dashboard']); }

  // ── Messages ──────────────────────────────────────────

  loadMessages() {
    const contractId = this.contract()?.id;
    if (!contractId) return;
    this.msgsLoading.set(true);
    this.api.getMessages(contractId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.msgsLoading.set(false);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      },
      error: () => { this.msgsLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  sendMessage() {
    const contractId = this.contract()?.id;
    const body = this.draft.trim();
    if (!contractId || !body) return;
    this.sending.set(true);
    this.api.sendMessage(contractId, body).subscribe({
      next: (msg) => {
        this.messages.update(list => [...list, msg]);
        this.draft = '';
        this.sending.set(false);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      },
      error: () => { this.sending.set(false); this.cdr.markForCheck(); }
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  senderName(senderId: string): string {
    const c = this.contract();
    if (!c) return 'Utilisateur';
    const snap = c.terms_snapshot ?? {};
    if (senderId === c.farmer_id) return snap['farmer_name'] ?? 'Fermier';
    if (senderId === c.provider_id) return snap['provider_name'] ?? 'Prestataire';
    if (senderId === c.initiator_id) return snap['initiator_name'] ?? 'Initiateur';
    return snap['counterparty_name'] ?? 'Utilisateur';
  }

  showDateSep(m: MissionMessage): boolean {
    const day = new Date(m.created_at).toDateString();
    if (this.lastDateSep !== day) {
      this.lastDateSep = day;
      return true;
    }
    return false;
  }

  getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  hasResponded(msgId: string): boolean {
    return this.respondedIds().has(msgId);
  }

  /**
   * FIX B — contrat né d'une négociation structurée (rounds AGREED) ?
   * Même détection que le garde-fou backend (audit_log CREATED_FROM_NEGOTIATION,
   * fallback terms_snapshot.daily_rate_tnd). Si oui : pas de création de montant
   * depuis le chat (l'historique reste affiché).
   */
  isNegotiationBorn(): boolean {
    const c: any = this.contract?.();
    if (!c) return false;
    if (Array.isArray(c.audit_log) && c.audit_log.some((e: any) => e && e.action === 'CREATED_FROM_NEGOTIATION')) return true;
    if (c.terms_snapshot && c.terms_snapshot.daily_rate_tnd != null) return true;
    return false;
  }

  acceptOffer(msg: MissionMessage) {
    const contractId = this.contract()?.id;
    if (!contractId) return;
    this.actionLoading.set(true);
    this.api.acceptOffer(contractId, msg.id).subscribe({
      next: (updated) => {
        this.contract.set(updated);
        this.respondedIds.update(ids => new Set(ids).add(msg.id));
        this.actionLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.actionLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  toggleCounterOffer(msgId: string) {
    if (this.isNegotiationBorn()) return; // FIX B — prix déjà fixé par rounds
    if (this.counterTarget() === msgId) {
      this.counterTarget.set(null);
      this.counterAmount = null;
    } else {
      this.counterTarget.set(msgId);
      this.counterAmount = null;
    }
  }

  sendCounterOffer(originalMsg: MissionMessage) {
    if (this.isNegotiationBorn()) return; // FIX B — prix déjà fixé par rounds
    const contractId = this.contract()?.id;
    const amount = this.counterAmount;
    if (!contractId || !amount || amount <= 0) return;
    this.actionLoading.set(true);
    this.api.sendMessage(contractId, `Contre-offre: ${amount} TND`, 'COUNTER_OFFER', amount).subscribe({
      next: (msg) => {
        this.respondedIds.update(ids => new Set(ids).add(originalMsg.id));
        this.messages.update(list => [...list, msg]);
        this.counterTarget.set(null);
        this.counterAmount = null;
        this.actionLoading.set(false);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      },
      error: () => { this.actionLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  openQuickMessage() {
    this.activeTab.set('messages');
  }

  // ── Documents ──────────────────────────────────────────

  loadDocuments() {
    const contractId = this.contract()?.id;
    if (!contractId) return;
    this.docsLoading.set(true);
    this.api.getDocuments(contractId).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.docsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.docsLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  docTypeLabel(type: string): string {
    const map: Record<string, string> = {
      WORK_ORDER: 'Ordre de travail',
      DELIVERY_CONFIRMATION: 'Confirmation de livraison',
      RENTAL_AGREEMENT: 'Contrat de location',
      INVOICE: 'Facture',
      RECEIPT: 'Reçu',
    };
    return map[type] ?? type;
  }

  downloadDoc(doc: MissionContractDocument) {
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.download = `${docTypeSlug(doc.document_type)}-${doc.contract_id.slice(0, 8)}.pdf`;
    a.click();
  }

  // ── History ────────────────────────────────────────────

  loadHistory() {
    const contractId = this.contract()?.id;
    if (!contractId) return;
    this.historyLoading.set(true);
    this.api.getHistory(contractId).subscribe({
      next: (h) => {
        this.history.set(h);
        this.historyLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.historyLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  // ── Helpers ────────────────────────────────────────────

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT_MISSION: 'Transport',
      TRANSPORT: 'Transport',
      JOB_MISSION: 'Mission',
      JOB: 'Mission',
      EQUIPMENT_RENTAL: 'Location',
    };
    return map[t] ?? 'Contrat';
  }

  typeIcon(t: string): string {
    const map: Record<string, string> = {
      TRANSPORT_MISSION: 'lucideTruck',
      TRANSPORT: 'lucideTruck',
      JOB_MISSION: 'lucideBriefcase',
      JOB: 'lucideBriefcase',
      EQUIPMENT_RENTAL: 'lucideWrench',
    };
    return map[t] ?? 'lucideFileText';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      NEGOTIATING: 'En négociation',
      ACCEPTED: 'Accepté',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      DISPUTED: 'En litige',
      CANCELLED: 'Annulé',
      DRAFT: 'Brouillon',
      OUVERTE: 'Ouverte',
      EN_ATTENTE: 'En attente',
      NEGOCIATION: 'En négociation',
      EN_ATTENTE_SIGNATURE: 'Signature en attente',
      ACTIF: 'Actif',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[s] ?? s;
  }

  statusIcon(s: string): string {
    const map: Record<string, string> = {
      NEGOTIATING: 'lucideClock',
      ACCEPTED: 'lucideCheckCircle',
      IN_PROGRESS: 'lucideCheckCircle',
      COMPLETED: 'lucideCheckCircle',
      DISPUTED: 'lucideAlertTriangle',
      CANCELLED: 'lucideXCircle',
      DRAFT: 'lucideFileText',
      OUVERTE: 'lucideFileText',
      EN_ATTENTE: 'lucideClock',
      NEGOCIATION: 'lucideMessageSquare',
      EN_ATTENTE_SIGNATURE: 'lucidePen',
      ACTIF: 'lucideCheckCircle',
      EN_COURS: 'lucidePlayCircle',
      TERMINEE: 'lucideShield',
      ANNULEE: 'lucideXCircle',
    };
    return map[s] ?? 'lucideClock';
  }

  fmt(n: number | string): string {
    return Number(n ?? 0).toLocaleString('fr-TN', {
      minimumFractionDigits: 3, maximumFractionDigits: 3,
    });
  }

  private scrollBottom() {
    if (this.messagesArea?.nativeElement) {
      const el = this.messagesArea.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  submitWorkerReply() {
    const c = this.contract();
    if (!c || !this.workerReplyText().trim()) return;
    this.submittingReply.set(true);
    this.api.workerReplyToEvaluation(c.id, this.workerReplyText()).subscribe({
      next: () => {
        c.worker_reply = this.workerReplyText();
        this.contract.set({ ...c });
        this.submittingReply.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.submittingReply.set(false);
        this.cdr.markForCheck();
      }
    });
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

  signContract() {
    const c = this.contract();
    if (!c) return;
    this.signing.set(true);
    this.api.signContract(c.id).subscribe({
      next: () => {
        c.status = 'ACTIF';
        this.contract.set({ ...c });
        this.signing.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.signing.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  workerMarkComplete() {
    const c = this.contract();
    if (!c) return;
    this.markingComplete.set(true);
    this.api.workerMarkComplete(c.id).subscribe({
      next: () => {
        c.worker_marked_complete = true;
        this.contract.set({ ...c });
        this.markingComplete.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.markingComplete.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  farmerConfirmComplete() {
    const c = this.contract();
    if (!c) return;
    this.confirming.set(true);
    this.api.farmerConfirmComplete(c.id).subscribe({
      next: () => {
        c.status = 'TERMINEE';
        this.contract.set({ ...c });
        this.confirming.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.confirming.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  openDispute() {
    this.toast.info('Ouvrir un litige', 'Veuillez contacter le support à support@ziria.tn', 6000);
  }
}

function docTypeSlug(type: string): string {
  const map: Record<string, string> = {
    WORK_ORDER: 'ordre-travail',
    DELIVERY_CONFIRMATION: 'confirmation-livraison',
    RENTAL_AGREEMENT: 'contrat-location',
    INVOICE: 'facture',
    RECEIPT: 'recu',
  };
  return map[type] ?? type.toLowerCase();
}
