import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class IngestService {
  readonly #apiService = inject(ApiService);
  readonly #snackBar = inject(MatSnackBar);

  readonly isRunning = signal(false);

  /** Emits the processed count when an ingest run completes. */
  readonly onComplete = new Subject<number>();

  #pollInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.isRunning()) return;
    this.isRunning.set(true);

    this.#apiService.triggerIngest().subscribe({
      next: () => {
        this.#snackBar.open('Indexing started…', undefined, { duration: 2000 });
        this.#startPolling();
      },
      error: () => {
        this.isRunning.set(false);
        this.#snackBar.open('Indexing failed', 'OK', { duration: 3000 });
      },
    });
  }

  #startPolling(): void {
    this.#stopPolling();
    this.#pollInterval = setInterval(() => {
      this.#apiService.getIngestStatus().subscribe({
        next: (status) => {
          if (status && status.processed + status.failed >= status.total && status.total > 0) {
            this.#stopPolling();
            this.isRunning.set(false);
            this.#snackBar.open(`Indexed ${status.processed} books`, 'OK', { duration: 4000 });
            this.onComplete.next(status.processed);
          }
        },
      });
    }, 3000);
  }

  #stopPolling(): void {
    if (this.#pollInterval !== null) {
      clearInterval(this.#pollInterval);
      this.#pollInterval = null;
    }
  }
}
