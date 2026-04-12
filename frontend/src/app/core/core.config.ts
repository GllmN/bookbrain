import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

/**
 * Core providers — singleton infrastructure (HTTP, animations, guards, interceptors).
 * Imported by app.config.ts.
 */
export const coreProviders = [
  provideHttpClient(),
  provideAnimations(),
];
