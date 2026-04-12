import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-chat-question',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bubble">{{ content() }}</div>`,
  styles: [`
    :host {
      display: flex;
      justify-content: flex-end;
    }
    .bubble {
      background: var(--user-bubble);
      border-radius: 16px 16px 4px 16px;
      padding: 12px 16px;
      max-width: 75%;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text);
    }
  `],
})
export class ChatQuestionComponent {
  content = input.required<string>();
}
