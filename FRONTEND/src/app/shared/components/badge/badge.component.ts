import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Tonos disponibles. Mapean 1:1 a los ~9 valores de JobOfferStatus/JobApplicationStatus
 * que hoy se pintan a mano en cada componente (DRAFT/ARCHIVED->neutral, PUBLISHED/
 * PRESELECTED/HIRED->success, CLOSED->warning, REJECTED->danger, PENDING/REVIEWED->info),
 * más "primary" para chips informativos (ej. habilidades) que no representan un estado.
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

/**
 * Chip/etiqueta compartida (pill de color) usada para mostrar estados de ofertas
 * y postulaciones, habilidades, y cualquier otro texto corto destacado. El contenido
 * se pasa por `<ng-content>` (proyección), y el color se controla con `tone`.
 * `removable` agrega una "x" para que el padre pueda quitar el chip (ej. lista de
 * habilidades editable).
 */
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
  /** Color/estado visual del chip. Ver `statusToTone()` para mapear un status del backend a un tono. */
  @Input() tone: BadgeTone = 'neutral';
  /** Si es true, muestra el botón "x" para quitar el badge. */
  @Input() removable = false;
  /** Emite cuando el usuario hace click en la "x" (solo si `removable` es true). */
  @Output() remove = new EventEmitter<void>();
}
