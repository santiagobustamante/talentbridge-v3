import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  template: `
    <div class="empty-state" [class.empty-state--compact]="compact">
      <mat-icon class="empty-state__icon">{{ icon }}</mat-icon>
      @if (title) {
        <h3 class="empty-state__title">{{ title }}</h3>
      }
      <p class="empty-state__message">{{ message }}</p>
      @if (actionLabel && actionRoute) {
        <a class="empty-state__action" [routerLink]="actionRoute">{{ actionLabel }}</a>
      } @else if (actionLabel) {
        <button type="button" class="empty-state__action" (click)="actionClick.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title?: string;
  @Input() message = '';
  @Input() actionLabel?: string;
  @Input() actionRoute?: string;
  /** Versión compacta para secciones embebidas (dashboards, paneles). */
  @Input({ transform: booleanAttribute }) compact = false;
  @Output() actionClick = new EventEmitter<void>();
}
