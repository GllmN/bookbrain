import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  description: string;
  details?: string[];
  confirmLabel?: string;
  confirmDanger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">{{ data.title }}</h2>
      </div>

      <div class="dialog-body">
        <p class="dialog-desc">{{ data.description }}</p>
        @if (data.details?.length) {
          <ul class="dialog-details">
            @for (detail of data.details; track detail) {
              <li>{{ detail }}</li>
            }
          </ul>
        }
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" (click)="ref.close(false)">Cancel</button>
        <button class="btn-confirm" [class.danger]="data.confirmDanger" (click)="ref.close(true)">
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ConfirmDialogComponent>);
}
