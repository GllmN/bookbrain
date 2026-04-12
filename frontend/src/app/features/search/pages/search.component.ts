import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ConversationService } from '../../../core/services/conversation.service';
import { Book, SearchResult } from '../../../core/models/types';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { HeaderFiltersComponent } from '../../../shared/components/header-filters/header-filters.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [HeaderComponent, HeaderFiltersComponent, FormsModule, SlicePipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  readonly #apiService = inject(ApiService);
  readonly #conversationService = inject(ConversationService);

  books = signal<Book[]>([]);
  selectedBookIds = signal<string[]>([]);
  results = signal<SearchResult[]>([]);
  searchTook = signal(0);
  loading = signal(false);
  query = '';
  lastQuery = signal('');

  ngOnInit() {
    this.#apiService.getBooks().subscribe({ next: (data) => this.books.set(data.books) });
  }

  submit() {
    const q = this.query.trim();
    if (!q || this.loading()) return;
    this.lastQuery.set(q);

    const ids = this.selectedBookIds().length ? this.selectedBookIds() : undefined;
    this.loading.set(true);
    this.results.set([]);

    this.#apiService.search(q, 15, ids).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.searchTook.set(res.took);
        this.loading.set(false);

        const session = this.#conversationService.buildSession('search', q);
        this.#conversationService.createSession(session);
        this.#conversationService.patchSession(session.id, { searchResults: res.results, searchTook: res.took });
        this.#apiService.updateSession(session.id, { searchResults: res.results, searchTook: res.took }).subscribe();
      },
      error: () => this.loading.set(false),
    });
  }

  scoreClass(score: number): string {
    return score >= 0.9 ? 'high' : score >= 0.75 ? 'mid' : 'low';
  }

  scoreLabel(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }
}
