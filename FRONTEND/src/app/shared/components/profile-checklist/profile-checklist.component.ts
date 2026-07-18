import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/** Un ítem individual de la checklist: qué falta completar y a qué ruta lleva para hacerlo. */
export interface ProfileChecklistItem {
  label: string;
  done: boolean;
  route: string;
}

/**
 * Widget de "completá tu perfil" que se muestra en el inicio del candidato: un
 * anillo de progreso (SVG, tipo donut) con el porcentaje completado y una lista
 * de pasos pendientes, cada uno enlazando a la pantalla donde se resuelve
 * (perfil, habilidades, experiencia, etc.).
 */
@Component({
  selector: 'app-profile-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './profile-checklist.component.html',
  styleUrl: './profile-checklist.component.scss',
})
export class ProfileChecklistComponent {
  /** Porcentaje de completitud del perfil (0-100), calculado por el componente padre. */
  @Input() percent = 0;
  /** Pasos pendientes/completados a listar debajo del anillo. */
  @Input() items: ProfileChecklistItem[] = [];

  /** Perímetro del círculo del anillo SVG (radio 42), usado para calcular el `stroke-dashoffset`. */
  readonly ringCircumference = 2 * Math.PI * 42;

  /** Desplazamiento del trazo del anillo SVG que produce visualmente el efecto de "relleno" según `percent`. */
  get ringOffset(): number {
    return this.ringCircumference - (this.ringCircumference * this.percent) / 100;
  }
}
