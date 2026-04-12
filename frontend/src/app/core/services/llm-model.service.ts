import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { LlmModel } from '../models/types';

@Injectable({ providedIn: 'root' })
export class LlmModelService {
  readonly #apiService = inject(ApiService);

  llmModels = signal<LlmModel[]>([]);
  selectedModelId = signal('');

  selectedLlmModel = computed(
    () => this.llmModels().find(m => m.id === this.selectedModelId()) ?? null
  );

  /** Nom court pour affichage (max 14 chars) */
  selectedModelLabel = computed(() => {
    const llmModel = this.selectedLlmModel();
    if (!llmModel) return 'No model';
    return llmModel.name.length > 14 ? llmModel.name.slice(0, 13) + '…' : llmModel.name;
  });

  loadModels() {
    this.#apiService.getModels().subscribe({
      next: (data) => {
        this.llmModels.set(data.models);
        this.selectedModelId.set(data.current);
      },
    });
  }

  select(id: string) {
    this.selectedModelId.set(id);
  }
}
