# CLAUDE.md — Backend

## Stack
- Node.js 20+ / Express / TypeScript (API gateway)
- Python 3.11+ (ingestion pipeline only)
- SQLite via better-sqlite3 (book metadata)
- ChromaDB client (vector search)

## Commands
```bash
npm run dev              # Start dev server (tsx watch)
npm run build            # Compile TypeScript
npm test                 # Run vitest

# Python pipeline
python3 scripts/ingest.py --input ../library          # Index books
python3 scripts/ingest.py --input ../library --force   # Re-index all
```

## TypeScript conventions
- Strict mode, ESM imports (`import x from "x.js"` — include .js extension)
- async/await everywhere, no raw Promises
- Zod for request validation in routes
- Custom `AppError` class for error handling (see utils/errors.ts)
- Interfaces in models/types.ts — shared with frontend
- Services are pure functions, not classes
- Use path.resolve for file paths, never hardcode absolute paths

## File organization
```
src/
├── index.ts              # Express server entry point
├── config/index.ts       # Env variables + config object
├── models/types.ts       # Shared TypeScript interfaces
├── routes/api.ts         # All route definitions
├── services/
│   ├── database.ts       # SQLite CRUD
│   ├── vectorStore.ts    # ChromaDB queries
│   ├── llm.ts            # Ollama / Claude API calls
│   └── ingest.ts         # Spawns Python pipeline
└── utils/errors.ts       # AppError class
```

## Python conventions (scripts/ only)
- Type hints on all functions
- Docstrings on public functions
- Use pathlib.Path for file paths
- Rich for CLI output, tqdm for progress bars
- Chunks: ~500 tokens, 50 token overlap
- Embeddings model: all-MiniLM-L6-v2 (384 dimensions)

## Environment variables (.env)
```
PORT=3000
CHROMA_HOST=localhost
CHROMA_PORT=8000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
ANTHROPIC_API_KEY=
LLM_PROVIDER=ollama          # "ollama" or "anthropic"
LIBRARY_PATH=../library
SQLITE_PATH=./bookbrain.db
```

## Error handling pattern
- Controllers: try/catch → AppError with status code
- Services: throw errors, let controllers catch
- API always responds: `{ success: boolean, data?: T, error?: string }`

## Testing
- Framework: vitest
- Test files: `*.test.ts` next to source files
- Mock ChromaDB and Ollama in tests
