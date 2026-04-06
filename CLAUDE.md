# CLAUDE.md — BookBrain

## What is this project?
BookBrain is a local RAG (Retrieval-Augmented Generation) app that indexes a personal ebook library (EPUBs, PDFs) and allows semantic search + Q&A over the content.

## Architecture overview
- **Frontend**: Angular 17+ with Angular Material (port 4200)
- **Backend API**: Node.js + Express + TypeScript (port 3000)
- **Ingestion pipeline**: Python 3.11+ scripts
- **LLM**: Ollama (local) or Claude API (remote)
- **Vector DB**: ChromaDB (persistent, local in ./chroma_db/)
- **Metadata DB**: SQLite via better-sqlite3 (./bookbrain.db)

## Project structure
```
bookbrain/
├── backend/          # Node.js API + Python ingestion scripts
├── frontend/         # Angular app
├── library/          # User's books (gitignored)
└── docker-compose.yml
```