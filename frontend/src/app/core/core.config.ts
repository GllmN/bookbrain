import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

/**
 * Core providers — singleton infrastructure (HTTP, animations, guards, interceptors).
 * Imported by app.config.ts.
 */
export const coreProviders = [
  provideHttpClient(),
  provideAnimationsAsync(),
];
