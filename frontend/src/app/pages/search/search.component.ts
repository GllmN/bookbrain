import { Component, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Book, ChatMessage, HistorySession } from '../../models/types';
import { HistoryPanelComponent } from './history-panel/history-panel.component';
import { SearchViewComponent } from './search-view/search-view.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [HistoryPanelComponent, SearchViewComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  private readonly api = inject(ApiService);

  sessions = signal<HistorySession[]>([]);
  activeSessionId = signal<string | null>(null);
  loading = signal(false);
  books = signal<Book[]>([]);

  activeSession = computed(() =>
    this.sessions().find(s => s.id === this.activeSessionId()) ?? null
  );

  constructor() {
    this.api.getBooks().subscribe({ next: (data) => this.books.set(data.books) });
    this.api.getHistory().subscribe({ next: (sessions) => this.sessions.set(sessions) });
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

  onSubmit(event: { query: string; bookIds: string[]; mode: 'ask' | 'search' }) {
    const { query, bookIds, mode } = event;
    const ids = bookIds.length ? bookIds : undefined;

    if (mode === 'search') {
      const session = this.buildSession('search', query);
      this.sessions.update(s => [session, ...s]);
      this.activeSessionId.set(session.id);
      this.api.createSession(session).subscribe();
      this.loading.set(true);

      this.api.search(query, 15, ids).subscribe({
        next: (res) => {
          this.patchSession(session.id, { searchResults: res.results, searchTook: res.took });
          this.api.updateSession(session.id, { searchResults: res.results, searchTook: res.took }).subscribe();
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      let sessionId = this.activeSessionId();
      const current = this.activeSession();

      if (!sessionId || current?.type !== 'ask') {
        const session = this.buildSession('ask', query);
        this.sessions.update(s => [session, ...s]);
        sessionId = session.id;
        this.activeSessionId.set(sessionId);
        this.api.createSession(session).subscribe();
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
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: res.answer,
            sources: res.sources,
            timestamp: new Date().toISOString(),
          };
          this.appendMessage(sessionId!, assistantMsg);
          this.api.updateSession(sessionId!, { messages: this.activeSession()?.messages }).subscribe();
          this.loading.set(false);
        },
        error: () => {
          const errMsg: ChatMessage = {
            role: 'assistant',
            content: 'Erreur lors de la génération de la réponse.',
            timestamp: new Date().toISOString(),
          };
          this.appendMessage(sessionId!, errMsg);
          this.api.updateSession(sessionId!, { messages: this.activeSession()?.messages }).subscribe();
          this.loading.set(false);
        },
      });
    }
  }

  private buildSession(type: 'ask' | 'search', firstQuery: string): HistorySession {
    const title = firstQuery.length > 60 ? firstQuery.slice(0, 60) + '…' : firstQuery;
    return {
      id: crypto.randomUUID(),
      type,
      title,
      createdAt: new Date().toISOString(),
      messages: type === 'ask' ? [] : undefined,
    };
  }

  private patchSession(id: string, patch: Partial<HistorySession>) {
    this.sessions.update(list =>
      list.map(s => s.id === id ? { ...s, ...patch } : s)
    );
  }

  private appendMessage(sessionId: string, message: ChatMessage) {
    this.sessions.update(list =>
      list.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...(s.messages ?? []), message] }
          : s
      )
    );
  }
}
