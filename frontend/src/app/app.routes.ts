import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'search',
    pathMatch: 'full',
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./pages/library/library.component').then((m) => m.LibraryComponent),
  },
];
