# CLAUDE.md — Backend

## Stack
- Node.js 20+ / Express / TypeScript strict, ESM
- Python 3.11+ (ingestion pipeline uniquement)
- SQLite via better-sqlite3 / ChromaDB client

## Commands
```bash
npm run dev              # Dev server (tsx watch, port 3000)
npm run build            # Compile TypeScript → dist/
npm test                 # Vitest

python3 scripts/ingest.py --input ../library          # Indexer les livres
python3 scripts/ingest.py --input ../library --force   # Réindexer tout
```

## Structure
```
src/
├── index.ts              # Entry point Express
├── config/index.ts       # Env variables
├── models/types.ts       # Interfaces partagées avec le frontend
├── routes/api.ts         # Toutes les routes
├── services/
│   ├── database.ts       # SQLite CRUD
│   ├── vectorStore.ts    # ChromaDB queries
│   ├── llm.ts            # Ollama / Claude API
│   └── ingest.ts         # Spawn Python pipeline
└── utils/errors.ts       # AppError class
```

## Variables d'environnement (.env)
```
PORT=3000
CHROMA_HOST=localhost
CHROMA_PORT=8000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
ANTHROPIC_API_KEY=
LLM_PROVIDER=ollama    # "ollama" ou "anthropic"
LIBRARY_PATH=../library
SQLITE_PATH=./bookbrain.db
```

## Python conventions (scripts/ uniquement)
- Type hints sur toutes les fonctions, docstrings sur les publiques
- `pathlib.Path` pour les chemins
- Rich pour le CLI output, tqdm pour les progress bars
- Chunks : ~500 tokens, 50 tokens overlap
- Modèle embeddings : `all-MiniLM-L6-v2` (384 dimensions)
