import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit,
  OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSend, lucideSearch, lucideMessageCircle, lucideX,
  lucideMapPin, lucideCheckCheck, lucideCheck, lucideUsers,
  lucidePaperclip, lucideImage, lucideFileText, lucideDownload,
  lucideShield, lucidePhone, lucideVideo, lucideStethoscope,
  lucideSprout, lucideStar, lucideSmile
} from '@ng-icons/lucide';
import { ExpertApiService } from '../../../core/services/expert-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { SkeletonLoaderComponent } from './shared/skeleton-loader.component';
import { Subscription, interval } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

interface Conversation {
  farmer_id: string;
  farmer_name: string;
  governorate?: string;
  role?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  attachment_type?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'pdf' | 'document';
  attachment_name?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exp-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RouterModule, SkeletonLoaderComponent],
  providers: [provideIcons({
    lucideSend, lucideSearch, lucideMessageCircle, lucideX,
    lucideMapPin, lucideCheckCheck, lucideCheck, lucideUsers,
    lucidePaperclip, lucideImage, lucideFileText, lucideDownload,
    lucideShield, lucidePhone, lucideVideo, lucideStethoscope,
    lucideSprout, lucideStar, lucideSmile
  })],
  template: `
    <div class="messages-layout">

      <!-- Conversation sidebar -->
      <aside class="conv-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title-row">
            <h2 class="sidebar-title">Messagerie</h2>
            <span class="total-unread" *ngIf="totalUnread() > 0">{{ totalUnread() }}</span>
          </div>

          <!-- Tab filters -->
          <div class="conv-tabs">
            <button class="conv-tab" [class.active]="activeTab() === 'all'" (click)="activeTab.set('all')">
              Tous
              <span class="tab-count">{{ conversations().length }}</span>
            </button>
            <button class="conv-tab" [class.active]="activeTab() === 'farmer'" (click)="activeTab.set('farmer')">
              <ng-icon name="lucideSprout"></ng-icon>
              Agriculteurs
            </button>
            <button class="conv-tab" [class.active]="activeTab() === 'expert'" (click)="activeTab.set('expert')">
              <ng-icon name="lucideStethoscope"></ng-icon>
              Experts
            </button>
          </div>

          <div class="conv-search">
            <ng-icon name="lucideSearch" class="s-icon"></ng-icon>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher un contact..."
                   class="s-input" (input)="onSearch()" />
          </div>
        </div>

        <div class="conv-list">
          @if (convsLoading()) {
            <div class="skeleton-convs">
              @for (i of [1,2,3,4]; track i) {
                <app-skeleton-loader width="100%" height="76px" borderRadius="12px"></app-skeleton-loader>
              }
            </div>
          } @else if (filteredConvs().length === 0) {
            <div class="empty-convs">
              <div class="empty-icon-wrap">
                <ng-icon name="lucideMessageCircle"></ng-icon>
              </div>
              <p class="empty-title">Aucune conversation</p>
              <p class="empty-sub">Vos echanges apparaissent ici</p>
            </div>
          } @else {
            @for (c of filteredConvs(); track c.farmer_id) {
              <div class="conv-item"
                   [class.active]="activeConv()?.farmer_id === c.farmer_id"
                   [class.unread]="c.unread_count > 0"
                   (click)="selectConv(c)">
                <div class="conv-avatar" [class.expert-avatar]="c.role === 'EXPERT'" [class.farmer-avatar]="c.role !== 'EXPERT'">
                  <span class="avatar-letter">{{ c.farmer_name.charAt(0).toUpperCase() }}</span>
                  <span class="online-dot"></span>
                </div>
                <div class="conv-info">
                  <div class="conv-name-row">
                    <span class="conv-name">{{ c.farmer_name }}</span>
                    <span class="conv-time">{{ formatTime(c.last_message_at) }}</span>
                  </div>
                  <div class="conv-preview-row">
                    <span class="conv-preview">
                      <ng-icon *ngIf="c.attachment_type === 'image'" name="lucideImage" class="preview-icon"></ng-icon>
                      <ng-icon *ngIf="c.attachment_type === 'pdf'" name="lucideFileText" class="preview-icon"></ng-icon>
                      {{ c.last_message || 'Demarrer la conversation' }}
                    </span>
                  </div>
                  <div class="conv-meta-row">
                    <span class="role-tag" [class.role-expert]="c.role === 'EXPERT'" [class.role-farmer]="c.role !== 'EXPERT'">
                      <ng-icon *ngIf="c.role === 'EXPERT'" name="lucideStethoscope"></ng-icon>
                      <ng-icon *ngIf="c.role !== 'EXPERT'" name="lucideSprout"></ng-icon>
                      {{ c.role === 'EXPERT' ? 'Expert' : 'Agriculteur' }}
                    </span>
                    <span class="conv-gov" *ngIf="c.governorate">
                      <ng-icon name="lucideMapPin"></ng-icon> {{ c.governorate }}
                    </span>
                    <span class="unread-badge" *ngIf="c.unread_count > 0">{{ c.unread_count }}</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </aside>

      <!-- Chat panel -->
      <main class="chat-panel" [class.empty]="!activeConv()">

        @if (!activeConv()) {
          <div class="chat-empty">
            <div class="empty-glow"></div>
            <div class="empty-icon-large">
              <ng-icon name="lucideMessageCircle"></ng-icon>
            </div>
            <h3 class="empty-heading">Bienvenue dans votre messagerie</h3>
            <p class="empty-subtext">Selectionnez une conversation pour commencer a discuter</p>
            <div class="empty-features">
              <div class="empty-feature">
                <ng-icon name="lucideSprout"></ng-icon>
                <span>Messages avec vos agriculteurs</span>
              </div>
              <div class="empty-feature">
                <ng-icon name="lucideStethoscope"></ng-icon>
                <span>Echanges entre confreres experts</span>
              </div>
              <div class="empty-feature">
                <ng-icon name="lucideShield"></ng-icon>
                <span>Consultations securisees</span>
              </div>
            </div>
          </div>
        }

        @if (activeConv(); as conv) {
          <!-- Chat header -->
          <header class="chat-header">
            <div class="chat-header-left">
              <div class="chat-avatar" [class.expert-avatar]="conv.role === 'EXPERT'" [class.farmer-avatar]="conv.role !== 'EXPERT'">
                {{ conv.farmer_name.charAt(0) }}
              </div>
              <div class="chat-user-info">
                <strong class="chat-name">{{ conv.farmer_name }}</strong>
                <div class="chat-status-row">
                  <span class="role-tag-sm" [class.role-expert]="conv.role === 'EXPERT'" [class.role-farmer]="conv.role !== 'EXPERT'">
                    {{ conv.role === 'EXPERT' ? 'Expert' : 'Agriculteur' }}
                  </span>
                  <span class="chat-gov" *ngIf="conv.governorate">
                    <ng-icon name="lucideMapPin"></ng-icon> {{ conv.governorate }}
                  </span>
                </div>
              </div>
            </div>
            <div class="chat-header-actions">
              <button class="header-action-btn" title="Appel vocal">
                <ng-icon name="lucidePhone"></ng-icon>
              </button>
              <button class="header-action-btn" title="Appel video">
                <ng-icon name="lucideVideo"></ng-icon>
              </button>
            </div>
          </header>

          <!-- Messages area -->
          <div class="messages-area" #messagesArea>
            @if (msgsLoading()) {
              <div class="skeleton-msgs">
                <div class="skel-msg right"></div>
                <div class="skel-msg left"></div>
                <div class="skel-msg right small"></div>
              </div>
            }

            @if (!msgsLoading()) {
              <div class="msgs-inner">
                @if (messages().length === 0) {
                  <div class="no-msgs">
                    <div class="no-msgs-icon">
                      <ng-icon name="lucideSmile"></ng-icon>
                    </div>
                    <p>Demarrez la conversation</p>
                    <small>Envoyez votre premier message</small>
                  </div>
                }

                @for (m of messages(); track m.id; let i = $index) {
                  @if (showDateSep(m)) {
                    <div class="date-sep">
                      <span class="date-sep-label">{{ getDateLabel(m.created_at) }}</span>
                    </div>
                  }

                  <div class="bubble-wrap" [class.mine]="m.sender_id === myId()">
                    <div class="bubble" [class.mine]="m.sender_id === myId()"
                         [class.theirs]="m.sender_id !== myId()">
                      <span class="bubble-body">{{ m.body }}</span>

                      @if (m.attachment_url) {
                        <div class="bubble-attachment">
                          @if (m.attachment_type === 'image') {
                            <img [src]="m.attachment_url" class="attachment-image" alt="Image" (click)="openLightbox(m.attachment_url)" />
                          } @else {
                            <a [href]="m.attachment_url" target="_blank" class="attachment-file">
                              <ng-icon name="lucideFileText"></ng-icon>
                              <span>{{ m.attachment_name || 'Document' }}</span>
                              <ng-icon name="lucideDownload"></ng-icon>
                            </a>
                          }
                        </div>
                      }

                      <span class="bubble-meta">
                        {{ m.created_at | date:'HH:mm' }}
                        @if (m.sender_id === myId()) {
                          @if (m.read_at) {
                            <ng-icon name="lucideCheckCheck" class="read-icon"></ng-icon>
                          } @else {
                            <ng-icon name="lucideCheck" class="sent-icon"></ng-icon>
                          }
                        }
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Input area -->
          <footer class="chat-footer">
            <div class="footer-glow"></div>
            <button class="attach-btn" (click)="triggerFileInput()" title="Joindre un fichier">
              <ng-icon name="lucidePaperclip"></ng-icon>
            </button>
            <input type="file" #fileInput class="file-input" (change)="onFileSelected($event)" accept="image/*,.pdf,.doc,.docx" />
            <div class="input-wrap">
              <textarea
                class="msg-input"
                [(ngModel)]="draft"
                placeholder="Ecrire un message..."
                rows="1"
                (keydown.enter)="onEnter($event)"
                (input)="autoResize($event)"></textarea>
            </div>
            <button class="send-btn" (click)="sendMessage()" [disabled]="!draft.trim() || sending()"
                    [class.has-text]="draft.trim()">
              <ng-icon name="lucideSend"></ng-icon>
            </button>
          </footer>
        }

      </main>
    </div>

    <!-- Lightbox -->
    @if (lightboxUrl()) {
      <div class="lightbox-backdrop" (click)="closeLightbox()">
        <button class="lightbox-close">
          <ng-icon name="lucideX"></ng-icon>
        </button>
        <img [src]="lightboxUrl()" class="lightbox-image" alt="Image en plein ecran" />
      </div>
    }
  `,
  styles: [`
    .messages-layout {
      display: flex;
      height: calc(100vh - 120px);
      overflow: hidden;
      border-radius: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
    }

    /* ── Sidebar ─────────────────────────────────────── */
    .conv-sidebar {
      width: 340px;
      min-width: 300px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--bg-card);
    }

    .sidebar-header {
      padding: 20px 16px 12px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .sidebar-title {
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    .total-unread {
      background: var(--danger);
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }

    /* Tabs */
    .conv-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      background: var(--bg-primary);
      border-radius: 10px;
      padding: 3px;
    }

    .conv-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 8px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      white-space: nowrap;
    }

    .conv-tab ng-icon { width: 13px; height: 13px; }

    .conv-tab:hover { color: var(--text-primary); background: var(--bg-card); }

    .conv-tab.active {
      background: var(--bg-card);
      color: var(--zir-emerald);
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      font-weight: 700;
    }

    .tab-count {
      font-size: 0.65rem;
      background: var(--border);
      padding: 1px 5px;
      border-radius: 6px;
      color: var(--text-muted);
    }

    .conv-tab.active .tab-count {
      background: var(--zir-emerald-alpha-10);
      color: var(--zir-emerald);
    }

    /* Search */
    .conv-search {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 12px;
      transition: border-color 0.2s;
    }

    .conv-search:focus-within {
      border-color: var(--zir-emerald);
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .s-icon { color: var(--text-muted); font-size: 0.9rem; flex-shrink: 0; }

    .s-input {
      background: none;
      border: none;
      outline: none;
      font-size: 0.88rem;
      color: var(--text-primary);
      flex: 1;
      font-family: inherit;
    }

    .s-input::placeholder { color: var(--text-muted); }

    /* Conversation list */
    .conv-list {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .conv-list::-webkit-scrollbar { width: 4px; }
    .conv-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .conv-item {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      transition: all 0.15s;
      position: relative;
    }

    .conv-item:hover {
      background: var(--bg-primary);
    }

    .conv-item.active {
      background: var(--zir-emerald-alpha-10);
      border-left: 3px solid var(--zir-emerald);
      padding-left: 13px;
    }

    .conv-item.unread {
      background: var(--zir-gold-dim);
    }

    .conv-item.unread.active {
      background: var(--zir-emerald-alpha-10);
    }

    /* Avatars */
    .conv-avatar {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      font-weight: 800;
      font-size: 1.05rem;
    }

    .conv-avatar.farmer-avatar {
      background: linear-gradient(135deg, #d4f5e2, #a7e8c3);
      color: #166534;
      border: 1.5px solid #86d4a8;
    }

    .conv-avatar.expert-avatar {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      border: 1.5px solid #fcd34d;
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
    }

    .avatar-letter { text-transform: uppercase; }

    .online-dot {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #22c55e;
      border: 2.5px solid var(--bg-card);
    }

    .conv-item.active .online-dot { border-color: var(--zir-emerald-alpha-10); }

    /* Info */
    .conv-info { flex: 1; min-width: 0; }

    .conv-name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
    }

    .conv-name {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conv-item.unread .conv-name { font-weight: 800; }

    .conv-time {
      color: var(--text-muted);
      font-size: 0.7rem;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .conv-item.unread .conv-time { color: var(--zir-emerald); font-weight: 700; }

    .conv-preview-row {
      display: flex;
      align-items: center;
    }

    .conv-preview {
      color: var(--text-muted);
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .conv-item.unread .conv-preview { color: var(--text-primary); font-weight: 500; }

    .preview-icon { font-size: 0.72rem; opacity: 0.6; }

    .conv-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }

    .role-tag {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .role-tag ng-icon { width: 10px; height: 10px; }

    .role-tag.role-farmer {
      background: #dcfce7;
      color: #166534;
    }

    .role-tag.role-expert {
      background: #fef3c7;
      color: #92400e;
    }

    .conv-gov {
      display: flex;
      align-items: center;
      gap: 3px;
      color: var(--text-muted);
      font-size: 0.7rem;
    }

    .conv-gov ng-icon { width: 10px; height: 10px; }

    .unread-badge {
      background: var(--zir-emerald);
      color: white;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 10px;
      margin-left: auto;
      flex-shrink: 0;
      animation: pulseBadge 2s infinite;
    }

    @keyframes pulseBadge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    .skeleton-convs { padding: 8px; display: flex; flex-direction: column; gap: 8px; }

    .empty-convs {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 48px 20px;
      text-align: center;
    }

    .empty-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--zir-emerald-alpha-10);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .empty-icon-wrap ng-icon { width: 26px; height: 26px; color: var(--zir-emerald); }

    .empty-title { font-weight: 700; color: var(--text-primary); font-size: 0.95rem; margin: 0; }
    .empty-sub { color: var(--text-muted); font-size: 0.82rem; margin: 0; }

    /* ── Chat Panel ──────────────────────────────────── */
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--bg-primary);
      position: relative;
    }

    .chat-panel.empty { align-items: center; justify-content: center; }

    .chat-empty {
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .empty-glow {
      position: absolute;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: var(--zir-gold);
      filter: blur(100px);
      opacity: 0.06;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
      pointer-events: none;
    }

    .empty-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, var(--zir-emerald-alpha-10), var(--zir-gold-dim));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      border: 1px solid var(--border);
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.08);
    }

    .empty-icon-large ng-icon { width: 36px; height: 36px; color: var(--zir-emerald); }

    .empty-heading {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 6px;
    }

    .empty-subtext {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin: 0 0 28px;
    }

    .empty-features {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }

    .empty-feature {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      font-size: 0.82rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .empty-feature ng-icon { width: 16px; height: 16px; color: var(--zir-emerald); }

    /* Chat header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      z-index: 2;
    }

    .chat-header-left { display: flex; align-items: center; gap: 12px; }

    .chat-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .chat-avatar.farmer-avatar {
      background: linear-gradient(135deg, #d4f5e2, #a7e8c3);
      color: #166534;
      border: 1.5px solid #86d4a8;
    }

    .chat-avatar.expert-avatar {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #92400e;
      border: 1.5px solid #fcd34d;
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
    }

    .chat-user-info { min-width: 0; }

    .chat-name {
      font-weight: 700;
      color: var(--text-primary);
      font-size: 0.95rem;
      display: block;
    }

    .chat-status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .role-tag-sm {
      display: inline-flex;
      align-items: center;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .role-tag-sm.role-farmer { background: #dcfce7; color: #166534; }
    .role-tag-sm.role-expert { background: #fef3c7; color: #92400e; }

    .chat-gov {
      display: flex;
      align-items: center;
      gap: 3px;
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .chat-gov ng-icon { width: 12px; height: 12px; }

    .chat-header-actions { display: flex; gap: 6px; }

    .header-action-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .header-action-btn ng-icon { width: 16px; height: 16px; }

    .header-action-btn:hover {
      background: var(--zir-emerald-alpha-10);
      color: var(--zir-emerald);
      border-color: var(--zir-emerald-alpha-20);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
    }

    /* Messages area */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.02) 0%, transparent 50%),
        var(--bg-primary);
    }

    .msgs-inner {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .no-msgs {
      text-align: center;
      padding: 48px;
      color: var(--text-muted);
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .no-msgs-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--zir-emerald-alpha-10);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .no-msgs-icon ng-icon { width: 24px; height: 24px; color: var(--zir-emerald); }

    .no-msgs p { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin: 0; }
    .no-msgs small { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

    /* Date separator */
    .date-sep {
      text-align: center;
      margin: 16px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .date-sep::before, .date-sep::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border), transparent);
    }

    .date-sep-label {
      color: var(--text-muted);
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--bg-card);
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      white-space: nowrap;
    }

    /* Bubbles */
    .bubble-wrap {
      display: flex;
      margin: 4px 0;
      animation: bubbleIn 0.2s ease;
    }

    @keyframes bubbleIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bubble-wrap.mine { justify-content: flex-end; }

    .bubble {
      max-width: 65%;
      padding: 10px 14px;
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      word-break: break-word;
    }

    .bubble.mine {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      border-bottom-right-radius: 6px;
      box-shadow: 0 2px 12px rgba(16, 185, 129, 0.2), 0 1px 3px rgba(16, 185, 129, 0.1);
    }

    .bubble.theirs {
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border);
      border-bottom-left-radius: 6px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    .bubble-body {
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .bubble-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      opacity: 0.65;
      align-self: flex-end;
    }

    .bubble.mine .bubble-meta { color: rgba(255,255,255,0.8); }

    .read-icon, .sent-icon { font-size: 0.78rem; }

    /* Attachments */
    .bubble-attachment { margin-top: 6px; }

    .attachment-image {
      max-width: 240px;
      max-height: 180px;
      border-radius: 10px;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .attachment-image:hover { transform: scale(1.02); }

    .attachment-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .attachment-file:hover { background: var(--bg-card-hover); }
    .attachment-file ng-icon:first-child { color: var(--danger); }

    /* Skeleton messages */
    .skeleton-msgs { display: flex; flex-direction: column; gap: 10px; flex: 1; }

    .skel-msg {
      height: 48px;
      border-radius: 16px;
      animation: pulse 1.5s ease-in-out infinite;
      max-width: 55%;
    }

    .skel-msg.right { align-self: flex-end; background: var(--zir-emerald-alpha-10); }
    .skel-msg.left { align-self: flex-start; background: var(--bg-card); border: 1px solid var(--border); }
    .skel-msg.small { max-width: 35%; height: 36px; }

    /* Chat footer */
    .chat-footer {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-card);
      position: relative;
    }

    .footer-glow {
      position: absolute;
      top: -40px;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, var(--bg-card), transparent);
      pointer-events: none;
    }

    .attach-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .attach-btn ng-icon { width: 18px; height: 18px; }

    .attach-btn:hover {
      background: var(--zir-gold-dim);
      color: var(--zir-gold);
      border-color: var(--zir-gold);
      box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
    }

    .file-input { display: none; }

    .input-wrap { flex: 1; }

    .msg-input {
      width: 100%;
      background: var(--bg-primary);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      color: var(--text-primary);
      font-size: 0.92rem;
      padding: 11px 16px;
      resize: none;
      outline: none;
      max-height: 120px;
      overflow-y: auto;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
      line-height: 1.4;
    }

    .msg-input::placeholder { color: var(--text-muted); }

    .msg-input:focus {
      border-color: var(--zir-emerald);
      box-shadow: 0 0 0 3px var(--zir-emerald-alpha-10);
    }

    .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--border);
      color: var(--text-muted);
      border: none;
      cursor: not-allowed;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s;
    }

    .send-btn ng-icon { width: 18px; height: 18px; }

    .send-btn.has-text {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(16, 185, 129, 0.3);
    }

    .send-btn.has-text:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    }

    .send-btn:disabled { opacity: 0.5; }

    /* Lightbox */
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      transition: background 0.2s;
    }

    .lightbox-close:hover { background: rgba(255,255,255,0.2); }

    .lightbox-image { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }

    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* ── Responsive ──────────────────────────────────── */
    @media (max-width: 768px) {
      .messages-layout { border-radius: 0; border: none; height: calc(100vh - 60px); }
      .conv-sidebar { width: 100%; min-width: 0; }
      .chat-panel.empty { display: none; }
      .empty-features { display: none; }
    }
  `]
})
export class ExpMessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly api = inject(ExpertApiService);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('messagesArea') private messagesArea!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<Message[]>([]);
  readonly activeConv = signal<Conversation | null>(null);
  readonly convsLoading = signal(true);
  readonly msgsLoading = signal(false);
  readonly sending = signal(false);
  readonly myId = signal<string>('');
  readonly lightboxUrl = signal<string | null>(null);
  readonly activeTab = signal<'all' | 'farmer' | 'expert'>('all');

  searchQuery = '';
  draft = '';
  private shouldScrollBottom = false;
  private pollSub?: Subscription;
  private lastMsgSeen: Record<string, number> = {};
  private socket: Socket | null = null;

  readonly filteredConvs = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery.toLowerCase();
    let list = this.conversations();

    if (tab === 'farmer') {
      list = list.filter(c => c.role !== 'EXPERT');
    } else if (tab === 'expert') {
      list = list.filter(c => c.role === 'EXPERT');
    }

    if (q) {
      list = list.filter(c =>
        c.farmer_name?.toLowerCase().includes(q) ||
        c.governorate?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  readonly totalUnread = computed(() => {
    return this.conversations().reduce((sum, c) => sum + (c.unread_count || 0), 0);
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.id) this.myId.set(user.id);
    this.loadConversations();
    this.connectSocket();

    // Deep-link support (?farmerId=...)
    const farmerId = this.route.snapshot.queryParamMap.get('farmerId');
    const farmerName = this.route.snapshot.queryParamMap.get('farmerName');
    if (farmerId) {
      setTimeout(() => {
        const existing = this.conversations().find(c => c.farmer_id === farmerId);
        if (existing) { this.selectConv(existing); }
        else {
          const synth: Conversation = {
            farmer_id: farmerId,
            farmer_name: farmerName || 'Contact',
            last_message: '',
            last_message_at: new Date().toISOString(),
            unread_count: 0
          };
          this.selectConv(synth);
        }
      }, 800);
    }

    // Light polling only for conversation list when no active chat (30s + hidden-tab guard)
    this.pollSub = interval(30000).subscribe(() => {
      if (document.hidden) return;
      if (!this.activeConv()) this.loadConversations();
    });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.disconnectSocket();
  }

  connectSocket() {
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
      const user = this.authService.currentUser();
      if (user?.id) {
        this.socket?.emit('join_expert', user.id);
      }
    });

    // Real-time incoming message
    this.socket.on('new_message', (msg: any) => {
      const myId = this.myId();
      if (!myId) return;

      // Skip messages sent by myself — already appended optimistically in sendMessage()
      if (msg.sender_id === myId) return;

      const partnerId = msg.sender_id;

      // If the active conversation is with this partner, append the message
      const active = this.activeConv();
      if (active && active.farmer_id === partnerId) {
        this.messages.update(list => [...list, msg]);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      } else {
        // Update conversation list: increment unread, update last message
        this.conversations.update(list =>
          list.map(c => c.farmer_id === partnerId
            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: msg.body, last_message_at: msg.created_at }
            : c
          )
        );
        this.cdr.markForCheck();
      }
    });

    // Stats update (unread count sync)
    this.socket.on('stats_update', (data: any) => {
      if (data?.unread_messages_count !== undefined) {
        // Could emit to a shared signal for sidebar badge
      }
    });
  }

  disconnectSocket() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(partnerId: string) {
    this.socket?.emit('join_conversation', { other_user_id: partnerId });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollBottom) {
      this.scrollBottom();
      this.shouldScrollBottom = false;
    }
  }

  loadConversations() {
    this.api.getMessageConversations().subscribe({
      next: (data) => { this.conversations.set(data); this.convsLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.convsLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  selectConv(conv: Conversation) {
    this.activeConv.set(conv);
    this.draft = '';
    this.msgsLoading.set(true);
    this.messages.set([]);
    this.loadMessages(conv.farmer_id, true);
    this.joinConversation(conv.farmer_id);
    // Mark as read locally
    this.conversations.update(list =>
      list.map(c => c.farmer_id === conv.farmer_id ? { ...c, unread_count: 0 } : c)
    );
  }

  loadMessages(farmerId: string, scroll: boolean) {
    this.api.getMessages(farmerId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.msgsLoading.set(false);
        this.cdr.markForCheck();
        if (scroll) { this.shouldScrollBottom = true; }
        else {
          // Only scroll if new messages arrived
          const prev = this.lastMsgSeen[farmerId] ?? 0;
          if (msgs.length > prev) { this.shouldScrollBottom = true; }
          this.lastMsgSeen[farmerId] = msgs.length;
        }
      },
      error: () => { this.msgsLoading.set(false); this.cdr.markForCheck(); }
    });
  }

  sendMessage() {
    const conv = this.activeConv();
    const body = this.draft.trim();
    if (!conv || !body) return;
    this.sending.set(true);

    this.api.sendMessage(conv.farmer_id, body).subscribe({
      next: (msg) => {
        this.messages.update(list => [...list, msg]);
        this.draft = '';
        this.sending.set(false);
        this.shouldScrollBottom = true;
        this.conversations.update(list =>
          list.map(c => c.farmer_id === conv.farmer_id
            ? { ...c, last_message: body, last_message_at: new Date().toISOString() }
            : c
          )
        );
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

  onSearch() { /* computed re-runs */ }

  triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // For now, create a local preview URL
    // In production, you'd upload to a server first
    const url = URL.createObjectURL(file);
    const conv = this.activeConv();
    if (!conv) return;

    // Add attachment message
    const attachmentType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document';
    this.api.sendMessage(conv.farmer_id, `[Fichier joint: ${file.name}]`).subscribe({
      next: (msg) => {
        const msgWithAttachment: Message = {
          ...msg,
          attachment_url: url,
          attachment_type: attachmentType as any,
          attachment_name: file.name
        };
        this.messages.update(list => [...list, msgWithAttachment]);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    input.value = '';
  }

  openLightbox(url: string) {
    this.lightboxUrl.set(url);
  }

  closeLightbox() {
    this.lightboxUrl.set(null);
  }

  scrollBottom() {
    if (this.messagesArea?.nativeElement) {
      const el = this.messagesArea.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  private lastDateSep: Record<string, string> = {};
  showDateSep(m: Message): boolean {
    const day = new Date(m.created_at).toDateString();
    const conv = this.activeConv()?.farmer_id || '';
    if (this.lastDateSep[conv] !== day) {
      this.lastDateSep[conv] = day;
      return true;
    }
    return false;
  }

  getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' });
  }
}
