import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConversationService } from '../../../core/services/conversation.service';
import { LlmModelService } from '../../../core/services/llm-model.service';
import { ApiService } from '../../../core/services/api.service';
import { Book, ChatMessage, SearchResult } from '../../../core/models/types';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HeaderFiltersComponent } from '../../../shared/components/header-filters/header-filters.component';

@Component({
  selector: 'app-qa',
  standalone: true,
  imports: [HeaderComponent, HeaderFiltersComponent, FormsModule],
  templateUrl: './qa.component.html',
  styleUrl: './qa.component.scss',
})
export class QaComponent implements OnInit {
  @ViewChild('chatArea') chatAreaRef!: ElementRef<HTMLDivElement>;

  readonly #conversationService = inject(ConversationService);
  readonly #llmModelService = inject(LlmModelService);
  readonly #apiService = inject(ApiService);

  books = signal<Book[]>([]);
  selectedBookIds = signal<string[]>([]);
  loading = signal(false);
  query: string = '';
  openSourcesAt = signal<Set<number>>(new Set());
  allSourcesAt = signal<Set<number>>(new Set());

  session = this.#conversationService.activeSession;
  messages = computed(() => this.session()?.messages ?? []);

  constructor() {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => {
          const el = this.chatAreaRef?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  ngOnInit() {
    this.#apiService.getBooks().subscribe({ next: (data) => this.books.set(data.books) });
  }

  newChat() {
    this.#conversationService.startNewChat();
  }

  submit() {
    const q = this.query.trim();
    if (!q || this.loading()) return;
    this.query = '';

    const ids = this.selectedBookIds().length ? this.selectedBookIds() : undefined;
    const currentSession = this.session();
    let sessionId: string;

    if (!currentSession || currentSession.type !== 'ask') {
      const session = this.#conversationService.buildSession('ask', q);
      this.#conversationService.createSession(session);
      sessionId = session.id;
    } else {
      sessionId = currentSession.id;
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };
    this.#conversationService.appendMessage(sessionId, userMsg);
    this.loading.set(true);

    const history = (this.session()?.messages ?? [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    let sources: SearchResult[] = [];
    let messageAdded = false;
    const llmModelId = this.#llmModelService.selectedModelId() || undefined;

    this.#apiService.streamAsk(q, ids, history, llmModelId).subscribe({
      next: (event) => {
        if (event.type === 'sources') {
          sources = event.sources;
        } else if (event.type === 'token') {
          if (!messageAdded) {
            this.loading.set(false);
            this.#conversationService.appendMessage(sessionId, {
              role: 'assistant',
              content: event.content,
              timestamp: new Date().toISOString(),
            });
            messageAdded = true;
          } else {
            this.#conversationService.appendToken(sessionId, event.content);
          }
        } else if (event.type === 'error') {
          this.loading.set(false);
          this.#conversationService.appendMessage(sessionId, {
            role: 'assistant',
            content: 'Erreur lors de la génération de la réponse.',
            timestamp: new Date().toISOString(),
          });
        }
      },
      complete: () => {
        if (!messageAdded) {
          this.loading.set(false);
          this.#conversationService.appendMessage(sessionId, {
            role: 'assistant',
            content: sources.length
              ? "Le modèle n'a pas généré de réponse. Essaie à nouveau."
              : 'Aucun passage pertinent trouvé dans tes livres.',
            sources,
            timestamp: new Date().toISOString(),
          });
        } else if (sources.length) {
          this.#conversationService.updateLastMessage(sessionId, { sources });
        }
        this.#apiService.updateSession(sessionId, { messages: this.session()?.messages }).subscribe();
      },
      error: () => {
        this.loading.set(false);
        if (!messageAdded) {
          this.#conversationService.appendMessage(sessionId, {
            role: 'assistant',
            content: 'Erreur lors de la génération de la réponse.',
            timestamp: new Date().toISOString(),
          });
        }
      },
    });
  }

  scrollToBottom() {
    const el = this.chatAreaRef?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  isSourcesExpanded(msgIdx: number): boolean {
    return this.openSourcesAt().has(msgIdx);
  }

  toggleSources(msgIdx: number) {
    this.openSourcesAt.update(set => {
      const next = new Set(set);
      next.has(msgIdx) ? next.delete(msgIdx) : next.add(msgIdx);
      return next;
    });
    // reset "show all" when closing
    if (!this.openSourcesAt().has(msgIdx)) {
      this.allSourcesAt.update(s => { const n = new Set(s); n.delete(msgIdx); return n; });
    }
  }

  isAllSourcesShown(msgIdx: number): boolean {
    return this.allSourcesAt().has(msgIdx);
  }

  toggleAllSources(msgIdx: number) {
    this.allSourcesAt.update(set => {
      const next = new Set(set);
      next.has(msgIdx) ? next.delete(msgIdx) : next.add(msgIdx);
      return next;
    });
  }

  scoreClass(score: number): string {
    return score >= 0.9 ? 'high' : 'mid';
  }

  scoreLabel(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  fileTypeLabel(fileType: string): string {
    return fileType?.toUpperCase() ?? 'EPUB';
  }
}
