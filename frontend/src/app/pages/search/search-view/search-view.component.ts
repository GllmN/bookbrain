import { Component, input, output, linkedSignal, computed, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { Book, ChatMessage, HistorySession, SearchResult } from '../../../models/types';

@Component({
  selector: 'app-search-view',
  standalone: true,
  imports: [
    SlicePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  templateUrl: './search-view.component.html',
  styleUrl: './search-view.component.scss',
})
export class SearchViewComponent {
  @ViewChild('contentArea') contentArea!: ElementRef<HTMLDivElement>;

  session = input<HistorySession | null>(null);
  books = input<Book[]>([]);
  loading = input(false);

  submitted = output<{ query: string; bookIds: string[]; mode: 'ask' | 'search' }>();

  // linkedSignal: se met à jour automatiquement quand session change,
  // mais reste modifiable manuellement via le toggle
  mode = linkedSignal<'ask' | 'search'>(() => this.session()?.type ?? 'ask');
  query = '';
  selectedBookIds = signal<string[]>([]);

  messages = computed<ChatMessage[]>(() => this.session()?.messages ?? []);
  searchResults = computed<SearchResult[]>(() => this.session()?.searchResults ?? []);
  searchTook = computed<number>(() => this.session()?.searchTook ?? 0);

  constructor() {
    // Auto-scroll vers le bas quand de nouveaux messages arrivent
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0 && this.mode() === 'ask') {
        setTimeout(() => {
          const el = this.contentArea?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  toggleBook(id: string, selected: boolean) {
    const current = this.selectedBookIds();
    this.selectedBookIds.set(
      selected ? [...current, id] : current.filter(b => b !== id)
    );
  }

  submit() {
    const q = this.query.trim();
    if (!q || this.loading()) return;
    this.query = '';
    this.submitted.emit({ query: q, bookIds: this.selectedBookIds(), mode: this.mode() });
  }
}
