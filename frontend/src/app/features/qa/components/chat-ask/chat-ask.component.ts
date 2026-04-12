import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-ask',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-ask.component.html',
  styleUrl: './chat-ask.component.scss',
})
export class ChatAskComponent {
  disabled = input(false);

  submitted = output<string>();
  scrollRequest = output<void>();

  query = '';

  submit() {
    const q = this.query.trim();
    if (!q || this.disabled()) return;
    this.query = '';
    this.submitted.emit(q);
  }
}
