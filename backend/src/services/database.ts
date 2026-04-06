import Database from "better-sqlite3";
import { config } from "../config/index.js";
import type { Book } from "../models/types.js";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.sqlitePath);
    db.pragma("journal_mode = WAL");
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Unknown',
      file_path TEXT NOT NULL UNIQUE,
      file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'epub')),
      total_chunks INTEGER NOT NULL DEFAULT 0,
      indexed_at TEXT NOT NULL,
      cover_path TEXT
    );
  `);
}

export function insertBook(book: Book): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO books (id, title, author, file_path, file_type, total_chunks, indexed_at, cover_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(book.id, book.title, book.author, book.filePath, book.fileType, book.totalChunks, book.indexedAt, book.coverPath ?? null);
}

export function getAllBooks(): Book[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM books ORDER BY title").all() as any[];
  return rows.map(mapRow);
}

export function getBookById(id: string): Book | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM books WHERE id = ?").get(id) as any;
  return row ? mapRow(row) : undefined;
}

export function deleteBook(id: string): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM books WHERE id = ?").run(id);
  return result.changes > 0;
}

export function isFileIndexed(filePath: string): boolean {
  const database = getDb();
  const row = database.prepare("SELECT 1 FROM books WHERE file_path = ?").get(filePath);
  return !!row;
}

function mapRow(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    filePath: row.file_path,
    fileType: row.file_type,
    totalChunks: row.total_chunks,
    indexedAt: row.indexed_at,
    coverPath: row.cover_path ?? undefined,
  };
}
