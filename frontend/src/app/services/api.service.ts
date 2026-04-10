import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  AskStreamEvent,
  Book,
  LlmModel,
  SearchResponse,
  AskResponse,
  IngestStatus,
  HistorySession,
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  // ── Books ─────────────────────────────────────

  getBooks(): Observable<{ books: Book[]; totalChunks: number }> {
    return this.http
      .get<ApiResponse<{ books: Book[]; totalChunks: number }>>(`${this.baseUrl}/books`)
      .pipe(map((res) => res.data!));
  }

  getBook(id: string): Observable<Book> {
    return this.http
      .get<ApiResponse<Book>>(`${this.baseUrl}/books/${id}`)
      .pipe(map((res) => res.data!));
  }

  deleteBook(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/books/${id}`)
      .pipe(map(() => undefined));
  }

  getModels(): Observable<{ models: LlmModel[]; current: string }> {
    return this.http
      .get<ApiResponse<{ models: LlmModel[]; current: string }>>(`${this.baseUrl}/models`)
      .pipe(map((res) => res.data!));
  }

  // ── Search ────────────────────────────────────

  search(query: string, limit = 10, bookIds?: string[]): Observable<SearchResponse> {
    return this.http
      .post<ApiResponse<SearchResponse>>(`${this.baseUrl}/search`, {
        query,
        limit,
        bookIds,
      })
      .pipe(map((res) => res.data!));
  }

  // ── Ask (RAG Q&A) ────────────────────────────

  ask(
    question: string,
    bookIds?: string[],
    history?: { role: 'user' | 'assistant'; content: string }[],
    model?: string
  ): Observable<AskResponse> {
    return this.http
      .post<ApiResponse<AskResponse>>(`${this.baseUrl}/ask`, {
        question,
        bookIds,
        history,
        model,
      })
      .pipe(map((res) => res.data!));
  }

  // ── Ask streaming ─────────────────────────────────

  streamAsk(
    question: string,
    bookIds?: string[],
    history?: { role: 'user' | 'assistant'; content: string }[],
    model?: string
  ): Observable<AskStreamEvent> {
    return new Observable<AskStreamEvent>(subscriber => {
      const controller = new AbortController();

      fetch(`${this.baseUrl}/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, bookIds, history, model }),
        signal: controller.signal,
      }).then(async response => {
        if (!response.ok) {
          subscriber.error(new Error(`HTTP ${response.status}`));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') { subscriber.complete(); return; }
              subscriber.next(JSON.parse(data) as AskStreamEvent);
            }
          }
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      }).catch(err => subscriber.error(err));

      return () => controller.abort();
    });
  }

  // ── History ───────────────────────────────────────

  getHistory(): Observable<HistorySession[]> {
    return this.http
      .get<ApiResponse<{ sessions: HistorySession[] }>>(`${this.baseUrl}/history`)
      .pipe(map((res) => res.data!.sessions));
  }

  createSession(session: Pick<HistorySession, 'id' | 'type' | 'title' | 'createdAt'>): Observable<HistorySession> {
    return this.http
      .post<ApiResponse<HistorySession>>(`${this.baseUrl}/history`, session)
      .pipe(map((res) => res.data!));
  }

  updateSession(id: string, patch: Partial<Pick<HistorySession, 'messages' | 'searchResults' | 'searchTook'>>): Observable<void> {
    return this.http
      .patch<ApiResponse>(`${this.baseUrl}/history/${id}`, patch)
      .pipe(map(() => undefined));
  }

  deleteHistorySession(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/history/${id}`)
      .pipe(map(() => undefined));
  }

  clearHistory(): Observable<void> {
    return this.http
      .delete<ApiResponse>(`${this.baseUrl}/history`)
      .pipe(map(() => undefined));
  }

  // ── Ingest ────────────────────────────────────

  triggerIngest(force = false): Observable<void> {
    return this.http
      .post<ApiResponse>(`${this.baseUrl}/ingest`, { force })
      .pipe(map(() => undefined));
  }

  getIngestStatus(): Observable<IngestStatus | null> {
    return this.http
      .get<ApiResponse<IngestStatus | null>>(`${this.baseUrl}/ingest/status`)
      .pipe(map((res) => res.data ?? null));
  }
}
