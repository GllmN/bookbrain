import { Component, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Book, ChatMessage, HistorySession } from '../../models/types';
import { HistoryPanelComponent } from './history-panel/history-panel.component';
import { SearchViewComponent } from './search-view/search-view.component';

const HISTORY_KEY = 'bookbrain_history';
const MAX_SESSIONS = 50;

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [HistoryPanelComponent, SearchViewComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  private readonly api = inject(ApiService);

  sessions = signal<HistorySession[]>(this.loadHistory());
  activeSessionId = signal<string | null>(null);
  loading = signal(false);
  books = signal<Book[]>([]);

  activeSession = computed(() =>
    this.sessions().find(s => s.id === this.activeSessionId()) ?? null
  );

  constructor() {
    this.api.getBooks().subscribe({
      next: (data) => this.books.set(data.books),
    });
  }

  selectSession(id: string) {
    this.activeSessionId.set(id);
  }

  startNewChat() {
    this.activeSessionId.set(null);
  }

  onSubmit(event: { query: string; bookIds: string[]; mode: 'ask' | 'search' }) {
    const { query, bookIds, mode } = event;
    const ids = bookIds.length ? bookIds : undefined;

    if (mode === 'search') {
      const session = this.createSession('search', query);
      this.activeSessionId.set(session.id);
      this.loading.set(true);

      this.api.search(query, 15, ids).subscribe({
        next: (res) => {
          this.updateSession(session.id, { searchResults: res.results, searchTook: res.took });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      let sessionId = this.activeSessionId();
      const current = this.activeSession();

      if (!sessionId || current?.type !== 'ask') {
        const session = this.createSession('ask', query);
        sessionId = session.id;
        this.activeSessionId.set(sessionId);
      }

      const userMsg: ChatMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
      this.appendMessage(sessionId, userMsg);
      this.loading.set(true);

      const history = (this.activeSession()?.messages ?? [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      this.api.ask(query, ids, history).subscribe({
        next: (res) => {
          this.appendMessage(sessionId!, {
            role: 'assistant',
            content: res.answer,
            sources: res.sources,
            timestamp: new Date().toISOString(),
          });
          this.loading.set(false);
        },
        error: () => {
          this.appendMessage(sessionId!, {
            role: 'assistant',
            content: 'Erreur lors de la génération de la réponse.',
            timestamp: new Date().toISOString(),
          });
          this.loading.set(false);
        },
      });
    }
  }

  private createSession(type: 'ask' | 'search', firstQuery: string): HistorySession {
    const title = firstQuery.length > 60 ? firstQuery.slice(0, 60) + '…' : firstQuery;
    const session: HistorySession = {
      id: crypto.randomUUID(),
      type,
      title,
      createdAt: new Date().toISOString(),
      messages: type === 'ask' ? [] : undefined,
    };
    const updated = [session, ...this.sessions()].slice(0, MAX_SESSIONS);
    this.sessions.set(updated);
    this.saveHistory(updated);
    return session;
  }

  private updateSession(id: string, patch: Partial<HistorySession>) {
    const updated = this.sessions().map(s => s.id === id ? { ...s, ...patch } : s);
    this.sessions.set(updated);
    this.saveHistory(updated);
  }

  private appendMessage(sessionId: string, message: ChatMessage) {
    const updated = this.sessions().map(s =>
      s.id === sessionId
        ? { ...s, messages: [...(s.messages ?? []), message] }
        : s
    );
    this.sessions.set(updated);
    this.saveHistory(updated);
  }

  private loadHistory(): HistorySession[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveHistory(sessions: HistorySession[]) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
  }
}
