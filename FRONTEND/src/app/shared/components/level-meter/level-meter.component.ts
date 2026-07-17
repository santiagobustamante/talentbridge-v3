import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SkillLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

interface LevelDef {
  value: SkillLevel;
  label: string;
  hint: string;
}

const LEVELS: LevelDef[] = [
  { value: 'BASIC', label: 'Básico', hint: 'Conocimientos base, resuelves tareas simples con apoyo.' },
  { value: 'INTERMEDIATE', label: 'Intermedio', hint: 'Trabajas con autonomía en tareas del día a día.' },
  { value: 'ADVANCED', label: 'Avanzado', hint: 'Resuelves problemas complejos sin ayuda.' },
  { value: 'EXPERT', label: 'Experto', hint: 'Referente del equipo en este tema.' },
];

/**
 * Reemplaza la combinación redundante badge+barra+puntos que coexistía en 3
 * lugares distintos de `skills` (tarjeta, edición en línea, selector de nivel
 * al agregar) por un único control: una barra segmentada de 4 pasos que
 * siempre representa el mismo dato (BASIC..EXPERT) de la misma forma, con una
 * descripción corta de qué significa cada nivel en vez de solo la etiqueta.
 */
@Component({
  selector: 'app-level-meter',
  standalone: true,
  template: `
    <div class="level-meter" [class.interactive]="interactive">
      <div class="level-meter__segments">
        @for (l of levels; track l.value; let i = $index) {
          <button
            type="button"
            class="segment"
            [class.filled]="i <= currentIndex"
            [tabindex]="interactive ? 0 : -1"
            [attr.aria-pressed]="interactive ? l.value === level : null"
            [attr.title]="l.label"
            (click)="onClick(l.value)"
            (mouseenter)="onHover(l.value)"
            (mouseleave)="onHover(null)"
          ></button>
        }
      </div>
      <div class="level-meter__label">
        <span class="name">{{ displayedLevel.label }}</span>
        @if (showHint) {
          <span class="hint">{{ displayedLevel.hint }}</span>
        }
      </div>
    </div>
  `,
  styleUrl: './level-meter.component.scss',
})
export class LevelMeterComponent {
  /** string (no SkillLevel) porque `Skill.level` llega del backend tipado como string suelto. */
  @Input() level: string = 'BASIC';
  @Input() interactive = false;
  @Input() showHint = true;
  @Output() levelChange = new EventEmitter<SkillLevel>();

  readonly levels = LEVELS;
  hovered: SkillLevel | null = null;

  get currentIndex(): number {
    const active = this.hovered || this.level;
    return this.levels.findIndex((l) => l.value === active);
  }

  get displayedLevel(): LevelDef {
    const active = this.hovered || this.level;
    return this.levels.find((l) => l.value === active) || this.levels[0];
  }

  onClick(value: SkillLevel): void {
    if (!this.interactive) return;
    this.levelChange.emit(value);
  }

  onHover(value: SkillLevel | null): void {
    if (!this.interactive) return;
    this.hovered = value;
  }
}
