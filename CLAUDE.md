# CLAUDE.md — BookBrain

## What is this project?
BookBrain is a local RAG (Retrieval-Augmented Generation) app that indexes a personal ebook library (EPUBs, PDFs) and allows semantic search + Q&A over the content.

## Architecture overview
- **Frontend**: Angular 21+ — feature-based, design system custom (port 4200)
- **Backend API**: Node.js + Express + TypeScript (port 3000)
- **Ingestion pipeline**: Python 3.11+ scripts
- **LLM**: Ollama (local) ou Claude API (remote)
- **Vector DB**: ChromaDB (persistent, local in `./chroma_db/`)
- **Metadata DB**: SQLite via better-sqlite3 (`./bookbrain.db`)

## Project structure
```
bookbrain/
├── backend/          # Node.js API + scripts Python d'ingestion
├── frontend/         # Angular app (voir frontend/CLAUDE.md pour le détail)
├── library/          # Livres de l'utilisateur (gitignored)
├── chroma_db/        # Index vectoriel ChromaDB (gitignored)
├── bookbrain.db      # SQLite métadonnées + historique (gitignored)
└── docker-compose.yml
```

## Frontend — architecture feature-based

```
frontend/src/
├── app/
│   ├── core/            # Singletons : services, models, guards, interceptors
│   ├── shared/          # Composants/pipes/directives réutilisables cross-features
│   ├── features/        # Un dossier par domaine métier (qa/, search/, library/)
│   ├── layout/          # Shell : LayoutComponent + SidebarComponent
│   ├── app.component.ts # Root minimal — <router-outlet> uniquement
│   ├── app.config.ts    # ApplicationConfig
│   └── app.routes.ts    # Layout wrapper + children lazy par feature
├── environments/        # environment.ts / environment.prod.ts
└── styles/              # _variables.scss, _mixins.scss, global.scss
```

Voir `frontend/CLAUDE.md` pour les conventions détaillées.

## Backend — structure
```
backend/
├── src/
│   ├── routes/          # Express routes (books, search, ask, history, ingest, models)
│   ├── services/        # Logique métier (chromadb, ollama/claude, sqlite)
│   ├── middleware/      # Error handling, validation
│   └── index.ts         # Entry point Express
├── scripts/             # Python ingestion scripts
└── tsconfig.json
```

## Gitignore — fichiers exclus
| Fichier/Dossier | Raison |
|---|---|
| `library/` | Livres personnels |
| `chroma_db/` | Index vectoriel auto-généré |
| `bookbrain.db` | Base SQLite locale |
| `bookbrain.db-wal` | Journal WAL SQLite temporaire |
| `bookbrain.db-shm` | Mémoire partagée SQLite temporaire |
| `node_modules/`, `venv/` | Dépendances |
| `.env` | Secrets (clés API) |
