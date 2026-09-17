import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface AgentMessage {
  id: string;
  sender: 'USER' | 'AGENT';
  text: string;
  audio_url?: string;
  actions?: string[];
  created_at: string;
}

export interface AgentConversation {
  id: string;
  session_id: string;
  language: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AgentService {
  conversations = signal<AgentConversation[]>([]);
  messages = signal<AgentMessage[]>([]);
  activeSessionId = signal<string | null>(null);
  
  isProcessing = signal(false);

  constructor(private http: HttpClient) {}

  fetchConversations() {
    return this.http.get<AgentConversation[]>(`${environment.apiUrl}/agent/conversations`).pipe(
      tap(data => this.conversations.set(data)),
      catchError(() => of([]))
    );
  }

  fetchMessages(conversationDbId: string) {
    return this.http.get<any[]>(`${environment.apiUrl}/agent/conversations/${conversationDbId}/messages`).pipe(
      tap(data => {
        const mapped = data.map(m => ({
          id: m.id,
          sender: m.role,
          text: m.content,
          audio_url: m.audio_url,
          created_at: m.created_at
        }));
        this.messages.set(mapped);
      }),
      catchError(() => of([]))
    );
  }

  deleteConversation(conversationDbId: string) {
    return this.http.delete(`${environment.apiUrl}/agent/conversations/${conversationDbId}`).pipe(
      tap(() => {
        this.conversations.update(c => c.filter(conv => conv.id !== conversationDbId));
        this.messages.set([]);
        this.activeSessionId.set(null);
      })
    );
  }

  sendMessage(text?: string, audioUrl?: string, sessionId?: string) {
    this.isProcessing.set(true);
    
    // Optimistic UI update for user message
    if (text || audioUrl) {
      this.messages.update(msgs => [...msgs, {
        id: crypto.randomUUID(),
        sender: 'USER',
        text: text || '',
        audio_url: audioUrl,
        created_at: new Date().toISOString()
      }]);
    }

    const payload: any = {};
    if (text) payload.text = text;
    if (audioUrl) payload.audio_url = audioUrl;
    if (sessionId) payload.session_id = sessionId;

    return this.http.post<AgentMessage>(`${environment.apiUrl}/agent/message`, payload).pipe(
      tap((res: any) => {
        // Map backend response { reply, sessionId, ... } to AgentMessage interface
        const responseMsg: AgentMessage = {
          id: res.id || crypto.randomUUID(),
          sender: 'AGENT',
          text: res.reply || res.text || '',
          created_at: new Date().toISOString(),
          actions: res.actions || []
        };
        // Add agent response
        this.messages.update(msgs => [...msgs, responseMsg]);
        this.isProcessing.set(false);
        this.activeSessionId.set(res.sessionId);
        
        // Refresh conversations list to update 'updated_at'
        this.fetchConversations().subscribe();
      }),
      catchError(err => {
        this.isProcessing.set(false);
        const errorMsg: AgentMessage = {
          id: crypto.randomUUID(),
          sender: 'AGENT',
          text: "ZirIA est momentanément indisponible (Service Gemini 503). Veuillez réessayer dans quelques instants.",
          created_at: new Date().toISOString(),
          actions: []
        };
        this.messages.update(msgs => [...msgs, errorMsg]);
        return of(errorMsg);
      })
    );
  }
}
