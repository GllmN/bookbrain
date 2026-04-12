import { ChangeDetectionStrategy, Component, input, output, computed, HostListener } from '@angular/core';
import { Book } from '../../../../../core/models/types';

@Component({
  selector: 'app-book-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './book-picker.component.html',
  styleUrl: './book-picker.component.scss',
})
export class BookPickerComponent {
  books = input<Book[]>([]);
  selectedBookIds = input<string[]>([]);

  selectionChange = output<string[]>();
  closed = output<void>();

  selectedCount = computed(() => this.selectedBookIds().length);

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closed.emit();
  }

  isSelected(id: string): boolean {
    return this.selectedBookIds().includes(id);
  }

  toggle(id: string) {
    const current = this.selectedBookIds();
    const next = current.includes(id)
      ? current.filter(b => b !== id)
      : [...current, id];
    this.selectionChange.emit(next);
  }

  selectAll() {
    this.selectionChange.emit([]);
  }

  fileTypeLabel(fileType: string): string {
    return fileType === 'epub' ? 'E' : 'P';
  }
}
