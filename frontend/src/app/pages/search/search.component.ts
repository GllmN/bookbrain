import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ConversationService } from '../../services/conversation.service';
import { Book, SearchResult } from '../../models/types';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, SlicePipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly conv = inject(ConversationService);

  books = signal<Book[]>([]);
  selectedBookIds = signal<string[]>([]);
  results = signal<SearchResult[]>([]);
  searchTook = signal(0);
  loading = signal(false);
  query = '';
  lastQuery = signal('');

  ngOnInit() {
    this.api.getBooks().subscribe({ next: (data) => this.books.set(data.books) });
  }

  toggleBook(id: string) {
    const current = this.selectedBookIds();
    const next = current.includes(id)
      ? current.filter(b => b !== id)
      : [...current, id];
    this.selectedBookIds.set(next);
  }

  isBookSelected(id: string) {
    return this.selectedBookIds().includes(id);
  }

  submit() {
    const q = this.query.trim();
    if (!q || this.loading()) return;
    this.lastQuery.set(q);

    const ids = this.selectedBookIds().length ? this.selectedBookIds() : undefined;
    this.loading.set(true);
    this.results.set([]);

    this.api.search(q, 15, ids).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.searchTook.set(res.took);
        this.loading.set(false);

        // Persister dans l'historique
        const session = this.conv.buildSession('search', q);
        this.conv.createSession(session);
        this.conv.patchSession(session.id, {
          searchResults: res.results,
          searchTook: res.took,
        });
        this.api.updateSession(session.id, {
          searchResults: res.results,
          searchTook: res.took,
        }).subscribe();
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

  fileTypeClass(fileType: string): string {
    return fileType?.toLowerCase() === 'pdf' ? 'pdf' : 'epub';
  }

  fileTypeLabel(fileType: string): string {
    return fileType?.toUpperCase() ?? 'EP';
  }
}
