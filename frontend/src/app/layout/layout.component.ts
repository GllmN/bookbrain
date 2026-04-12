import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConversationService } from '../core/services/conversation.service';
import { LlmModelService } from '../core/services/llm-model.service';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="main">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; width: 100%; height: 100%; }
    .layout { display: flex; width: 100%; height: 100%; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  `],
})
export class LayoutComponent implements OnInit {
  readonly #conversationService = inject(ConversationService);
  readonly #llmModelService = inject(LlmModelService);

  ngOnInit() {
    this.#conversationService.loadSessions();
    this.#llmModelService.loadModels();
  }
}
