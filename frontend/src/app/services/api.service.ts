import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  Book,
  SearchResponse,
  AskResponse,
  IngestStatus,
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
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): Observable<AskResponse> {
    return this.http
      .post<ApiResponse<AskResponse>>(`${this.baseUrl}/ask`, {
        question,
        bookIds,
        history,
      })
      .pipe(map((res) => res.data!));
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
