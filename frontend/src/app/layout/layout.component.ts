import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConversationService } from '../core/services/conversation.service';
import { ModelService } from '../core/services/model.service';
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
  private readonly conv = inject(ConversationService);
  private readonly modelService = inject(ModelService);

  ngOnInit() {
    this.conv.loadSessions();
    this.modelService.loadModels();
  }
}
