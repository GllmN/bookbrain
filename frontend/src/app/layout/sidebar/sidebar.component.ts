import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ConversationService } from '../../core/services/conversation.service';
import { ApiService } from '../../core/services/api.service';
import { IngestService } from '../../core/services/ingest.service';
import { HistorySession } from '../../core/models/types';

export interface SessionGroup {
  label: string;
  sessions: HistorySession[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule, DecimalPipe, SlicePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  readonly #conversationService = inject(ConversationService);
  readonly #apiService = inject(ApiService);
  readonly #destroyRef = inject(DestroyRef);
  readonly ingestService = inject(IngestService);

  sessions = this.#conversationService.sessions;
  activeSessionId = this.#conversationService.activeSessionId;

  historyFilter = signal('');
  isDark = signal(true);
  totalChunks = signal(0);

  filteredGroups = computed<SessionGroup[]>(() => {
    const filter = this.historyFilter().toLowerCase();
    const list = filter
      ? this.sessions().filter(s => s.title.toLowerCase().includes(filter))
      : this.sessions();
    return this.groupSessions(list);
  });

  ngOnInit() {
    this.#loadStats();
    // Refresh chunk count after each ingest run
    this.ingestService.onComplete
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadStats());
  }

  #loadStats() {
    this.#apiService.getBooks().subscribe({
      next: (data) => this.totalChunks.set(data.totalChunks),
    });
  }

  toggleTheme() {
    this.isDark.update(d => !d);
    document.body.classList.toggle('light', !this.isDark());
  }

  selectSession(id: string) {
    this.#conversationService.selectSession(id);
  }

  deleteSession(id: string, event: Event) {
    event.stopPropagation();
    this.#conversationService.deleteSession(id);
  }

  newChat() {
    this.#conversationService.startNewChat();
  }

  clearHistory() {
    this.#conversationService.clearHistory();
  }

  private groupSessions(sessions: HistorySession[]): SessionGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: SessionGroup[] = [
      { label: 'Today', sessions: [] },
      { label: 'Yesterday', sessions: [] },
      { label: 'This week', sessions: [] },
      { label: 'Older', sessions: [] },
    ];

    for (const s of sessions) {
      const d = new Date(s.createdAt);
      if (d >= today) groups[0].sessions.push(s);
      else if (d >= yesterday) groups[1].sessions.push(s);
      else if (d >= weekAgo) groups[2].sessions.push(s);
      else groups[3].sessions.push(s);
    }

    return groups.filter(g => g.sessions.length > 0);
  }
}
