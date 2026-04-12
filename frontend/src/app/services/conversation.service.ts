import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { ChatMessage, HistorySession, SearchResult } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly api = inject(ApiService);

  sessions = signal<HistorySession[]>([]);
  activeSessionId = signal<string | null>(null);

  activeSession = computed(() =>
    this.sessions().find(s => s.id === this.activeSessionId()) ?? null
  );

  totalChunks = signal(0);

  /** Charge l'historique depuis l'API (appelé au démarrage) */
  loadSessions() {
    this.api.getHistory().subscribe({
      next: (sessions) => this.sessions.set(sessions),
    });
  }

  selectSession(id: string) {
    this.activeSessionId.set(id);
  }

  startNewChat() {
    this.activeSessionId.set(null);
  }

  deleteSession(id: string) {
    if (this.activeSessionId() === id) this.activeSessionId.set(null);
    this.sessions.update(s => s.filter(x => x.id !== id));
    this.api.deleteHistorySession(id).subscribe();
  }

  clearHistory() {
    this.activeSessionId.set(null);
    this.sessions.set([]);
    this.api.clearHistory().subscribe();
  }

  createSession(session: HistorySession) {
    this.sessions.update(s => [session, ...s]);
    this.activeSessionId.set(session.id);
    this.api.createSession(session).subscribe();
  }

  patchSession(id: string, patch: Partial<HistorySession>) {
    this.sessions.update(list =>
      list.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  appendMessage(sessionId: string, message: ChatMessage) {
    this.sessions.update(list =>
      list.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...(s.messages ?? []), message] }
          : s
      )
    );
  }

  appendToken(sessionId: string, token: string) {
    this.sessions.update(list =>
      list.map(s => {
        if (s.id !== sessionId) return s;
        const messages = [...(s.messages ?? [])];
        const last = messages[messages.length - 1];
        if (last?.role === 'assistant') {
          messages[messages.length - 1] = { ...last, content: last.content + token };
        }
        return { ...s, messages };
      })
    );
  }

  updateLastMessage(sessionId: string, patch: Partial<ChatMessage>) {
    this.sessions.update(list =>
      list.map(s => {
        if (s.id !== sessionId) return s;
        const messages = [...(s.messages ?? [])];
        const lastIdx = messages.length - 1;
        if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
          messages[lastIdx] = { ...messages[lastIdx], ...patch };
        }
        return { ...s, messages };
      })
    );
  }

  buildSession(type: 'ask' | 'search', firstQuery: string): HistorySession {
    const title = firstQuery.length > 60 ? firstQuery.slice(0, 60) + '…' : firstQuery;
    return {
      id: crypto.randomUUID(),
      type,
      title,
      createdAt: new Date().toISOString(),
      messages: type === 'ask' ? [] : undefined,
    };
  }
}
