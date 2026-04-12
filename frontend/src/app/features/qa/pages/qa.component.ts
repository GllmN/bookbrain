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
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ConversationService } from '../../../core/services/conversation.service';
import { ModelService } from '../../../core/services/model.service';
import { ApiService } from '../../../core/services/api.service';
import { Book, ChatMessage, SearchResult } from '../../../core/models/types';

@Component({
  selector: 'app-qa',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, SlicePipe],
  templateUrl: './qa.component.html',
  styleUrl: './qa.component.scss',
})
export class QaComponent implements OnInit {
  @ViewChild('chatArea') chatAreaRef!: ElementRef<HTMLDivElement>;

  readonly #conversationService = inject(ConversationService);
  readonly #modelService = inject(ModelService);
  readonly #apiService = inject(ApiService);

  books = signal<Book[]>([]);
  selectedBookIds = signal<string[]>([]);
  loading = signal(false);
  query = '';

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

  toggleBook(id: string) {
    const current = this.selectedBookIds();
    this.selectedBookIds.set(
      current.includes(id) ? current.filter(b => b !== id) : [...current, id]
    );
  }

  isBookSelected(id: string) {
    return this.selectedBookIds().includes(id);
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
    const model = this.#modelService.selectedModelId() || undefined;

    this.#apiService.streamAsk(q, ids, history, model).subscribe({
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
