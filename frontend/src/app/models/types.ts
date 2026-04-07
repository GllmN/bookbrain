// ── Book ──────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  fileType: 'pdf' | 'epub';
  totalChunks: number;
  indexedAt: string;
  coverPath?: string;
}

// ── Search ────────────────────────────────────────

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
  took: number;
}

// ── Ask (RAG Q&A) ────────────────────────────────

export interface AskResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  timestamp: string; // ISO string for JSON serialization
}

// ── History ───────────────────────────────────────

export interface HistorySession {
  id: string;
  type: 'ask' | 'search';
  title: string;
  createdAt: string;
  // ask mode
  messages?: ChatMessage[];
  // search mode
  searchQuery?: string;
  searchResults?: SearchResult[];
  searchTook?: number;
}

// ── Ingest ────────────────────────────────────────

export interface IngestStatus {
  total: number;
  processed: number;
  failed: number;
  errors: { file: string; error: string }[];
}

// ── API Envelope ──────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
