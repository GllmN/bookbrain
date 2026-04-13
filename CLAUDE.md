# CLAUDE.md — BookBrain

BookBrain est une app RAG locale : indexation d'ebooks (EPUB/PDF) + recherche sémantique + Q&A.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 21+, standalone components, signals, OnPush |
| Backend API | Node.js 20+ / Express / TypeScript strict, port 3000 |
| Ingestion | Python 3.11+ scripts |
| LLM | Ollama (local) ou Claude API — variable `LLM_PROVIDER` |
| Vector DB | ChromaDB persistent (`./chroma_db/`) |
| Metadata DB | SQLite via better-sqlite3 (`./bookbrain.db`) |
| Tests front | Jest + jest-preset-angular 16 |
| Tests back | Vitest |

## Démarrage rapide

```bash
# Services Docker (ChromaDB)
docker compose up -d

# Backend
cd backend && npm run dev          # port 3000

# Frontend
cd frontend && ng serve            # port 4200

# Indexation
cd backend && npm run ingest
```

## Règles absolues

- Ne jamais committer `.env`, `report.*.json`, `*.heapsnapshot`, `*.heapdump`
- Backend : ESM uniquement — imports avec extension `.js`
- Frontend : standalone components, signals, `@if`/`@for` (pas `*ngIf`/`*ngFor`)
- Réponse API toujours : `{ success: boolean, data?: T, error?: string }`
- Valider les requêtes entrantes avec Zod côté backend

## Sous-CLAUDE.md

- `frontend/CLAUDE.md` — conventions Angular détaillées, design system, testing Jest
- `backend/CLAUDE.md` — conventions TypeScript, Python pipeline, env variables

## Sécurité

- Secrets uniquement via `process.env` (jamais hardcodés)
- `ANTHROPIC_API_KEY` → `backend/src/config/index.ts` via env
- Voir `.gitignore` pour la liste des fichiers exclus
