import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { ConversationService } from '../../../core/services/conversation.service';
import { LlmModelService } from '../../../core/services/llm-model.service';
import { ApiService } from '../../../core/services/api.service';
import { AskStreamEvent, Book, ChatMessage, SearchResult } from '../../../core/models/types';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HeaderFiltersComponent } from '../../../shared/components/header-filters/header-filters.component';
import { ChatQuestionComponent } from '../components/chat-question/chat-question.component';
import { ChatResponseComponent } from '../components/chat-response/chat-response.component';
import { ChatAskComponent } from '../components/chat-ask/chat-ask.component';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-qa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    HeaderFiltersComponent,
    ChatQuestionComponent,
    ChatResponseComponent,
    ChatAskComponent,
  ],
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

  scrollToBottom() {
    const el = this.chatAreaRef?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  onSubmit(q: string) {
    if (this.loading()) return;
    const sessionId = this.#resolveSession(q);
    this.#pushUserMessage(sessionId, q);
    this.#streamResponse(q, sessionId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  #resolveSession(q: string): string {
    const current = this.session();
    if (!current || current.type !== 'ask') {
      const session = this.#conversationService.buildSession('ask', q);
      this.#conversationService.createSession(session);
      return session.id;
    }
    return current.id;
  }

  #pushUserMessage(sessionId: string, q: string): void {
    this.#conversationService.appendMessage(sessionId, {
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    });
    this.loading.set(true);
  }

  #buildHistory() {
    return (this.session()?.messages ?? [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  }

  #streamResponse(q: string, sessionId: string): void {
    const ids = this.selectedBookIds().length ? this.selectedBookIds() : undefined;
    const llmModelId = this.#llmModelService.selectedModelId() || undefined;
    const state = { sources: [] as SearchResult[], messageAdded: false };

    this.#apiService.streamAsk(q, ids, this.#buildHistory(), llmModelId).subscribe({
      next:     (event) => this.#onNext(event, sessionId, state),
      complete: ()      => this.#onComplete(sessionId, state),
      error:    ()      => this.#onError(sessionId, state),
    });
  }

  #onNext(
    event: AskStreamEvent,
    sessionId: string,
    state: { sources: SearchResult[]; messageAdded: boolean },
  ): void {
    if (event.type === 'sources') {
      state.sources = event.sources;
    } else if (event.type === 'token') {
      if (!state.messageAdded) {
        this.loading.set(false);
        this.#conversationService.appendMessage(sessionId, {
          role: 'assistant',
          content: event.content,
          timestamp: new Date().toISOString(),
        });
        state.messageAdded = true;
      } else {
        this.#conversationService.appendToken(sessionId, event.content);
      }
    } else if (event.type === 'error') {
      this.loading.set(false);
      this.#appendErrorMessage(sessionId);
    }
  }

  #onComplete(sessionId: string, state: { sources: SearchResult[]; messageAdded: boolean }): void {
    if (!state.messageAdded) {
      this.loading.set(false);
      this.#conversationService.appendMessage(sessionId, {
        role: 'assistant',
        content: state.sources.length
          ? "Le modèle n'a pas généré de réponse. Essaie à nouveau."
          : 'Aucun passage pertinent trouvé dans tes livres.',
        sources: state.sources,
        timestamp: new Date().toISOString(),
      });
    } else if (state.sources.length) {
      this.#conversationService.updateLastMessage(sessionId, { sources: state.sources });
    }
    this.#apiService.updateSession(sessionId, { messages: this.session()?.messages })
      .pipe(catchError(err => { console.error('updateSession failed', err); return EMPTY; }))
      .subscribe();
  }

  #onError(sessionId: string, state: { sources: SearchResult[]; messageAdded: boolean }): void {
    this.loading.set(false);
    if (!state.messageAdded) this.#appendErrorMessage(sessionId);
  }

  #appendErrorMessage(sessionId: string): void {
    this.#conversationService.appendMessage(sessionId, {
      role: 'assistant',
      content: 'Erreur lors de la génération de la réponse.',
      timestamp: new Date().toISOString(),
    });
  }
}
