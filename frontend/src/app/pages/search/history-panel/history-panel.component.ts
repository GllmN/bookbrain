import { Component, input, output, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HistorySession } from '../../../models/types';

export interface SessionGroup {
  label: string;
  sessions: HistorySession[];
}

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './history-panel.component.html',
  styleUrl: './history-panel.component.scss',
})
export class HistoryPanelComponent {
  sessions = input<HistorySession[]>([]);
  activeId = input<string | null>(null);

  sessionSelected = output<string>();
  sessionDeleted = output<string>();
  newChat = output<void>();
  clearAll = output<void>();

  collapsed = signal(false);

  groups = computed<SessionGroup[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayGroup: SessionGroup = { label: 'Today', sessions: [] };
    const yesterdayGroup: SessionGroup = { label: 'Yesterday', sessions: [] };
    const weekGroup: SessionGroup = { label: 'This week', sessions: [] };
    const olderGroup: SessionGroup = { label: 'Older', sessions: [] };

    for (const session of this.sessions()) {
      const d = new Date(session.createdAt);
      if (d >= today) todayGroup.sessions.push(session);
      else if (d >= yesterday) yesterdayGroup.sessions.push(session);
      else if (d >= weekAgo) weekGroup.sessions.push(session);
      else olderGroup.sessions.push(session);
    }

    return [todayGroup, yesterdayGroup, weekGroup, olderGroup]
      .filter(g => g.sessions.length > 0);
  });
}
