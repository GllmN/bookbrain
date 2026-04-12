import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { ConversationService } from './services/conversation.service';
import { ModelService } from './services/model.service';
import { ApiService } from './services/api.service';
import { ModelPickerComponent } from './components/model-picker/model-picker.component';
import { HistorySession } from './models/types';

interface SessionGroup {
  label: string;
  sessions: HistorySession[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, DecimalPipe, SlicePipe, ModelPickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly conv = inject(ConversationService);
  readonly modelService = inject(ModelService);
  private readonly api = inject(ApiService);

  sessions = this.conv.sessions;
  activeSessionId = this.conv.activeSessionId;

  historyFilter = signal('');
  isDark = signal(true);
  totalChunks = signal(0);
  showModelPicker = signal(false);

  filteredGroups = computed<SessionGroup[]>(() => {
    const filter = this.historyFilter().toLowerCase();
    const list = filter
      ? this.sessions().filter(s => s.title.toLowerCase().includes(filter))
      : this.sessions();
    return this.groupSessions(list);
  });

  ngOnInit() {
    this.conv.loadSessions();
    this.modelService.loadModels();
    this.api.getBooks().subscribe({
      next: (data) => this.totalChunks.set(data.totalChunks),
    });
  }

  toggleTheme() {
    this.isDark.update(d => !d);
    document.body.classList.toggle('light', !this.isDark());
  }

  toggleModelPicker() {
    this.showModelPicker.update(v => !v);
  }

  selectSession(id: string) {
    this.conv.selectSession(id);
  }

  deleteSession(id: string, event: Event) {
    event.stopPropagation();
    this.conv.deleteSession(id);
  }

  newChat() {
    this.conv.startNewChat();
  }

  clearHistory() {
    this.conv.clearHistory();
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
