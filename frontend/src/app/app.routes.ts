import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'qa', pathMatch: 'full' },
      {
        path: 'qa',
        loadChildren: () =>
          import('./features/qa/qa.routes').then((m) => m.qaRoutes),
      },
      {
        path: 'search',
        loadChildren: () =>
          import('./features/search/search.routes').then((m) => m.searchRoutes),
      },
      {
        path: 'library',
        loadChildren: () =>
          import('./features/library/library.routes').then((m) => m.libraryRoutes),
      },
    ],
  },
];
