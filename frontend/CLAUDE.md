# CLAUDE.md — Frontend

## Stack
- Angular 21+ (standalone components, signals, new control flow)
- Angular Material (fonctionnalité uniquement — theming custom via CSS variables)
- TypeScript strict mode
- Police : Plus Jakarta Sans
- Design system : CSS custom properties (dark/light, pas de Material M3 visible)

## Commands
```bash
ng serve                # Dev server (port 4200)
ng build                # Production build
ng test                 # Unit tests (Karma)
ng generate component   # Scaffold component
```

## Architecture — feature-based

```
src/
├── app/
│   ├── core/                        # Singletons globaux, infrastructure
│   │   ├── guards/                  # Route guards (auth, etc.)
│   │   ├── interceptors/            # HTTP interceptors
│   │   ├── models/
│   │   │   └── types.ts             # Interfaces partagées (miroir backend)
│   │   ├── services/
│   │   │   ├── api.service.ts       # Tous les appels HTTP → backend
│   │   │   ├── conversation.service.ts  # État sessions/historique
│   │   │   └── model.service.ts     # Sélection modèle LLM
│   │   └── core.config.ts           # provideHttpClient, provideAnimations
│   │
│   ├── shared/                      # Composants/pipes/directives réutilisables
│   │   ├── components/
│   │   │   └── model-picker/        # Dialog sélection modèle
│   │   ├── directives/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── features/                    # Une feature = un domaine métier
│   │   ├── qa/
│   │   │   ├── pages/               # QaComponent (chat RAG)
│   │   │   └── qa.routes.ts
│   │   ├── search/
│   │   │   ├── pages/               # SearchComponent (recherche sémantique)
│   │   │   └── search.routes.ts
│   │   └── library/
│   │       ├── pages/               # LibraryComponent (gestion livres)
│   │       └── library.routes.ts
│   │
│   ├── layout/                      # Shell de l'application
│   │   ├── sidebar/                 # SidebarComponent (historique, modèle, thème)
│   │   └── layout.component.ts      # Wrapper sidebar + <router-outlet>
│   │
│   ├── app.component.ts             # Root minimal : <router-outlet> uniquement
│   ├── app.config.ts                # ApplicationConfig → provideRouter + coreProviders
│   └── app.routes.ts                # Route racine → LayoutComponent (children lazy)
│
├── environments/
│   ├── environment.ts               # { production: false, apiUrl: 'http://localhost:3000' }
│   └── environment.prod.ts
│
└── styles/
    ├── _variables.scss              # Tokens CSS dark/light (--accent, --card, --border…)
    ├── _mixins.scss                 # SCSS mixins (flex-center, card-hover-glow, text-clamp…)
    └── global.scss                  # Entry point : Material theme + imports variables/mixins
```

## Conventions Angular

- **Standalone components uniquement** — pas de NgModules
- **Signals** (`signal()`, `computed()`, `effect()`) — pas de BehaviorSubject
- **Nouveau control flow** : `@if`, `@for`, `@switch` — jamais `*ngIf`/`*ngFor`
- **inject()** avec champs privés ES2022 — syntaxe obligatoire :
  ```typescript
  readonly #api = inject(ApiService);       // privé, non accessible depuis le template
  readonly modelService = inject(ModelService); // public si besoin dans le template
  ```
  Pas d'injection constructeur, pas de `private readonly` classique
- **Lazy loading** :
  - Features : `loadChildren` → `feature.routes.ts`
  - Layout : `loadComponent` → `LayoutComponent`
- **Template inline** pour les composants < ~30 lignes de template ; `.html` séparé au-delà
- **OnPush** change detection par défaut (configuré dans `angular.json` schematics)

## Routing pattern

```typescript
// app.routes.ts — layout comme wrapper
{
  path: '',
  loadComponent: () => import('./layout/layout.component'),
  children: [
    { path: 'qa',      loadChildren: () => import('./features/qa/qa.routes') },
    { path: 'search',  loadChildren: () => import('./features/search/search.routes') },
    { path: 'library', loadChildren: () => import('./features/library/library.routes') },
  ]
}

// features/qa/qa.routes.ts
export const qaRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/qa.component') }
];
```

## Design system

- **Tokens** dans `styles/_variables.scss` — ne jamais hardcoder de couleurs dans les composants
- **Dark (défaut) / Light** — togglé via `document.body.classList.toggle('light')`
- **Pas de classes Material visibles** — Angular Material utilisé pour la fonctionnalité (MatSnackBar, MatDialog) ; le visuel est custom CSS
- **Composant-scoped SCSS** — chaque composant a son `.scss` ; pas de classes globales utilitaires
- **Mixins disponibles** : `flex-center`, `flex-column`, `text-truncate`, `text-clamp($n)`, `card-hover-glow`

## Services core

| Service | Rôle |
|---|---|
| `ApiService` | Tous les appels HTTP, base URL depuis `environment.apiUrl` |
| `ConversationService` | Sessions historique, `sessions` signal, `activeSession` computed |
| `ModelService` | Modèles LLM disponibles, `selectedModelId` signal |

- `providedIn: 'root'` — singletons dans toute l'app
- Erreurs HTTP → `mat-snack-bar` dans les composants, pas dans les services

## Angular Material — usage limité

Utiliser uniquement pour la **fonctionnalité**, pas le visuel :
- `MatSnackBar` — notifications/toasts
- `MatDialog` — modales de confirmation (si nécessaire)
- Ne pas utiliser : `mat-card`, `mat-toolbar`, `mat-sidenav`, `mat-chip` pour le layout

## API communication

- Tous les appels passent par `ApiService` (`core/services/api.service.ts`)
- URL de base : `environment.apiUrl + '/api'`
- Typage : interfaces dans `core/models/types.ts`

## Ajouter une nouvelle feature

1. Créer `features/<nom>/pages/<nom>.component.ts`
2. Créer `features/<nom>/<nom>.routes.ts`
3. Ajouter la route dans `app.routes.ts` (children du layout)
4. Si services métier spécifiques : `features/<nom>/services/`
5. Si composants réutilisables cross-features : `shared/components/`

## Testing

- Framework : Karma + Jasmine
- Fichiers : `*.spec.ts` à côté du composant
- Mock `ApiService` avec `jasmine.createSpyObj`
