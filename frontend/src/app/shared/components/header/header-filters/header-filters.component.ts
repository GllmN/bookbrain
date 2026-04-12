import { ChangeDetectionStrategy, Component, inject, input, output, signal, computed } from '@angular/core';
import { LlmModelService } from '../../../../core/services/llm-model.service';
import { BookPickerComponent } from './book-picker/book-picker.component';
import { ModelPickerComponent } from './model-picker/model-picker.component';
import { Book } from '../../../../core/models/types';

@Component({
  selector: 'app-header-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookPickerComponent, ModelPickerComponent],
  templateUrl: './header-filters.component.html',
  styleUrl: './header-filters.component.scss',
})
export class HeaderFiltersComponent {
  readonly llmModelService = inject(LlmModelService);

  books = input<Book[]>([]);
  selectedBookIds = input<string[]>([]);
  selectionChange = output<string[]>();

  showBookPicker = signal(false);
  showModelPicker = signal(false);

  booksLabel = computed(() => {
    const count = this.selectedBookIds().length;
    if (count === 0) return 'Tous les livres';
    if (count === 1) return '1 livre';
    return `${count} livres`;
  });

  toggleBookPicker() {
    this.showBookPicker.update(v => !v);
    if (this.showBookPicker()) this.showModelPicker.set(false);
  }

  toggleModelPicker() {
    this.showModelPicker.update(v => !v);
    if (this.showModelPicker()) this.showBookPicker.set(false);
  }
}
