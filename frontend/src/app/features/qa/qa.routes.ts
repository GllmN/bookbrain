import { Routes } from '@angular/router';

export const qaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/qa.component').then((m) => m.QaComponent),
  },
];
