# 📚 BookBrain — Moteur de recherche sémantique pour votre bibliothèque

Un système RAG (Retrieval-Augmented Generation) local et privé qui transforme votre collection d'ebooks en une base de connaissance interrogeable.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Angular Frontend                   │
│      Recherche / Q&R / Bibliothèque (port 4200)      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────┐
│                 Node.js API Gateway                   │
│           Express + TypeScript (port 3000)            │
│  • /api/search        — recherche sémantique          │
│  • /api/ask           — Q&R RAG (stream SSE)          │
│  • /api/books         — CRUD livres                   │
│  • /api/history       — sessions & historique         │
│  • /api/ingest        — déclenchement indexation      │
│  • /api/models        — modèles LLM disponibles       │
└──────┬───────────────────────────────┬──────────────┘
       │ HTTP                          │ child_process
┌──────▼──────────┐           ┌────────▼─────────────┐
│  Ollama / Claude │           │   Python Pipeline     │
│   LLM Server     │           │  • Extraction PDF/EPUB│
│  (port 11434)    │           │  • Chunking ~500 tokens│
│                  │           │  • Embeddings          │
│                  │           │  • Stockage ChromaDB   │
└─────────────────┘           └────────┬─────────────┘
                                       │
                              ┌────────▼─────────────┐
                              │     ChromaDB           │
                              │  Vector Store (local)  │
                              └────────────────────────┘
```

## Stack

| Couche      | Technologie                                         |
|-------------|-----------------------------------------------------|
| Frontend    | Angular 21+ / TypeScript / Design system CSS custom |
| API Gateway | Node.js / Express / TypeScript                      |
| Pipeline    | Python 3.11+ / ChromaDB / sentence-transformers     |
| LLM         | Ollama (local) ou Claude API (remote)               |
| Stockage    | ChromaDB (vecteurs) + SQLite via better-sqlite3     |

## Quick Start

### 1. Prérequis
```bash
# Python
python3 --version  # >= 3.11
pip install -r backend/requirements.txt

# Node
node --version  # >= 20
cd backend && npm install

# Angular CLI
cd frontend && npm install

# Ollama (optionnel, pour LLM local)
# https://ollama.ai
ollama pull mistral
```

### 2. Déposer vos livres
```bash
mkdir library
cp ~/meslivres/*.epub ./library/
cp ~/meslivres/*.pdf  ./library/
```

### 3. Démarrer la stack
```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm start

# Terminal 3 — Ollama (si LLM local)
ollama serve
```

### 4. Ouvrir
Naviguer vers `http://localhost:4200` et cliquer sur **Réindexer tout** dans la page Bibliothèque.

## Structure du projet
```
bookbrain/
├── backend/
│   ├── src/
│   │   ├── routes/         # Express routes (books, search, ask, history, ingest, models)
│   │   ├── services/       # Logique métier (chromadb, ollama/claude, sqlite)
│   │   ├── middleware/     # Error handling, validation
│   │   └── index.ts        # Entry point Express
│   ├── scripts/            # Pipeline Python d'ingestion
│   ├── package.json
│   ├── tsconfig.json
│   └── requirements.txt
├── frontend/               # Angular app
│   └── src/app/
│       ├── core/           # Services, modèles, guards
│       ├── shared/         # Composants réutilisables (header, sidebar)
│       ├── features/       # qa/, search/, library/
│       └── app.component.ts  # Shell (sidebar + router-outlet)
├── library/                # Vos livres (gitignored)
├── chroma_db/              # Index vectoriel (gitignored)
├── bookbrain.db            # SQLite local (gitignored)
├── CLAUDE.md               # Instructions pour Claude Code
└── README.md
```

## Fonctionnalités

- **Recherche sémantique** — retrouvez des concepts dans tous vos livres, au-delà des mots-clés
- **Q&R RAG** — posez des questions en langage naturel, obtenez des réponses sourcées
- **Streaming** — les réponses s'affichent token par token via SSE
- **Historique persistant** — toutes les conversations sont sauvegardées en SQLite
- **Multi-modèles** — basculez entre Ollama (local) et Claude API (cloud)
- **Thème dark/light** — togglé depuis la sidebar
