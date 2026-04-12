import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ChatMessage } from '../../../../core/models/types';

@Component({
  selector: 'app-chat-response',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-response.component.html',
  styleUrl: './chat-response.component.scss',
})
export class ChatResponseComponent {
  message = input<ChatMessage | null>(null);
  loading = input(false);

  sourcesOpen = signal(false);
  allSourcesShown = signal(false);

  toggleSources() {
    this.sourcesOpen.update(v => !v);
    if (!this.sourcesOpen()) this.allSourcesShown.set(false);
  }

  toggleAllSources() {
    this.allSourcesShown.update(v => !v);
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
