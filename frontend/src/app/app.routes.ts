import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'qa',
    pathMatch: 'full',
  },
  {
    path: 'qa',
    loadComponent: () =>
      import('./pages/qa/qa.component').then((m) => m.QaComponent),
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
