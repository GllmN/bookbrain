import { ChangeDetectionStrategy, Component, input, output, HostListener } from '@angular/core';
import { LlmModel } from '../../../../core/models/types';

@Component({
  selector: 'app-model-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './model-picker.component.html',
  styleUrl: './model-picker.component.scss',
})
export class ModelPickerComponent {
  llmModels = input<LlmModel[]>([]);
  selectedModelId = input('');

  modelSelected = output<string>();
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closed.emit();
  }

  select(id: string) {
    this.modelSelected.emit(id);
    this.closed.emit();
  }

  providerIcon(provider: string): string {
    return provider === 'anthropic' ? '☁' : '⚡';
  }

  providerLabel(provider: string): string {
    return provider === 'anthropic' ? 'Anthropic (cloud)' : 'Ollama (local)';
  }
}
