// ── Book ──────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  fileType: "pdf" | "epub";
  totalChunks: number;
  indexedAt: string;
  coverPath?: string;
}

// ── Search ────────────────────────────────────────

export interface SearchRequest {
  query: string;
  limit?: number;
  bookIds?: string[];
}

export interface SearchResult {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  author: string;
  chapter?: string;
  content: string;
  score: number;
  page?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  took: number; // ms
}

// ── Ask (RAG Q&A) ────────────────────────────────

export interface AskRequest {
  question: string;
  bookIds?: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface AskResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
}

// ── Ingest ────────────────────────────────────────

export interface IngestRequest {
  filePaths?: string[];    // specific files, or all in library
  force?: boolean;         // re-index already indexed
}

export interface IngestStatus {
  total: number;
  processed: number;
  failed: number;
  errors: { file: string; error: string }[];
}

// ── History ───────────────────────────────────────

export interface HistorySession {
  id: string;
  type: "ask" | "search";
  title: string;
  createdAt: string;
  messages?: { role: "user" | "assistant"; content: string; sources?: SearchResult[]; timestamp: string }[];
  searchQuery?: string;
  searchResults?: SearchResult[];
  searchTook?: number;
}

// ── API Envelope ──────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
