# CLAUDE.md — Frontend

## Stack
- Angular 21+, standalone, signals, OnPush
- Angular Material (fonctionnel uniquement — pas de theming Material)
- TypeScript strict, locale `fr-FR`, police Plus Jakarta Sans

## Commands
```bash
ng serve                # Dev server (port 4200)
ng build                # Production build
npm test                # Jest
npm run test:watch      # Watch mode
npm run test:coverage   # Rapport couverture
```

## Architecture
```
src/app/
├── core/
│   ├── models/types.ts          # Interfaces partagées (miroir backend)
│   └── services/
│       ├── api.service.ts       # Tous les appels HTTP
│       ├── conversation.service.ts
│       └── llm-model.service.ts
├── shared/components/
│   ├── header/                  # nav-bar/, header-filters/, confirm-dialog/
│   └── sidebar/
├── features/
│   ├── qa/          # Chat RAG — pages/, components/, qa.routes.ts
│   ├── search/      # Recherche sémantique
│   └── library/     # Gestion livres
├── app.component.ts             # Shell : sidebar + <router-outlet>
├── app.config.ts                # ApplicationConfig
└── app.routes.ts                # Lazy routes par feature
```

## Design system

Tokens dans `styles/_variables.scss` — ne jamais hardcoder de couleurs.

- **Couleurs** : `--accent`, `--accent-hover`, `--on-accent`, `--red`, `--text`, `--text-secondary`
- **Surfaces** : `--bg`, `--card`, `--card-hover`, `--surface`, `--sidebar-bg`
- **Ombres** : `--shadow-sm`, `--shadow-md`, `--shadow-overlay`
- **Mixins** : `flex-center`, `flex-column`, `text-truncate`, `text-clamp($n)`, `card-hover-glow`
- Dark (défaut) / Light → `document.body.classList.toggle('light')`

## Ajouter une feature

1. `features/<nom>/pages/<nom>.component.ts`
2. `features/<nom>/<nom>.routes.ts`
3. Ajouter la route lazy dans `app.routes.ts`
4. Services métier spécifiques → `features/<nom>/services/`
5. Composants cross-features → `shared/components/`
