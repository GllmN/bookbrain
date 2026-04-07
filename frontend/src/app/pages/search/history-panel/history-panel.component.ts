import { Component, input, output, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HistorySession } from '../../../models/types';

interface SessionGroup {
  label: string;
  sessions: HistorySession[];
}

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="panel" [class.collapsed]="collapsed()">
      <div class="panel-header">
        @if (!collapsed()) {
          <span class="panel-title">History</span>
        }
        <button mat-icon-button
          (click)="collapsed.set(!collapsed())"
          [matTooltip]="collapsed() ? 'Open history' : 'Close history'">
          <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
        </button>
      </div>

      @if (!collapsed()) {
        <button mat-stroked-button class="new-btn" (click)="newChat.emit()">
          <ng-container>
            <mat-icon>add</mat-icon>
            New
          </ng-container>
        </button>

        <div class="sessions-list">
          @for (group of groups(); track group.label) {
            <p class="group-label">{{ group.label }}</p>
            @for (session of group.sessions; track session.id) {
              <button
                class="session-item"
                [class.active]="session.id === activeId()"
                (click)="sessionSelected.emit(session.id)">
                <mat-icon class="session-icon">
                  {{ session.type === 'ask' ? 'chat_bubble_outline' : 'search' }}
                </mat-icon>
                <span class="session-title">{{ session.title }}</span>
              </button>
            }
          }

          @if (sessions().length === 0) {
            <p class="empty-hint">No history yet</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-shrink: 0; }

    .panel {
      display: flex;
      flex-direction: column;
      width: 240px;
      height: 100%;
      background: var(--mat-sys-surface-container-low);
      border-right: 1px solid var(--mat-sys-outline-variant);
      transition: width 0.2s ease;
      overflow: hidden;

      &.collapsed { width: 56px; }
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      min-height: 52px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .panel-title {
      font-size: 0.875rem;
      font-weight: 500;
      padding-left: 4px;
      white-space: nowrap;
      overflow: hidden;
    }

    .new-btn {
      margin: 10px 12px 6px;
      flex-shrink: 0;
    }

    .sessions-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px 16px;
    }

    .group-label {
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--mat-sys-outline);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 12px 4px 4px;
      margin: 0;
    }

    .session-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      color: var(--mat-sys-on-surface);
      transition: background 0.1s;

      &:hover { background: var(--mat-sys-surface-container); }

      &.active {
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
      }
    }

    .session-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--mat-sys-outline);
    }

    .session-title {
      font-size: 0.8125rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .empty-hint {
      font-size: 0.8rem;
      color: var(--mat-sys-outline);
      text-align: center;
      padding: 24px 8px;
      margin: 0;
    }
  `],
})
export class HistoryPanelComponent {
  sessions = input<HistorySession[]>([]);
  activeId = input<string | null>(null);

  sessionSelected = output<string>();
  newChat = output<void>();

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
