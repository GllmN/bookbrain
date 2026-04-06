#!/usr/bin/env python3
"""
BookBrain — Main ingestion pipeline.

Usage:
    python ingest.py --input ../library
    python ingest.py --input ../library --force    # re-index all
    python ingest.py --input ../library --json      # JSON output for Node.js
"""

import argparse
import json
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import chromadb
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn

from extractors import extract_file
from chunker import chunk_chapters
from embedder import embed_texts

console = Console()

COLLECTION_NAME = "bookbrain_chunks"
SUPPORTED_EXTENSIONS = {".pdf", ".epub"}


def get_chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host="localhost", port=8000)


def get_sqlite(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'Unknown',
            file_path TEXT NOT NULL UNIQUE,
            file_type TEXT NOT NULL,
            total_chunks INTEGER NOT NULL DEFAULT 0,
            indexed_at TEXT NOT NULL,
            cover_path TEXT
        )
    """)
    conn.commit()
    return conn


def is_indexed(conn: sqlite3.Connection, file_path: str) -> bool:
    row = conn.execute("SELECT 1 FROM books WHERE file_path = ?", (file_path,)).fetchone()
    return row is not None


def save_book_metadata(
    conn: sqlite3.Connection,
    book_id: str,
    title: str,
    author: str,
    file_path: str,
    file_type: str,
    total_chunks: int,
):
    conn.execute(
        """INSERT OR REPLACE INTO books (id, title, author, file_path, file_type, total_chunks, indexed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (book_id, title, author, file_path, file_type, total_chunks, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()


def guess_title_author(file_path: Path) -> tuple[str, str]:
    """Best-effort title/author from filename. Format: 'Title - Author.ext' or just 'Title.ext'."""
    name = file_path.stem
    if " - " in name:
        parts = name.split(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    return name.strip(), "Unknown"


def ingest_file(
    file_path: Path,
    collection: chromadb.Collection,
    conn: sqlite3.Connection,
    force: bool = False,
) -> dict:
    """Ingest a single file. Returns status dict."""
    rel_path = str(file_path)

    if not force and is_indexed(conn, rel_path):
        return {"file": file_path.name, "status": "skipped", "reason": "already indexed"}

    try:
        # 1. Extract text
        chapters = extract_file(file_path)
        if not chapters:
            return {"file": file_path.name, "status": "failed", "error": "No text extracted"}

        # 2. Chunk
        chunks = chunk_chapters(chapters)
        if not chunks:
            return {"file": file_path.name, "status": "failed", "error": "No chunks produced"}

        # 3. Embed
        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)

        # 4. Store in ChromaDB
        book_id = str(uuid.uuid4())
        title, author = guess_title_author(file_path)

        ids = [f"{book_id}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "book_id": book_id,
                "book_title": title,
                "author": author,
                "chapter": c.chapter,
                "chunk_index": c.chunk_index,
                "page": c.page or 0,
            }
            for c in chunks
        ]

        # ChromaDB has a batch limit, upload in batches of 500
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            end = min(i + batch_size, len(ids))
            collection.add(
                ids=ids[i:end],
                documents=texts[i:end],
                embeddings=embeddings[i:end],
                metadatas=metadatas[i:end],
            )

        # 5. Save metadata in SQLite
        save_book_metadata(conn, book_id, title, author, rel_path, file_path.suffix[1:], len(chunks))

        return {
            "file": file_path.name,
            "status": "ok",
            "book_id": book_id,
            "title": title,
            "chunks": len(chunks),
        }

    except Exception as e:
        return {"file": file_path.name, "status": "failed", "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="BookBrain ingestion pipeline")
    parser.add_argument("--input", required=True, help="Path to book library directory")
    parser.add_argument("--force", action="store_true", help="Re-index already indexed files")
    parser.add_argument("--json", action="store_true", help="Output JSON (for Node.js integration)")
    parser.add_argument("--db", default="../bookbrain.db", help="SQLite database path")
    args = parser.parse_args()

    input_dir = Path(args.input).resolve()
    if not input_dir.is_dir():
        console.print(f"[red]Error: {input_dir} is not a directory[/red]")
        sys.exit(1)

    # Find all supported files
    files = sorted(
        f for f in input_dir.rglob("*") if f.suffix.lower() in SUPPORTED_EXTENSIONS and not f.name.startswith(".")
    )

    if not files:
        console.print(f"[yellow]No PDF/EPUB files found in {input_dir}[/yellow]")
        if args.json:
            print(json.dumps({"total": 0, "processed": 0, "failed": 0, "errors": []}))
        sys.exit(0)

    console.print(f"\n📚 Found [bold]{len(files)}[/bold] books in {input_dir}\n")

    # Connect to services
    chroma = get_chroma_client()
    collection = chroma.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    conn = get_sqlite(args.db)

    results = []
    processed = 0
    failed = 0
    errors = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Indexing books...", total=len(files))

        for file_path in files:
            progress.update(task, description=f"Processing {file_path.name[:40]}...")
            result = ingest_file(file_path, collection, conn, force=args.force)
            results.append(result)

            if result["status"] == "ok":
                processed += 1
                console.print(f"  ✅ {result['title']} — {result['chunks']} chunks")
            elif result["status"] == "skipped":
                console.print(f"  ⏭️  {file_path.name} (already indexed)")
            else:
                failed += 1
                errors.append({"file": result["file"], "error": result.get("error", "unknown")})
                console.print(f"  ❌ {file_path.name}: {result.get('error')}")

            progress.advance(task)

    conn.close()

    # Summary
    console.print(f"\n{'─' * 50}")
    console.print(f"📊 Total: {len(files)} | Processed: {processed} | Failed: {failed} | Skipped: {len(files) - processed - failed}")
    total_chunks = collection.count()
    console.print(f"🧠 Total chunks in vector store: {total_chunks}\n")

    if args.json:
        print(json.dumps({
            "total": len(files),
            "processed": processed,
            "failed": failed,
            "errors": errors,
        }))


if __name__ == "__main__":
    main()
