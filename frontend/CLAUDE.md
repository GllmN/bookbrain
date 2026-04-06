# CLAUDE.md — Frontend

## Stack
- Angular 17+ (standalone components, signals, new control flow)
- Angular Material (UI components + theming)
- TypeScript strict mode

## Commands
```bash
ng serve                # Dev server (port 4200)
ng build                # Production build
ng test                 # Unit tests (Karma)
ng generate component   # Scaffold component
```

## Angular conventions
- Standalone components only (no NgModules)
- Use signals (`signal()`, `computed()`) over BehaviorSubject when possible
- New control flow: `@if`, `@for`, `@switch` — not *ngIf/*ngFor
- Lazy-loaded routes via `loadComponent`
- inject() function over constructor injection
- Component files: `name.component.ts` (template inline for small components, separate .html for large ones)
- Styles: Angular Material theming + component-scoped SCSS, no global utility classes

## Angular Material usage
- Import individual modules: `import { MatButtonModule } from '@angular/material/button'`
- Use the Material theming system with a custom theme (see styles.scss)
- Prefer Material components: mat-form-field, mat-input, mat-card, mat-chip, mat-progress-bar, mat-toolbar, mat-sidenav, mat-icon, mat-button
- Use mat-snack-bar for notifications/toasts
- Use mat-dialog for confirmations
- Icons: mat-icon with Material Symbols font

## File organization
```
src/
├── app/
│   ├── app.component.ts        # Root + navigation (mat-sidenav or mat-toolbar)
│   ├── app.config.ts            # Providers
│   ├── app.routes.ts            # Lazy routes
│   ├── models/
│   │   └── types.ts             # Interfaces (mirror of backend types)
│   ├── services/
│   │   └── api.service.ts       # HttpClient calls to backend
│   ├── components/              # Shared/reusable components
│   │   ├── search-bar/
│   │   ├── result-card/
│   │   └── book-chip/
│   └── pages/
│       ├── search/              # Q&A + semantic search page
│       └── library/             # Book management page
├── styles.scss                  # Angular Material theme + global styles
├── index.html
└── main.ts
```

## API communication
- All API calls go through ApiService (services/api.service.ts)
- Base URL: http://localhost:3000/api
- Handle errors with catchError in service, show mat-snack-bar in components
- Use interfaces from models/types.ts for type safety

## Theming
- Custom Angular Material theme in styles.scss
- Dark mode: use Material's prebuilt dark theme or custom palette
- Color palette: define primary, accent, warn in the theme
- Typography: use Material's typography system

## Component guidelines
- Small components (< 50 lines template): inline template in .ts
- Large components: separate .html + .scss files
- One component per feature (search-bar, result-card, etc.)
- Use OnPush change detection with signals

## Testing
- Framework: Karma + Jasmine (Angular default)
- Test files: `*.spec.ts` next to components
- Mock ApiService with jasmine.createSpyObj
