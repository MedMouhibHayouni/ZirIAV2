import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit,
  OnDestroy, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSend, lucideSearch, lucideMessageCircle, lucideX,
  lucideCheckCheck, lucideCheck, lucideUsers, lucideBuilding2,
  lucideRefreshCw, lucideFileText, lucideMegaphone, lucideUserPlus,
  lucideChevronLeft, lucideReply, lucidePaperclip, lucideMoreHorizontal,
  lucidePin, lucideArchive, lucideStar, lucideSmile, lucideImage
} from '@ng-icons/lucide';
import { AuthStore } from '../../../core/state/auth.store';
import { environment } from '../../../../environments/environment';
import { Subscription, interval } from 'rxjs';

interface Conversation {
  type: 'INTERNAL' | 'DOSSIER' | 'ANNOUNCEMENT';
  participantId?: string;
  participantName?: string;
  participantRole?: string;
  dossierId?: string;
  dossierRef?: string;
  senderId?: string;
  senderName?: string;
  lastMessage: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface ThreadMessage {
  id: string;
  senderId: string;
  sender: { id: string; name: string; email: string };
  content: string;
  context: string;
  dossierId?: string;
  dossier?: { id: string; referenceNumber: string };
  parentId?: string;
  createdAt: string;
  readBy: { memberId: string; userName: string; readAt: string }[];
  replies: ThreadMessage[];
}

@Component({
  selector: 'app-apia-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  viewProviders: [provideIcons({
    lucideSend, lucideSearch, lucideMessageCircle, lucideX,
    lucideCheckCheck, lucideCheck, lucideUsers, lucideBuilding2,
    lucideRefreshCw, lucideFileText, lucideMegaphone, lucideUserPlus,
    lucideChevronLeft, lucideReply, lucidePaperclip, lucideMoreHorizontal,
    lucidePin, lucideArchive, lucideStar, lucideSmile, lucideImage
  })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; height: 100%; }

    .layout { display: flex; height: 100%; overflow: hidden; background: var(--bg-primary); }

    /* ═══════════════════════════════════════════════════════════
       SIDEBAR
       ═══════════════════════════════════════════════════════════ */
    .sidebar {
      width: 320px;
      min-width: 320px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--bg-card);
      overflow: hidden;
    }

    .sidebar__head {
      padding: 16px 16px 0;
      flex-shrink: 0;
    }

    .sidebar__title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sidebar__icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--zir-emerald) 28%, transparent);
    }

    .sidebar__label h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .sidebar__label span {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .btn-compose {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 12px;
      border-radius: 9px;
      border: none;
      background: var(--zir-emerald);
      color: #fff;
      font-size: 0.73rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .btn-compose:hover { filter: brightness(1.1); }

    /* Search */
    .sidebar__search {
      position: relative;
      margin-bottom: 12px;
    }

    .sidebar__search ng-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .sidebar__search input {
      width: 100%;
      padding: 9px 12px 9px 36px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.78rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }

    .sidebar__search input::placeholder { color: var(--text-muted); }
    .sidebar__search input:focus { border-color: var(--zir-emerald); }

    /* Tabs */
    .sidebar__tabs {
      display: flex;
      gap: 4px;
      padding: 0 16px 12px;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }

    .sidebar__tabs::-webkit-scrollbar { display: none; }

    .tab {
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      font-family: inherit;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .tab:hover { color: var(--text-primary); border-color: var(--text-muted); }
    .tab--active {
      background: color-mix(in srgb, var(--zir-emerald) 12%, transparent);
      border-color: var(--zir-emerald);
      color: var(--zir-emerald);
    }

    .tab__badge {
      min-width: 15px;
      height: 15px;
      border-radius: 8px;
      background: var(--zir-emerald);
      color: #fff;
      font-size: 0.58rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }

    /* Divider line */
    .sidebar__divider {
      height: 1px;
      background: var(--border);
      margin: 0 16px;
    }

    /* Conversation list */
    .conv-list {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }

    .conv-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.12s;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
    }

    .conv-item:hover { background: var(--bg-secondary); }

    .conv-item--active {
      background: color-mix(in srgb, var(--zir-emerald) 6%, transparent);
      border-left: 3px solid var(--zir-emerald);
      padding-left: 13px;
    }

    .conv-item--unread { background: color-mix(in srgb, var(--zir-emerald) 3%, transparent); }

    /* Avatar */
    .av {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .av--emerald { background: color-mix(in srgb, var(--zir-emerald) 14%, transparent); color: var(--zir-emerald); }
    .av--violet  { background: rgba(99, 102, 241, 0.12); color: #818cf8; }
    .av--amber   { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }

    /* Content */
    .conv-body {
      flex: 1;
      min-width: 0;
    }

    .conv-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .conv-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .conv-time {
      font-size: 0.64rem;
      color: var(--text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .conv-preview {
      font-size: 0.73rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
      line-height: 1.4;
    }

    .conv-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }

    .conv-tag {
      display: inline-flex;
      font-size: 0.58rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .conv-tag--internal  { background: color-mix(in srgb, var(--zir-emerald) 10%, transparent); color: var(--zir-emerald); }
    .conv-tag--dossier   { background: rgba(99, 102, 241, 0.1); color: #818cf8; }
    .conv-tag--announce  { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }

    .conv-badge {
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      background: var(--zir-emerald);
      color: #fff;
      font-size: 0.6rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      flex-shrink: 0;
    }

    /* Empty sidebar */
    .empty-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 32px 20px;
      text-align: center;
      gap: 10px;
    }

    .empty-side__icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: color-mix(in srgb, var(--zir-emerald) 8%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-side__icon ng-icon { color: var(--zir-emerald); opacity: 0.45; }
    .empty-side h4 { margin: 0; font-size: 0.82rem; font-weight: 700; color: var(--text-primary); }
    .empty-side p  { margin: 0; font-size: 0.72rem; color: var(--text-muted); max-width: 180px; line-height: 1.45; }

    /* Skeleton */
    .sk {
      border-radius: 6px;
      background: var(--bg-skeleton);
      position: relative;
      overflow: hidden;
    }

    .sk::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, var(--bg-skeleton-shine), transparent);
      animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { @keyframes shimmer { from { transform: none; } to { transform: none; } } }

    .sk-conv {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
    }

    .sk-conv .sk { flex-shrink: 0; }
    .sk-conv__lines { flex: 1; display: flex; flex-direction: column; gap: 7px; }

    /* ═══════════════════════════════════════════════════════════
       CHAT
       ═══════════════════════════════════════════════════════════ */
    .chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--bg-primary);
    }

    /* Chat header */
    .chat__head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      flex-shrink: 0;
    }

    .chat__back {
      display: none;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }

    .chat__back:hover { color: var(--zir-emerald); border-color: var(--zir-emerald); }

    .chat__avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .chat__meta { flex: 1; min-width: 0; }

    .chat__name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .chat__status {
      font-size: 0.68rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .chat__status::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--zir-emerald);
      flex-shrink: 0;
    }

    .chat__actions { display: flex; gap: 4px; }

    .chat__action {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chat__action:hover { color: var(--zir-emerald); border-color: var(--zir-emerald); }

    /* Messages */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }

    /* Date pill */
    .date-pill {
      text-align: center;
      margin: 16px 0 10px;
    }

    .date-pill span {
      display: inline-block;
      font-size: 0.66rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-card);
      padding: 3px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
    }

    /* Message */
    .msg {
      max-width: 60%;
      margin-bottom: 1px;
      animation: msgIn 0.18s ease-out;
    }

    @keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { @keyframes msgIn { from { opacity: 1; transform: none; } to { opacity: 1; transform: none; } } }

    .msg--self { align-self: flex-end; }
    .msg--other { align-self: flex-start; }

    .msg__name {
      font-size: 0.66rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 3px;
      padding-left: 2px;
    }

    .msg__bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 0.82rem;
      line-height: 1.5;
      color: var(--text-primary);
      word-break: break-word;
    }

    .msg--self .msg__bubble {
      background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep));
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .msg--other .msg__bubble {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }

    .msg__foot {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 3px;
      padding: 0 2px;
    }

    .msg--self .msg__foot { justify-content: flex-end; }

    .msg__t { font-size: 0.6rem; color: var(--text-muted); }
    .msg--self .msg__t { color: rgba(255, 255, 255, 0.55); }

    .msg__r {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.58rem;
    }

    .msg--self .msg__r { color: rgba(255, 255, 255, 0.55); }
    .msg--other .msg__r { color: var(--text-muted); }

    /* Replies thread */
    .msg__thread {
      margin-left: 16px;
      padding-left: 12px;
      border-left: 2px solid color-mix(in srgb, var(--zir-emerald) 18%, transparent);
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reply .msg__name { font-size: 0.64rem; }
    .reply .msg__bubble { padding: 8px 12px; font-size: 0.78rem; }

    /* Compose */
    .compose {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-card);
      flex-shrink: 0;
    }

    .compose__wrap {
      flex: 1;
      position: relative;
    }

    .compose__input {
      width: 100%;
      min-height: 40px;
      max-height: 100px;
      padding: 10px 40px 10px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.82rem;
      resize: none;
      outline: none;
      font-family: inherit;
      line-height: 1.4;
      transition: border-color 0.15s;
    }

    .compose__input:focus { border-color: var(--zir-emerald); }
    .compose__input::placeholder { color: var(--text-muted); }

    .compose__clip {
      position: absolute;
      right: 6px;
      bottom: 6px;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .compose__clip:hover { color: var(--zir-emerald); }

    .compose__send {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, var(--zir-emerald), var(--zir-green-deep));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }

    .compose__send:hover:not(:disabled) { filter: brightness(1.1); }
    .compose__send:disabled { opacity: 0.3; cursor: not-allowed; }

    /* ═══════════════════════════════════════════════════════════
       EMPTY CHAT
       ═══════════════════════════════════════════════════════════ */
    .empty-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
      gap: 16px;
    }

    .empty-chat__icon {
      width: 80px;
      height: 80px;
      border-radius: 22px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--zir-emerald) 10%, transparent), color-mix(in srgb, var(--zir-emerald) 4%, transparent));
      border: 1px solid color-mix(in srgb, var(--zir-emerald) 12%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-chat__icon ng-icon { color: var(--zir-emerald); opacity: 0.4; }
    .empty-chat h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
    .empty-chat p  { margin: 0; font-size: 0.82rem; color: var(--text-muted); max-width: 340px; line-height: 1.55; }

    .empty-chat__row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .empty-chat__pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      font-size: 0.73rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .empty-chat__pill ng-icon { color: var(--zir-emerald); opacity: 0.5; }

    /* ═══════════════════════════════════════════════════════════
       MODAL
       ═══════════════════════════════════════════════════════════ */
    .modal-bg {
      position: fixed;
      inset: 0;
      z-index: 50;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 100%;
      max-width: 460px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    }

    .modal__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .modal__top h3 {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .modal__x {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal__x:hover { color: #ef4444; border-color: #ef4444; }

    .modal__body { padding: 16px 20px; }

    .field { margin-bottom: 14px; }

    .field label {
      display: block;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field select,
    .field textarea {
      width: 100%;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 0.82rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
      outline: none;
      font-family: inherit;
    }

    .field select:focus,
    .field textarea:focus { border-color: var(--zir-emerald); }

    .field textarea { resize: vertical; min-height: 80px; line-height: 1.45; }

    .modal__foot {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      padding: 12px 20px;
      border-top: 1px solid var(--border);
    }

    .btn {
      padding: 8px 14px;
      border-radius: 9px;
      font-size: 0.78rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: inherit;
    }

    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .btn--green { background: var(--zir-emerald); color: #fff; }
    .btn--green:hover:not(:disabled) { filter: brightness(1.1); }

    .btn--ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
    .btn--ghost:hover { border-color: var(--text-muted); color: var(--text-primary); }

    /* ═══════════════════════════════════════════════════════════
       RESPONSIVE
       ═══════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {
      .sidebar {
        position: absolute;
        inset: 0;
        z-index: 10;
        width: 100%;
        min-width: 0;
      }

      .sidebar--hidden { display: none; }
      .chat__back { display: flex; }
      .msg { max-width: 82%; }
      .chat__head { padding: 10px 14px; }
      .messages { padding: 14px; }
      .compose { padding: 10px 14px; }
      .empty-chat__row { flex-direction: column; }
    }
  `],
  template: `
    <div class="layout">
      <!-- ═══ SIDEBAR ═══ -->
      <div class="sidebar" [class.sidebar--hidden]="activeThread() && isMobile()">
        <div class="sidebar__head">
          <div class="sidebar__title-row">
            <div class="sidebar__brand">
              <div class="sidebar__icon">
                <ng-icon name="lucideMessageCircle" size="17"></ng-icon>
              </div>
              <div class="sidebar__label">
                <h2>Messagerie</h2>
                <span>Institutionnelle</span>
              </div>
            </div>
            <button class="btn-compose" (click)="openComposeModal()">
              <ng-icon name="lucideUserPlus" size="13"></ng-icon>
              Nouveau
            </button>
          </div>

          <div class="sidebar__search">
            <ng-icon name="lucideSearch" size="14"></ng-icon>
            <input placeholder="Rechercher..."
                   [ngModel]="searchQuery()"
                   (ngModelChange)="searchQuery.set($event)">
          </div>
        </div>

        <div class="sidebar__tabs">
          <button class="tab" [class.tab--active]="activeTab() === 'all'" (click)="activeTab.set('all')">
            Tous
            @if (unreadTotal() > 0) {
              <span class="tab__badge">{{ unreadTotal() }}</span>
            }
          </button>
          <button class="tab" [class.tab--active]="activeTab() === 'INTERNAL'" (click)="activeTab.set('INTERNAL')">
            Bureau
          </button>
          <button class="tab" [class.tab--active]="activeTab() === 'DOSSIER'" (click)="activeTab.set('DOSSIER')">
            Dossiers
          </button>
          <button class="tab" [class.tab--active]="activeTab() === 'ANNOUNCEMENT'" (click)="activeTab.set('ANNOUNCEMENT')">
            Annonces
          </button>
        </div>

        <div class="sidebar__divider"></div>

        <div class="conv-list">
          @if (loadingConversations()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="sk-conv">
                <div class="sk" style="width:40px;height:40px;border-radius:12px;"></div>
                <div class="sk-conv__lines">
                  <div class="sk" style="height:11px;width:55%;border-radius:5px;"></div>
                  <div class="sk" style="height:9px;width:75%;border-radius:5px;"></div>
                </div>
              </div>
            }
          } @else if (filteredConversations().length === 0) {
            <div class="empty-side">
              <div class="empty-side__icon">
                <ng-icon name="lucideMessageCircle" size="24"></ng-icon>
              </div>
              <h4>Aucune conversation</h4>
              <p>Commencez une nouvelle discussion</p>
            </div>
          } @else {
            @for (conv of filteredConversations(); track convKey(conv)) {
              <div class="conv-item"
                   [class.conv-item--active]="isSelected(conv)"
                   [class.conv-item--unread]="conv.unreadCount > 0"
                   (click)="selectConversation(conv)">
                <div class="av"
                     [class.av--emerald]="conv.type === 'INTERNAL'"
                     [class.av--violet]="conv.type === 'DOSSIER'"
                     [class.av--amber]="conv.type === 'ANNOUNCEMENT'">
                  @if (conv.type === 'INTERNAL') {
                    {{ conv.participantName?.charAt(0) || '?' }}
                  } @else if (conv.type === 'DOSSIER') {
                    <ng-icon name="lucideFileText" size="17"></ng-icon>
                  } @else {
                    <ng-icon name="lucideMegaphone" size="17"></ng-icon>
                  }
                </div>

                <div class="conv-body">
                  <div class="conv-row">
                    <span class="conv-name">
                      @if (conv.type === 'INTERNAL') { {{ conv.participantName }} }
                      @else if (conv.type === 'DOSSIER') { {{ conv.dossierRef }} }
                      @else { {{ conv.senderName }} }
                    </span>
                    <span class="conv-time">{{ formatTime(conv.lastMessage.createdAt) }}</span>
                  </div>
                  <div class="conv-preview">{{ conv.lastMessage.content }}</div>
                  <div class="conv-bottom">
                    <span class="conv-tag"
                          [class.conv-tag--internal]="conv.type === 'INTERNAL'"
                          [class.conv-tag--dossier]="conv.type === 'DOSSIER'"
                          [class.conv-tag--announce]="conv.type === 'ANNOUNCEMENT'">
                      @if (conv.type === 'INTERNAL') { Bureau }
                      @else if (conv.type === 'DOSSIER') { Dossier }
                      @else { Annonce }
                    </span>
                    @if (conv.unreadCount > 0) {
                      <span class="conv-badge">{{ conv.unreadCount }}</span>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- ═══ CHAT ═══ -->
      <div class="chat">
        @if (!activeThread()) {
          <div class="empty-chat">
            <div class="empty-chat__icon">
              <ng-icon name="lucideMessageCircle" size="36"></ng-icon>
            </div>
            <h3>Messagerie institutionnelle</h3>
            <p>Échangez avec les membres de votre bureau, suivez les dossiers agricoles, et collaborez avec votre équipe.</p>
            <div class="empty-chat__row">
              <div class="empty-chat__pill">
                <ng-icon name="lucideUsers" size="14"></ng-icon>
                Échanges internes
              </div>
              <div class="empty-chat__pill">
                <ng-icon name="lucideFileText" size="14"></ng-icon>
                Suivi dossiers
              </div>
              <div class="empty-chat__pill">
                <ng-icon name="lucideMegaphone" size="14"></ng-icon>
                Annonces
              </div>
            </div>
          </div>
        } @else {
          <div class="chat__head">
            <button class="chat__back" (click)="activeThread.set(null)">
              <ng-icon name="lucideChevronLeft" size="17"></ng-icon>
            </button>
            <div class="chat__avatar av"
                 [class.av--emerald]="activeThread()?.type === 'INTERNAL'"
                 [class.av--violet]="activeThread()?.type === 'DOSSIER'"
                 [class.av--amber]="activeThread()?.type === 'ANNOUNCEMENT'">
              @if (activeThread()?.type === 'INTERNAL') {
                {{ activeThread()?.participantName?.charAt(0) || '?' }}
              } @else if (activeThread()?.type === 'DOSSIER') {
                <ng-icon name="lucideFileText" size="17"></ng-icon>
              } @else {
                <ng-icon name="lucideMegaphone" size="17"></ng-icon>
              }
            </div>
            <div class="chat__meta">
              <div class="chat__name">{{ threadTitle() }}</div>
              <div class="chat__status">{{ threadSubtitle() }}</div>
            </div>
            <div class="chat__actions">
              <button class="chat__action" (click)="markThreadRead()" title="Marquer comme lu">
                <ng-icon name="lucideCheckCheck" size="15"></ng-icon>
              </button>
            </div>
          </div>

          <div class="messages" #messagesContainer>
            @if (loadingMessages()) {
              @for (i of [1,2,3]; track i) {
                <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px;">
                  <div class="sk" style="height:9px;width:50px;border-radius:4px;"></div>
                  <div class="sk" style="height:32px;width:200px;border-radius:14px;"></div>
                </div>
              }
            } @else if (messages().length === 0) {
              <div class="empty-side">
                <div class="empty-side__icon">
                  <ng-icon name="lucideMessageCircle" size="22"></ng-icon>
                </div>
                <h4 style="font-size:0.82rem;">Aucun message</h4>
                <p>Commencez la discussion !</p>
              </div>
            } @else {
              @for (msg of messages(); track msg.id) {
                @if (shouldShowDate(msg)) {
                  <div class="date-pill">
                    <span>{{ formatDate(msg.createdAt) }}</span>
                  </div>
                }
                <div class="msg" [class.msg--self]="msg.senderId === currentUserId()" [class.msg--other]="msg.senderId !== currentUserId()">
                  @if (msg.senderId !== currentUserId()) {
                    <div class="msg__name">{{ msg.sender?.name }}</div>
                  }
                  <div class="msg__bubble">{{ msg.content }}</div>
                  <div class="msg__foot">
                    <span class="msg__t">{{ formatMessageTime(msg.createdAt) }}</span>
                    @if (msg.readBy && msg.readBy.length > 0 && msg.senderId === currentUserId()) {
                      <span class="msg__r">
                        <ng-icon name="lucideCheckCheck" size="10"></ng-icon>
                        Lu par {{ msg.readBy.length }}
                      </span>
                    }
                  </div>
                  @if (msg.replies && msg.replies.length > 0) {
                    <div class="msg__thread">
                      @for (reply of msg.replies; track reply.id) {
                        <div class="reply msg" [class.msg--self]="reply.senderId === currentUserId()" [class.msg--other]="reply.senderId !== currentUserId()">
                          <div class="msg__name">{{ reply.sender?.name }}</div>
                          <div class="msg__bubble">{{ reply.content }}</div>
                          <div class="msg__foot">
                            <span class="msg__t">{{ formatMessageTime(reply.createdAt) }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <div class="compose">
            <div class="compose__wrap">
              <textarea class="compose__input"
                        [ngModel]="newMessage()"
                        (ngModelChange)="newMessage.set($event)"
                        (keydown.enter)="sendMessage($event)"
                        placeholder="Écrire un message..."
                        rows="1"
                        (input)="autoResize($event)"></textarea>
              <button class="compose__clip" title="Joindre">
                <ng-icon name="lucidePaperclip" size="15"></ng-icon>
              </button>
            </div>
            <button class="compose__send"
                    [disabled]="!newMessage().trim()"
                    (click)="sendMessage()">
              <ng-icon name="lucideSend" size="17"></ng-icon>
            </button>
          </div>
        }
      </div>
    </div>

    <!-- ═══ MODAL ═══ -->
    @if (showComposeModal()) {
      <div class="modal-bg" (click)="showComposeModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__top">
            <h3>
              <ng-icon name="lucideUserPlus" size="16"></ng-icon>
              Nouveau message
            </h3>
            <button class="modal__x" (click)="showComposeModal.set(false)">
              <ng-icon name="lucideX" size="14"></ng-icon>
            </button>
          </div>
          <div class="modal__body">
            <div class="field">
              <label>Type</label>
              <select [ngModel]="composeForm().context" (ngModelChange)="updateComposeContext($event)">
                <option value="INTERNAL">Message interne (bureau)</option>
                <option value="DOSSIER">Message dossier (agriculteur)</option>
                <option value="ANNOUNCEMENT">Annonce officielle</option>
              </select>
            </div>
            @if (composeForm().context === 'INTERNAL') {
              <div class="field">
                <label>Destinataire</label>
                <select [ngModel]="composeForm().recipientId" (ngModelChange)="updateComposeRecipient($event)">
                  <option value="">Choisir un membre...</option>
                  @for (m of officeMembers(); track m.id) {
                    <option [value]="m.userId">{{ m.user?.name }} ({{ m.officeRole }})</option>
                  }
                </select>
              </div>
            }
            @if (composeForm().context === 'DOSSIER') {
              <div class="field">
                <label>Dossier</label>
                <select [ngModel]="composeForm().dossierId" (ngModelChange)="updateComposeDossier($event)">
                  <option value="">Choisir un dossier...</option>
                  @for (d of dossiers(); track d.id) {
                    <option [value]="d.id">{{ d.referenceNumber }} — {{ d.farmerName || 'Agriculteur' }}</option>
                  }
                </select>
              </div>
            }
            <div class="field">
              <label>Message</label>
              <textarea [ngModel]="composeForm().content"
                        (ngModelChange)="updateComposeContent($event)"
                        rows="3"
                        placeholder="Votre message..."></textarea>
            </div>
          </div>
          <div class="modal__foot">
            <button class="btn btn--ghost" (click)="showComposeModal.set(false)">Annuler</button>
            <button class="btn btn--green" [disabled]="!canSendCompose()" (click)="sendComposedMessage()">
              <ng-icon name="lucideSend" size="13"></ng-icon>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ApiaMessagesComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private apiUrl = environment.apiUrl;
  private pollSub?: Subscription;

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  conversations = signal<Conversation[]>([]);
  messages = signal<ThreadMessage[]>([]);
  activeThread = signal<Conversation | null>(null);
  activeTab = signal<'all' | 'INTERNAL' | 'DOSSIER' | 'ANNOUNCEMENT'>('all');
  searchQuery = signal('');
  newMessage = signal('');
  loadingConversations = signal(true);
  loadingMessages = signal(false);
  showComposeModal = signal(false);
  isMobile = signal(false);
  officeMembers = signal<any[]>([]);
  dossiers = signal<any[]>([]);

  composeForm = signal<{
    context: string;
    recipientId: string;
    dossierId: string;
    content: string;
  }>({ context: 'INTERNAL', recipientId: '', dossierId: '', content: '' });

  currentUserId = computed(() => this.authStore.currentUser()?.id);

  filteredConversations = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase();
    let list = this.conversations();
    if (tab !== 'all') list = list.filter((c) => c.type === tab);
    if (q) {
      list = list.filter((c) =>
        (c.participantName || '').toLowerCase().includes(q) ||
        (c.dossierRef || '').toLowerCase().includes(q) ||
        (c.senderName || '').toLowerCase().includes(q) ||
        c.lastMessage.content.toLowerCase().includes(q)
      );
    }
    return list;
  });

  unreadTotal = computed(() => this.conversations().reduce((sum, c) => sum + c.unreadCount, 0));

  threadTitle = computed(() => {
    const t = this.activeThread();
    if (!t) return '';
    if (t.type === 'INTERNAL') return t.participantName || '';
    if (t.type === 'DOSSIER') return `Dossier ${t.dossierRef || ''}`;
    return t.senderName || '';
  });

  threadSubtitle = computed(() => {
    const t = this.activeThread();
    if (!t) return '';
    if (t.type === 'INTERNAL') return t.participantRole || '';
    if (t.type === 'DOSSIER') return 'Messages du dossier';
    return 'Annonce';
  });

  ngOnInit() {
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
    this.loadConversations();
    this.loadOfficeData();
    this.pollSub = interval(8000).subscribe(() => {
      if (!document.hidden) this.loadConversations();
    });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    window.removeEventListener('resize', this.checkMobile);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private checkMobile = () => {
    this.isMobile.set(window.innerWidth < 768);
  };

  private getAuthHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  private get institutionId() {
    return (this.authStore.currentUser() as any)?.institutionMember?.institutionId;
  }

  loadConversations() {
    if (!this.institutionId) return;
    this.http.get<Conversation[]>(`${this.apiUrl}/institution-messages/${this.institutionId}/conversations`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => { this.conversations.set(res); this.loadingConversations.set(false); },
      error: () => this.loadingConversations.set(false)
    });
  }

  loadOfficeData() {
    if (!this.institutionId) return;
    this.http.get<any>(`${this.apiUrl}/institutions/offices/${this.institutionId}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => this.officeMembers.set(res.members || [])
    });
    this.http.get<any>(`${this.apiUrl}/dossiers/institution/${this.institutionId}?limit=100`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => this.dossiers.set(res.data || res || [])
    });
  }

  selectConversation(conv: Conversation) {
    this.activeThread.set(conv);
    this.loadingMessages.set(true);
    const params: any = {};
    if (conv.type === 'DOSSIER' && conv.dossierId) params.dossierId = conv.dossierId;
    else if (conv.type === 'INTERNAL' && conv.participantId) params.participantId = conv.participantId;

    const qs = new URLSearchParams(params).toString();
    this.http.get<ThreadMessage[]>(`${this.apiUrl}/institution-messages/${this.institutionId}/thread?${qs}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => { this.messages.set(res); this.loadingMessages.set(false); },
      error: () => this.loadingMessages.set(false)
    });
  }

  isSelected(conv: Conversation): boolean {
    const active = this.activeThread();
    if (!active) return false;
    if (conv.type !== active.type) return false;
    if (conv.type === 'DOSSIER') return conv.dossierId === active.dossierId;
    if (conv.type === 'INTERNAL') return conv.participantId === active.participantId;
    return conv.senderId === active.senderId && conv.lastMessage.content === active.lastMessage.content;
  }

  convKey(conv: Conversation): string {
    if (conv.type === 'DOSSIER') return `dossier:${conv.dossierId}`;
    if (conv.type === 'INTERNAL') return `internal:${conv.participantId}`;
    return `ann:${conv.senderId}:${conv.lastMessage.createdAt}`;
  }

  sendMessage(event?: Event) {
    if (event) event.preventDefault();
    const content = this.newMessage().trim();
    if (!content || !this.activeThread()) return;
    const thread = this.activeThread()!;
    const body: any = { content, context: thread.type };
    if (thread.type === 'DOSSIER' && thread.dossierId) body.dossierId = thread.dossierId;

    this.http.post(`${this.apiUrl}/institution-messages/${this.institutionId}/send`, body, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => { this.newMessage.set(''); this.selectConversation(thread); this.loadConversations(); }
    });
  }

  markThreadRead() {
    const thread = this.activeThread();
    if (!thread) return;
    const body: any = {};
    if (thread.type === 'DOSSIER' && thread.dossierId) body.dossierId = thread.dossierId;
    else if (thread.type === 'INTERNAL' && thread.participantId) body.participantId = thread.participantId;
    this.http.patch(`${this.apiUrl}/institution-messages/${this.institutionId}/read-thread`, body, {
      headers: this.getAuthHeaders()
    }).subscribe({ next: () => this.loadConversations() });
  }

  openComposeModal() {
    this.composeForm.set({ context: 'INTERNAL', recipientId: '', dossierId: '', content: '' });
    this.showComposeModal.set(true);
  }

  updateComposeContext(v: string) { this.composeForm.update(f => ({ ...f, context: v })); }
  updateComposeRecipient(v: string) { this.composeForm.update(f => ({ ...f, recipientId: v })); }
  updateComposeDossier(v: string) { this.composeForm.update(f => ({ ...f, dossierId: v })); }
  updateComposeContent(v: string) { this.composeForm.update(f => ({ ...f, content: v })); }

  canSendCompose(): boolean {
    const f = this.composeForm();
    if (!f.content.trim()) return false;
    if (f.context === 'INTERNAL' && !f.recipientId) return false;
    if (f.context === 'DOSSIER' && !f.dossierId) return false;
    return true;
  }

  sendComposedMessage() {
    const f = this.composeForm();
    if (!this.canSendCompose()) return;
    const body: any = { content: f.content, context: f.context };
    if (f.context === 'INTERNAL') body.recipientId = f.recipientId;
    if (f.context === 'DOSSIER') body.dossierId = f.dossierId;

    this.http.post(`${this.apiUrl}/institution-messages/${this.institutionId}/send`, body, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        this.showComposeModal.set(false);
        this.loadConversations();
      }
    });
  }

  shouldShowDate(msg: ThreadMessage): boolean {
    const msgs = this.messages();
    const idx = msgs.indexOf(msg);
    if (idx === 0) return true;
    const prev = msgs[idx - 1];
    return new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  private scrollToBottom() {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
