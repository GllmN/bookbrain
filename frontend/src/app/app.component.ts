import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span style="font-weight: 600; letter-spacing: 0.05em;">BookBrain</span>
      <span style="font-size: 0.7em; margin-left: 8px; opacity: 0.6;">RAG</span>
      <span style="flex: 1;"></span>
      <a mat-button routerLink="/search" routerLinkActive="active-link">
        Search
      </a>
      <a mat-button routerLink="/library" routerLinkActive="active-link">
        Library
      </a>
    </mat-toolbar>

    <div class="page-container">
      <router-outlet />
    </div>
  `,
  styles: [`
    .active-link { opacity: 1; font-weight: 500; }
    a[mat-button] { opacity: 0.75; }
    .page-container { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  `],
})
export class AppComponent {}
