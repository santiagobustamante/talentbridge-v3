import { Component, Input } from '@angular/core';

export type CardVariant = 'flat' | 'elevated';
export type CardPadding = 'sm' | 'md' | 'lg';

/**
 * Contenedor base tomado del patrón repetido en ~15 archivos:
 * background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 22-24px.
 * El contenido se proyecta con `<ng-content>`; `variant` controla si tiene sombra
 * ("elevated") o es plano, y `padding` el espaciado interno.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div class="app-card app-card--{{ variant }} app-card--pad-{{ padding }}">
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './card.component.scss',
})
export class CardComponent {
  /** Estilo visual: 'flat' (borde simple) o 'elevated' (con sombra). */
  @Input() variant: CardVariant = 'flat';
  /** Espaciado interno del contenedor. */
  @Input() padding: CardPadding = 'md';
}
