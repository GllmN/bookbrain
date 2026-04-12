import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { LlmModel } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ModelService {
  readonly #apiService = inject(ApiService);

  models = signal<LlmModel[]>([]);
  selectedModelId = signal('');

  selectedModel = computed(
    () => this.models().find(m => m.id === this.selectedModelId()) ?? null
  );

  /** Nom court pour affichage dans le footer (max 14 chars) */
  selectedModelLabel = computed(() => {
    const llmModel = this.selectedModel();
    if (!llmModel) return 'No model';
    return llmModel.name.length > 14 ? llmModel.name.slice(0, 13) + '…' : llmModel.name;
  });

  loadModels() {
    this.#apiService.getModels().subscribe({
      next: (data) => {
        this.models.set(data.models);
        this.selectedModelId.set(data.current);
      },
    });
  }

  select(id: string) {
    this.selectedModelId.set(id);
  }
}
