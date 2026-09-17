import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit,
  OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSend, lucideSearch, lucideMessageCircle, lucideX,
  lucideMapPin, lucideCheckCheck, lucideCheck, lucideUsers,
  lucideStethoscope, lucideSprout
} from '@ng-icons/lucide';
import { FarmerApiService, Conversation, Message } from '../../../core/services/farmer-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/state/auth.store';
import { Subscription, interval } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideSend, lucideSearch, lucideMessageCircle, lucideX,
    lucideMapPin, lucideCheckCheck, lucideCheck, lucideUsers,
    lucideStethoscope, lucideSprout
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

          <div class="conv-search">
            <ng-icon name="lucideSearch" class="s-icon"></ng-icon>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher un expert..."
                   class="s-input" (input)="onSearch()" />
          </div>
        </div>

        <div class="conv-list">
          @if (convsLoading()) {
            <div class="loading-convs">
              @for (i of [1,2,3,4]; track i) {
                <div class="skel-conv"></div>
              }
            </div>
          } @else if (filteredConvs().length === 0) {
            <div class="empty-convs">
              <ng-icon name="lucideMessageCircle" class="empty-icon"></ng-icon>
              <p class="empty-title">Aucune conversation</p>
              <p class="empty-sub">Vos échanges avec les experts apparaissent ici</p>
            </div>
          } @else {
            @for (c of filteredConvs(); track c.farmer_id) {
              <div class="conv-item"
                   [class.active]="activeConv()?.farmer_id === c.farmer_id"
                   [class.unread]="c.unread_count > 0"
                   (click)="selectConv(c)">
                <div class="conv-avatar">
                  <span class="avatar-letter">{{ c.farmer_name.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="conv-info">
                  <div class="conv-name-row">
                    <span class="conv-name">{{ c.farmer_name }}</span>
                    <span class="conv-time">{{ formatTime(c.last_message_at) }}</span>
                  </div>
                  <div class="conv-preview-row">
                    <span class="conv-preview">{{ c.last_message || 'Démarrer la conversation' }}</span>
                  </div>
                  <div class="conv-meta-row">
                    <span class="role-tag">
                      <ng-icon name="lucideStethoscope"></ng-icon>
                      Expert
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
            <div class="empty-icon-large">
              <ng-icon name="lucideMessageCircle"></ng-icon>
            </div>
            <h3 class="empty-heading">Votre messagerie</h3>
            <p class="empty-subtext">Sélectionnez une conversation pour discuter avec un expert</p>
          </div>
        }

        @if (activeConv(); as conv) {
          <header class="chat-header">
            <div class="chat-header-left">
              <div class="chat-avatar">
                {{ conv.farmer_name.charAt(0) }}
              </div>
              <div class="chat-user-info">
                <strong class="chat-name">{{ conv.farmer_name }}</strong>
                <div class="chat-status-row">
                  <span class="role-tag-sm">
                    Expert
                  </span>
                  <span class="chat-gov" *ngIf="conv.governorate">
                    <ng-icon name="lucideMapPin"></ng-icon> {{ conv.governorate }}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div class="messages-area" #messagesArea>
            @if (msgsLoading()) {
              <div class="skel-msgs">
                <div class="skel-msg theirs"></div>
                <div class="skel-msg mine"></div>
                <div class="skel-msg theirs short"></div>
              </div>
            }

            @if (!msgsLoading()) {
              <div class="msgs-inner">
                @if (messages().length === 0) {
                  <div class="no-msgs">
                    <p>Démarrez la conversation</p>
                    <small>Envoyez votre premier message à {{ conv.farmer_name }}</small>
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

          <footer class="chat-footer">
            <div class="input-wrap">
              <textarea
                class="msg-input"
                [(ngModel)]="draft"
                placeholder="Écrire un message..."
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
  `,
  styles: [`
    :host { display: contents; }
    .messages-layout {
      display: flex; height: calc(100vh - 64px);
      background: var(--bg-primary); border-radius: 0; overflow: hidden;
    }

    /* ── Sidebar ────────────────────────── */
    .conv-sidebar {
      width: 340px; min-width: 340px;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      background: var(--bg-card);
    }
    .sidebar-header {
      padding: 20px 16px 12px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-title-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .sidebar-title { font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--text-primary); }
    .total-unread {
      background: var(--zir-emerald); color: white; font-size: 0.7rem;
      font-weight: 800; padding: 2px 7px; border-radius: 20px;
    }
    .conv-search {
      position: relative; display: flex; align-items: center;
    }
    .s-icon {
      position: absolute; left: 12px; width: 16px; height: 16px;
      color: var(--text-muted); pointer-events: none;
    }
    .s-input {
      width: 100%; padding: 9px 12px 9px 36px;
      border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--bg-primary); color: var(--text-primary);
      font-size: 0.85rem; outline: none; font-family: inherit;
    }
    .s-input:focus { border-color: var(--zir-emerald); }

    .conv-list { flex: 1; overflow-y: auto; padding: 8px; }

    .loading-convs { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
    .skel-conv { height: 72px; border-radius: 12px; background: var(--border); animation: pulse 1.5s infinite; }

    .empty-convs {
      text-align: center; padding: 40px 16px; color: var(--text-muted);
    }
    .empty-icon { width: 40px; height: 40px; margin-bottom: 8px; }
    .empty-title { font-weight: 700; font-size: 0.95rem; margin: 0; color: var(--text-primary); }
    .empty-sub { font-size: 0.8rem; margin: 4px 0 0; }

    .conv-item {
      display: flex; gap: 10px; padding: 10px 12px;
      border-radius: 12px; cursor: pointer; transition: all 0.15s;
    }
    .conv-item:hover { background: var(--bg-primary); }
    .conv-item.active { background: var(--zir-emerald-alpha-10); }
    .conv-item.unread .conv-name { font-weight: 800; }

    .conv-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--zir-emerald); color: white; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-letter { font-weight: 800; font-size: 1rem; }

    .conv-info { flex: 1; min-width: 0; }
    .conv-name-row {
      display: flex; align-items: center; gap: 6px;
    }
    .conv-name { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .conv-time { margin-left: auto; font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
    .conv-preview { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .conv-meta-row {
      display: flex; align-items: center; gap: 6px; margin-top: 4px;
    }
    .role-tag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 0.68rem; font-weight: 600; padding: 2px 7px;
      border-radius: 5px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
    }
    .role-tag ng-icon { width: 12px; height: 12px; }
    .conv-gov { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 2px; }
    .conv-gov ng-icon { width: 12px; height: 12px; }
    .unread-badge {
      margin-left: auto; background: var(--zir-emerald); color: white;
      font-size: 0.65rem; font-weight: 800; min-width: 18px; height: 18px;
      border-radius: 20px; display: flex; align-items: center; justify-content: center; padding: 0 5px;
    }

    /* ── Chat panel ─────────────────────── */
    .chat-panel {
      flex: 1; display: flex; flex-direction: column; min-width: 0;
    }
    .chat-panel.empty {
      display: flex; align-items: center; justify-content: center;
    }

    .chat-empty { text-align: center; padding: 40px; color: var(--text-muted); }
    .empty-icon-large ng-icon { width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px; }
    .empty-heading { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .empty-subtext { font-size: 0.85rem; margin: 0; }

    .chat-header {
      display: flex; align-items: center; padding: 14px 20px;
      border-bottom: 1px solid var(--border); background: var(--bg-card);
    }
    .chat-header-left { display: flex; align-items: center; gap: 12px; }
    .chat-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--zir-emerald); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.1rem;
    }
    .chat-user-info { line-height: 1.3; }
    .chat-name { font-size: 0.95rem; color: var(--text-primary); }
    .chat-status-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .role-tag-sm {
      font-size: 0.7rem; font-weight: 600; padding: 1px 7px;
      border-radius: 5px; background: var(--zir-emerald-alpha-10); color: var(--zir-emerald);
    }
    .chat-gov { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 2px; }
    .chat-gov ng-icon { width: 14px; height: 14px; }

    .messages-area {
      flex: 1; overflow-y: auto; padding: 16px 20px;
    }
    .msgs-inner { display: flex; flex-direction: column; }

    .skel-msgs { display: flex; flex-direction: column; gap: 10px; }
    .skel-msg {
      height: 44px; border-radius: 14px; animation: pulse 1.5s infinite; max-width: 55%;
    }
    .skel-msg.mine { align-self: flex-end; background: var(--zir-emerald-alpha-10); }
    .skel-msg.theirs { align-self: flex-start; background: var(--bg-card); border: 1px solid var(--border); }
    .skel-msg.short { max-width: 35%; height: 32px; }

    .no-msgs { text-align: center; padding: 40px; color: var(--text-muted); }
    .no-msgs p { font-weight: 600; margin: 0; }
    .no-msgs small { font-size: 0.8rem; }

    .date-sep { text-align: center; margin: 12px 0; }
    .date-sep-label {
      font-size: 0.72rem; color: var(--text-muted); background: var(--bg-primary);
      padding: 2px 12px; border-radius: 10px;
    }

    .bubble-wrap { display: flex; margin-bottom: 4px; }
    .bubble-wrap.mine { justify-content: flex-end; }

    .bubble {
      max-width: 75%; padding: 10px 14px; border-radius: 16px;
      font-size: 0.88rem; line-height: 1.4; position: relative;
    }
    .bubble.mine {
      background: var(--zir-emerald); color: white;
      border-bottom-right-radius: 4px;
    }
    .bubble.theirs {
      background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary);
      border-bottom-left-radius: 4px;
    }
    .bubble-body { display: block; }
    .bubble-meta {
      display: flex; align-items: center; gap: 3px;
      font-size: 0.68rem; margin-top: 4px; opacity: 0.7;
      justify-content: flex-end;
    }
    .bubble.mine .bubble-meta { color: rgba(255,255,255,0.8); }
    .bubble.theirs .bubble-meta { color: var(--text-muted); }
    .read-icon, .sent-icon { width: 14px; height: 14px; }

    .chat-footer {
      display: flex; align-items: flex-end; gap: 10px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: var(--bg-card);
    }
    .input-wrap { flex: 1; }
    .msg-input {
      width: 100%; background: var(--bg-primary);
      border: 1.5px solid var(--border); border-radius: 14px;
      color: var(--text-primary); font-size: 0.92rem;
      padding: 11px 16px; resize: none; max-height: 120px;
      overflow-y: auto; outline: none; font-family: inherit;
      transition: border-color 0.2s;
      line-height: 1.4;
    }
    .msg-input::placeholder { color: var(--text-muted); }
    .msg-input:focus { border-color: var(--zir-emerald); }

    .send-btn {
      width: 44px; height: 44px; border-radius: 14px;
      background: var(--border); color: var(--text-muted);
      border: none; cursor: not-allowed; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: all 0.25s;
    }
    .send-btn ng-icon { width: 18px; height: 18px; }
    .send-btn.has-text {
      background: var(--zir-emerald); color: white;
      cursor: pointer;
    }
    .send-btn.has-text:hover { opacity: 0.9; }
    .send-btn:disabled { opacity: 0.5; }

    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    @media (max-width: 768px) {
      .messages-layout { height: calc(100vh - 56px); }
      .conv-sidebar { width: 100%; min-width: 0; }
      .chat-panel.empty { display: none; }
    }
  `]
})
export class FarmerMessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly api = inject(FarmerApiService);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('messagesArea') private messagesArea!: ElementRef<HTMLDivElement>;

  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<Message[]>([]);
  readonly activeConv = signal<Conversation | null>(null);
  readonly convsLoading = signal(true);
  readonly msgsLoading = signal(false);
  readonly sending = signal(false);
  readonly myId = signal<string>('');
  readonly totalUnread = computed(() =>
    this.conversations().reduce((sum, c) => sum + (c.unread_count || 0), 0)
  );

  searchQuery = '';
  draft = '';
  private shouldScrollBottom = false;
  private pollSub?: Subscription;
  private socket: Socket | null = null;

  readonly filteredConvs = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.conversations();
    return this.conversations().filter(c =>
      c.farmer_name?.toLowerCase().includes(q) ||
      c.governorate?.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.id) this.myId.set(user.id);
    this.loadConversations();
    this.connectSocket();

    // Deep-link support (?expertId=...)
    const expertId = this.route.snapshot.queryParamMap.get('expertId');
    const expertName = this.route.snapshot.queryParamMap.get('expertName');
    if (expertId) {
      setTimeout(() => {
        const existing = this.conversations().find(c => c.farmer_id === expertId);
        if (existing) { this.selectConv(existing); }
        else {
          const synth: Conversation = {
            farmer_id: expertId,
            farmer_name: expertName || 'Contact',
            last_message: '',
            last_message_at: new Date().toISOString(),
            unread_count: 0
          };
          this.selectConv(synth);
        }
      }, 800);
    }

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
      if (user?.id) this.socket?.emit('join_expert', user.id);
    });
    this.socket.on('new_message', (msg: any) => {
      const myId = this.myId();
      if (!myId || msg.sender_id === myId) return;
      const partnerId = msg.sender_id;
      const active = this.activeConv();
      if (active && active.farmer_id === partnerId) {
        this.messages.update(list => [...list, msg]);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      } else {
        this.conversations.update(list =>
          list.map(c => c.farmer_id === partnerId
            ? { ...c, unread_count: (c.unread_count || 0) + 1, last_message: msg.body, last_message_at: msg.created_at }
            : c
          )
        );
        this.cdr.markForCheck();
      }
    });
  }

  disconnectSocket() {
    this.socket?.disconnect();
    this.socket = null;
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
    this.api.getMessages(conv.farmer_id).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.msgsLoading.set(false);
        this.shouldScrollBottom = true;
        this.cdr.markForCheck();
      },
      error: () => { this.msgsLoading.set(false); this.cdr.markForCheck(); }
    });
    this.joinConversation(conv.farmer_id);
    this.conversations.update(list =>
      list.map(c => c.farmer_id === conv.farmer_id ? { ...c, unread_count: 0 } : c)
    );
  }

  joinConversation(partnerId: string) {
    this.socket?.emit('join_conversation', { other_user_id: partnerId });
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

  onSearch() {}

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

  private scrollBottom() {
    if (this.messagesArea?.nativeElement) {
      const el = this.messagesArea.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
