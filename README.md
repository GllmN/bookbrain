# 📚 BookBrain — Semantic Search Engine for Your Book Library

A local, private RAG (Retrieval-Augmented Generation) system that turns your Humble Bundle (or any) ebook collection into a searchable knowledge base.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Angular Frontend                   │
│         Search UI / Results / Book Manager           │
│                    (port 4200)                        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────┐
│                 Node.js API Gateway                   │
│           Express + TypeScript (port 3000)            │
│  • /api/search    — semantic search                  │
│  • /api/books     — CRUD livres                      │
│  • /api/ingest    — lancer l'indexation               │
│  • /api/ask       — question + RAG answer             │
└──────┬───────────────────────────────┬──────────────┘
       │ HTTP                          │ child_process
┌──────▼──────────┐           ┌────────▼─────────────┐
│  Ollama / Claude │           │   Python Pipeline     │
│   LLM Server     │           │  • PDF/EPUB extract   │
│  (port 11434)    │           │  • Chunking           │
│                  │           │  • Embeddings          │
│                  │           │  • ChromaDB storage    │
└─────────────────┘           └────────┬─────────────┘
                                       │
                              ┌────────▼─────────────┐
                              │     ChromaDB           │
                              │  Vector Store (local)  │
                              └────────────────────────┘
```

## Stack

| Layer       | Tech                                      |
|-------------|-------------------------------------------|
| Frontend    | Angular 17+ / TypeScript / Angular material|
| API Gateway | Node.js / Express / TypeScript             |
| Pipeline    | Python 3.11+ / LangChain / ChromaDB        |
| Embeddings  | sentence-transformers (local)              |
| LLM         | Ollama (Mistral/Llama3) ou Claude API      |
| Storage     | ChromaDB (vectors) + SQLite (metadata)     |

## Quick Start

### 1. Prerequisites
```bash
# Python
python3 --version  # >= 3.11
pip install -r backend/requirements.txt

# Node
node --version  # >= 20
cd backend && npm install

# Angular
cd frontend && npm install

# Ollama (optional, for local LLM)
# https://ollama.ai
ollama pull mistral
```

### 2. Ingest your books
```bash
# Drop your EPUBs/PDFs into ./library/
mkdir library
cp ~/HumbleBundle/*.epub ./library/
cp ~/HumbleBundle/*.pdf ./library/

# Run the ingestion pipeline
cd backend && python3 scripts/ingest.py --input ../library
```

### 3. Start the stack
```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && ng serve

# Terminal 3 — Ollama (if using local LLM)
ollama serve
```

### 4. Open
Navigate to `http://localhost:4200`

## Project Structure
```
bookbrain/
├── backend/
│   ├── src/                    # Node.js API (TypeScript)
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Business logic
│   │   ├── routes/             # Express routes
│   │   ├── config/             # Config & env
│   │   ├── models/             # TypeScript interfaces
│   │   └── utils/              # Helpers
│   ├── scripts/                # Python ingestion pipeline
│   │   ├── ingest.py           # Main ingestion script
│   │   ├── extractors.py       # PDF/EPUB text extraction
│   │   ├── chunker.py          # Text chunking strategies
│   │   └── embedder.py         # Embedding generation
│   ├── package.json
│   ├── tsconfig.json
│   └── requirements.txt        # Python dependencies
├── frontend/                   # Angular app
│   └── src/app/
│       ├── pages/              # Search, Library, BookDetail
│       ├── components/         # Shared components
│       ├── services/           # API service layer
│       └── models/             # TypeScript interfaces
├── library/                    # Your books go here
├── CLAUDE.md                   # Context for Claude Code
└── README.md
```

## CLAUDE.md
See `CLAUDE.md` for instructions that Claude Code reads automatically.
