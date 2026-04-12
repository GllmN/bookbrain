import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="main-nav">
      <a class="nav-item" routerLink="/search" routerLinkActive="active">Recherche</a>
      <a class="nav-item" routerLink="/qa"     routerLinkActive="active">Q&amp;R</a>
      <a class="nav-item" routerLink="/library" routerLinkActive="active">Bibliothèque</a>
    </nav>
  `,
  styleUrl: './nav-bar.component.scss',
})
export class NavBarComponent {}
