import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from './api.service';
import { IngestStatus } from '../models/types';

const IDLE: IngestStatus = { running: false, total: 0, processed: 0, skipped: 0, failed: 0, errors: [] };

@Injectable({ providedIn: 'root' })
export class IngestService {
  readonly #apiService = inject(ApiService);
  readonly #snackBar = inject(MatSnackBar);

  readonly status = signal<IngestStatus>({ ...IDLE });
  readonly isRunning = computed(() => this.status().running);

  /** Emits the processed count when an ingest run completes. */
  readonly onComplete = new Subject<number>();

  #pollInterval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.isRunning()) return;

    this.#apiService.triggerIngest().subscribe({
      next: () => {
        this.status.set({ ...IDLE, running: true });
        this.#snackBar.open('Indexation démarrée…', undefined, { duration: 2000 });
        this.#startPolling();
      },
      error: () => {
        this.#snackBar.open('Échec du démarrage de l\'indexation', 'OK', { duration: 3000 });
      },
    });
  }

  #startPolling(): void {
    this.#stopPolling();
    this.#pollInterval = setInterval(() => {
      this.#apiService.getIngestStatus().subscribe({
        next: (status) => {
          if (!status) return;
          this.status.set(status);

          if (!status.running && status.total > 0) {
            this.#stopPolling();
            const msg = status.failed > 0
              ? `Indexation terminée — ${status.processed} traités, ${status.failed} échecs`
              : `Indexation terminée — ${status.processed} traités, ${status.skipped} déjà indexés`;
            this.#snackBar.open(msg, 'OK', { duration: 5000 });
            this.onComplete.next(status.processed);
          }
        },
      });
    }, 2000);
  }

  #stopPolling(): void {
    if (this.#pollInterval !== null) {
      clearInterval(this.#pollInterval);
      this.#pollInterval = null;
    }
  }
}
