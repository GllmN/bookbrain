import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { coreProviders } from './core/core.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    ...coreProviders,
  ],
};
