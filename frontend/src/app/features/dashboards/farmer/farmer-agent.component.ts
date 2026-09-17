import {  Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, effect, PLATFORM_ID , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideLeaf, lucideWheat, lucideCircleDollarSign, lucideBell, 
  lucideMic, lucideSend, lucideStopCircle, lucideTrendingUp, lucideTrendingDown, lucideLoader,
  lucidePlus, lucideTrash2, lucideDownload, lucideMessageSquare
} from '@ng-icons/lucide';
import { FarmerApiService } from '../../../core/services/farmer-api.service';
import { AgentService, AgentMessage } from '../../../core/services/agent.service';
import { MarketPricesService } from '../../../core/services/market-prices.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../expert/shared/toast.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { jsPDF } from 'jspdf';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-farmer-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    lucideLeaf, lucideWheat, lucideCircleDollarSign, lucideBell,
    lucideMic, lucideSend, lucideStopCircle, lucideTrendingUp, lucideTrendingDown, lucideLoader,
    lucidePlus, lucideTrash2, lucideDownload, lucideMessageSquare
  
})],
  templateUrl: './farmer-agent.component.html',
  styleUrl: './farmer-agent.component.scss'
})
export class FarmerAgentComponent implements OnInit, OnDestroy {
  @ViewChild('chatScroll', { static: false }) chatScroll!: ElementRef;

  private platformId = inject(PLATFORM_ID);
  public farmerApi = inject(FarmerApiService);
  public agentApi = inject(AgentService);
  public marketApi = inject(MarketPricesService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  // ZirPulse State
  chatInput = '';
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  recordingTimer = signal(0);
  private timerInterval: any;

  typewriterMsgId = signal<string | null>(null);
  displayedAgentText = signal<string>('');
  private typewriterTimer: any;

  quickSuggestions = [
    { label: "Mon stock", query: "Montre-moi mon stock" },
    { label: "Météo", query: "Météo aujourd'hui" },
    { label: "Prix marché", query: "Prix tomate aujourd'hui" },
    { label: "Mes parcelles", query: "État de mes parcelles" },
    { label: "Créer annonce", query: "Je veux vendre" }
  ];

  get userName() { return this.auth.currentUser()?.name || 'Agriculteur'; }
  get governorate() { return (this.auth.currentUser() as any)?.governorate || 'Kasserine'; }

  constructor() {
    effect(() => {
      const msgs = this.agentApi.messages();
      if (msgs.length > 0) {
        this.scrollToBottomThrottled();
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.agentApi.fetchConversations().subscribe();
    }
  }

  ngOnDestroy() {
    this.stopTypewriter();
    this.stopRecordingTimer();
  }

  // --- Conversations Management ---
  loadConversation(id: string) {
    this.agentApi.fetchMessages(id).subscribe();
  }

  newConversation() {
    this.agentApi.activeSessionId.set(null);
    this.agentApi.messages.set([]);
  }

  deleteConversation(id: string, event: Event) {
    event.stopPropagation();
    if (confirm("Supprimer cette conversation ?")) {
      this.agentApi.deleteConversation(id).subscribe();
    }
  }

  get groupedConversations() {
    const convs = this.agentApi.conversations();
    const groups: { [key: string]: any[] } = {
      'Aujourd\'hui': [],
      'Hier': [],
      'Cette semaine': [],
      'Plus ancien': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    convs.forEach(conv => {
      const d = new Date(conv.updated_at);
      const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (dateOnly.getTime() === today.getTime()) {
        groups['Aujourd\'hui'].push(conv);
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        groups['Hier'].push(conv);
      } else if (dateOnly.getTime() >= lastWeek.getTime()) {
        groups['Cette semaine'].push(conv);
      } else {
        groups['Plus ancien'].push(conv);
      }
    });

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }

  getRelativeTime(dateString: string): string {
    const d = new Date(dateString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // --- Chat Saisie ---
  onEnterPress(event: Event) {
    event.preventDefault();
    this.sendTextMessage();
  }

  sendSuggestion(query: string) {
    this.chatInput = query;
    this.sendTextMessage();
  }

  sendTextMessage() {
    if (!this.chatInput.trim() || this.agentApi.isProcessing()) return;
    const text = this.chatInput.trim();
    this.chatInput = '';
    
    this.agentApi.sendMessage(text, undefined, this.agentApi.activeSessionId() || undefined).subscribe({
      next: () => this.handleLatestAgentMessage()
    });
  }

  handleAction(actionLabel: string) {
    if (actionLabel === 'Aller au Diagnostic') {
      this.router.navigate(['/dashboard/farmer/diagnostic']);
    } else {
      this.chatInput = actionLabel;
      this.sendTextMessage();
    }
  }

  // --- Typewriter Effect ---
  private handleLatestAgentMessage() {
    const msgs = this.agentApi.messages();
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.sender === 'AGENT') {
      this.startTypewriter(lastMsg);
    }
  }

  private _scrollQueued = false;

  private startTypewriter(msg: AgentMessage) {
    this.stopTypewriter();
    this.typewriterMsgId.set(msg.id);
    this.displayedAgentText.set('');
    let i = 0;
    const text = msg.text || '';
    // Batched: 3 chars per 50ms = same speed as 1 char/16ms but 3x fewer CD cycles
    this.typewriterTimer = setInterval(() => {
      this.displayedAgentText.update(val => val + text.slice(i, i + 3));
      i += 3;
      this.scrollToBottomThrottled();
      if (i >= text.length) {
        this.stopTypewriter();
        this.typewriterMsgId.set(null);
      }
    }, 50);
  }

  private stopTypewriter() {
    if (this.typewriterTimer) { clearInterval(this.typewriterTimer); this.typewriterTimer = null; }
  }

  private scrollToBottomThrottled() {
    if (this._scrollQueued) return;
    this._scrollQueued = true;
    // Outside Angular zone timing: rAF is unpatched (zone-flags), no CD storm
    requestAnimationFrame(() => {
      this._scrollQueued = false;
      this.scrollToBottom();
    });
  }

  private scrollToBottom() {
    try {
      if (this.chatScroll) {
        this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
      }
    } catch(err) {}
  }

  // --- Audio Recording ---
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        this.audioChunks = [];
        this.isRecording = true;
        this.startRecordingTimer();

        this.mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.uploadAudioAndSend(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
      } catch (e) {
        this.toast.error('Microphone', 'Permission micro refusée ou non supportée.');
      }
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.stopRecordingTimer();
    }
  }

  private startRecordingTimer() {
    this.recordingTimer.set(0);
    this.timerInterval = setInterval(() => {
      this.recordingTimer.update(t => t + 1);
    }, 1000);
  }

  private stopRecordingTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private uploadAudioAndSend(blob: Blob) {
    const formData = new FormData();
    formData.append('file', blob, 'voice_memo.webm');

    this.agentApi.isProcessing.set(true);
    this.http.post<{url: string}>(`${environment.apiUrl}/upload/audio`, formData).subscribe({
      next: (res) => {
        this.agentApi.sendMessage(undefined, res.url, this.agentApi.activeSessionId() || undefined).subscribe({
          next: () => {
            this.handleLatestAgentMessage();
          }
        });
      },
      error: () => {
        this.agentApi.isProcessing.set(false);
        this.toast.error('Erreur', 'Erreur upload audio');
      }
    });
  }

  // --- PDF EXPORT ---
  exportPDF() {
    const msgs = this.agentApi.messages();
    if (msgs.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text("ZirIA Sentinel", 15, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Conversation Export - ${new Date().toLocaleString()}`, 15, y);
    y += 8;
    doc.text(`Utilisateur: ${this.userName} (${this.governorate})`, 15, y);
    y += 15;

    // Line
    doc.setDrawColor(200);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Messages
    doc.setFontSize(11);
    for (const msg of msgs) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const isUser = msg.sender === 'USER';
      const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const author = isUser ? this.userName : "Agent ZirPulse";
      
      if (isUser) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(50, 50, 50);

      doc.setFont("helvetica", "bold");
      doc.text(`[${time}] ${author} :`, 15, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      
      const textLines = doc.splitTextToSize(msg.text || (msg.audio_url ? '(Message vocal)' : ''), pageWidth - 30);
      doc.text(textLines, 20, y);
      y += (textLines.length * 6) + 10;
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Généré par ZirIA Sentinel — AiKup Tech | Kasserine, Tunisie", pageWidth / 2, 290, { align: 'center' });

    doc.save(`ziria-conversation-${Date.now()}.pdf`);
  }
}
