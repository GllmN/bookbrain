import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ChatMessage, SearchResult, Book } from '../../models/types';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-950 text-gray-100">
      <!-- Header -->
      <header class="border-b border-gray-800 px-6 py-4">
        <div class="max-w-4xl mx-auto flex items-center gap-3">
          <span class="text-2xl">📚</span>
          <h1 class="text-xl font-semibold tracking-tight">BookBrain</h1>
          <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">RAG</span>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 py-8">
        <!-- Mode Toggle -->
        <div class="flex gap-2 mb-6">
          <button
            (click)="mode.set('ask')"
            [class]="mode() === 'ask' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            💬 Ask (Q&A)
          </button>
          <button
            (click)="mode.set('search')"
            [class]="mode() === 'search' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            🔍 Search
          </button>
        </div>

        <!-- Book Filter -->
        @if (books().length) {
          <div class="mb-4">
            <details class="group">
              <summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-200">
                Filter by books ({{ selectedBookIds().length || 'all' }})
              </summary>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (book of books(); track book.id) {
                  <button
                    (click)="toggleBook(book.id)"
                    [class]="selectedBookIds().includes(book.id)
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'"
                    class="px-3 py-1 text-xs rounded-full border transition-colors">
                    {{ book.title }}
                  </button>
                }
              </div>
            </details>
          </div>
        }

        <!-- Chat Messages (Ask mode) -->
        @if (mode() === 'ask') {
          <div class="space-y-4 mb-6">
            @for (msg of messages(); track $index) {
              <div [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                <div [class]="msg.role === 'user'
                  ? 'bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]'
                  : 'bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]'">
                  <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>

                  <!-- Sources -->
                  @if (msg.sources?.length) {
                    <div class="mt-3 pt-3 border-t border-gray-700/50">
                      <p class="text-xs text-gray-400 mb-1">Sources:</p>
                      @for (src of msg.sources; track src.chunkId) {
                        <div class="text-xs text-gray-500 mb-1">
                          📖 {{ src.bookTitle }} — {{ src.chapter }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            @if (loading()) {
              <div class="flex justify-start">
                <div class="bg-gray-800 rounded-2xl px-4 py-3">
                  <div class="flex gap-1">
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                    <span class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Search Results -->
        @if (mode() === 'search' && searchResults().length) {
          <div class="space-y-3 mb-6">
            <p class="text-xs text-gray-500">
              {{ searchResults().length }} results in {{ searchTook() }}ms
            </p>
            @for (result of searchResults(); track result.chunkId) {
              <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="text-sm font-medium text-indigo-400">{{ result.bookTitle }}</span>
                    <span class="text-xs text-gray-500 ml-2">{{ result.author }}</span>
                  </div>
                  <span class="text-xs text-gray-600 font-mono">{{ (result.score * 100).toFixed(0) }}%</span>
                </div>
                @if (result.chapter) {
                  <p class="text-xs text-gray-500 mb-2">📑 {{ result.chapter }}</p>
                }
                <p class="text-sm text-gray-300 leading-relaxed">{{ result.content | slice:0:400 }}{{ result.content.length > 400 ? '...' : '' }}</p>
              </div>
            }
          </div>
        }

        <!-- Input -->
        <div class="sticky bottom-6">
          <div class="flex gap-3 bg-gray-900 border border-gray-700 rounded-2xl p-2 shadow-2xl">
            <input
              [(ngModel)]="query"
              (keydown.enter)="submit()"
              [placeholder]="mode() === 'ask' ? 'Pose une question sur tes livres...' : 'Recherche sémantique...'"
              class="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 px-3 placeholder-gray-500"
            />
            <button
              (click)="submit()"
              [disabled]="loading() || !query.trim()"
              class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {{ mode() === 'ask' ? 'Ask' : 'Search' }}
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class SearchComponent {
  private readonly api = inject(ApiService);

  mode = signal<'ask' | 'search'>('ask');
  query = '';
  loading = signal(false);
  messages = signal<ChatMessage[]>([]);
  searchResults = signal<SearchResult[]>([]);
  searchTook = signal(0);
  books = signal<Book[]>([]);
  selectedBookIds = signal<string[]>([]);

  constructor() {
    this.loadBooks();
  }

  loadBooks() {
    this.api.getBooks().subscribe({
      next: (data) => this.books.set(data.books),
    });
  }

  toggleBook(id: string) {
    const current = this.selectedBookIds();
    if (current.includes(id)) {
      this.selectedBookIds.set(current.filter((b) => b !== id));
    } else {
      this.selectedBookIds.set([...current, id]);
    }
  }

  submit() {
    const q = this.query.trim();
    if (!q || this.loading()) return;
    this.query = '';

    const bookIds = this.selectedBookIds().length ? this.selectedBookIds() : undefined;

    if (this.mode() === 'search') {
      this.loading.set(true);
      this.api.search(q, 15, bookIds).subscribe({
        next: (res) => {
          this.searchResults.set(res.results);
          this.searchTook.set(res.took);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      // Ask mode — conversational
      const userMsg: ChatMessage = { role: 'user', content: q, timestamp: new Date() };
      this.messages.update((msgs) => [...msgs, userMsg]);
      this.loading.set(true);

      const history = this.messages()
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      this.api.ask(q, bookIds, history).subscribe({
        next: (res) => {
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: res.answer,
            sources: res.sources,
            timestamp: new Date(),
          };
          this.messages.update((msgs) => [...msgs, assistantMsg]);
          this.loading.set(false);
        },
        error: () => {
          this.messages.update((msgs) => [
            ...msgs,
            { role: 'assistant', content: "Erreur lors de la génération de la réponse.", timestamp: new Date() },
          ]);
          this.loading.set(false);
        },
      });
    }
  }
}
