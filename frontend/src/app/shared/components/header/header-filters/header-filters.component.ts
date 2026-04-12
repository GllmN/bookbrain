import { Component, inject, input, output, signal, computed } from '@angular/core';
import { ModelService } from '../../../../core/services/model.service';
import { BookPickerComponent } from '../../book-picker/book-picker.component';
import { ModelPickerComponent } from '../../model-picker/model-picker.component';
import { Book } from '../../../../core/models/types';

@Component({
  selector: 'app-header-filters',
  standalone: true,
  imports: [BookPickerComponent, ModelPickerComponent],
  templateUrl: './header-filters.component.html',
  styleUrl: './header-filters.component.scss',
})
export class HeaderFiltersComponent {
  readonly modelService = inject(ModelService);

  books = input<Book[]>([]);
  selectedBookIds = input<string[]>([]);
  selectionChange = output<string[]>();

  showBookPicker = signal(false);
  showModelPicker = signal(false);

  booksLabel = computed(() => {
    const count = this.selectedBookIds().length;
    if (count === 0) return 'All books';
    if (count === 1) return '1 book';
    return `${count} books`;
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
