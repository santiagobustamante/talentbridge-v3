import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Tonos disponibles. Mapean 1:1 a los ~9 valores de JobOfferStatus/JobApplicationStatus
 * que hoy se pintan a mano en cada componente (DRAFT/ARCHIVED->neutral, PUBLISHED/
 * PRESELECTED/HIRED->success, CLOSED->warning, REJECTED->danger, PENDING/REVIEWED->info),
 * más "primary" para chips informativos (ej. habilidades) que no representan un estado.
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span class="app-badge app-badge--{{ tone }}">
      <ng-content></ng-content>
      @if (removable) {
        <button
          type="button"
          class="app-badge__remove"
          (click)="remove.emit()"
          aria-label="Quitar"
        >
          &times;
        </button>
      }
    </span>
  `,
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'neutral';
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();
}
