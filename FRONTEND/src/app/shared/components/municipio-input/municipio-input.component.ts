import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MunicipioCatalogService, Municipio, REMOTE_LABEL } from '../../../core/services/municipio-catalog.service';

type Suggestion = Municipio | { label: string; remote: true };

/**
 * Autocomplete de municipio real de Colombia (DIVIPOLA/DANE) — reemplaza el
 * campo de texto libre "Ciudad" en todo el proyecto. No es un ControlValueAccessor
 * (el proyecto no tiene ese patrón en ningún otro lado): se usa como cualquier
 * otro widget autocontenido de `shared/components` (ej. `app-level-meter`),
 * con `[value]`/`(valueChange)` — sirve tanto dentro de un Reactive Form
 * (`[value]="form.value.city" (valueChange)="form.patchValue({city: $event})"`)
 * como con un objeto plano (`[(value)]="formData.city"` vía sintaxis banana-in-box).
 *
 * Solo acepta como valor final el `label` exacto de un municipio real (o
 * "Remoto" si `allowRemote`) — si el usuario deja texto que no matchea nada
 * válido, se limpia al perder el foco en vez de guardar basura silenciosamente.
 */
@Component({
  selector: 'app-municipio-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="municipio-input-wrap">
      <mat-icon class="pin-icon">location_on</mat-icon>
      <input
        type="text"
        class="municipio-input"
        [formControl]="inputCtrl"
        [placeholder]="placeholder"
        [attr.aria-label]="label"
        role="combobox"
        aria-autocomplete="list"
        [attr.aria-expanded]="suggestions.length > 0 && showSuggestions"
        [attr.aria-controls]="instanceId + '-listbox'"
        [attr.aria-activedescendant]="highlightedIndex >= 0 ? instanceId + '-option-' + highlightedIndex : null"
        autocomplete="off"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown)="onKeydown($event)"
      />
      @if (suggestions.length > 0 && showSuggestions) {
        <div class="suggestions-dropdown" role="listbox" [id]="instanceId + '-listbox'">
          @for (s of suggestions; track s.label; let i = $index) {
            <button
              type="button"
              class="suggestion-item"
              [class.suggestion-item--remote]="isRemote(s)"
              [class.suggestion-item--active]="i === highlightedIndex"
              role="option"
              [id]="instanceId + '-option-' + i"
              [attr.aria-selected]="i === highlightedIndex"
              (mousedown)="select(s)"
            >
              @if (isRemote(s)) {
                <mat-icon>wifi</mat-icon>
              } @else {
                <mat-icon>location_on</mat-icon>
              }
              <span class="suggestion-label">{{ s.label }}</span>
              @if (!isRemote(s)) {
                <span class="suggestion-dept">{{ asMunicipio(s).departamento }}</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './municipio-input.component.scss',
})
export class MunicipioInputComponent {
  private catalog = inject(MunicipioCatalogService);

  private static nextId = 0;
  /** Id único por instancia (puede haber varios `app-municipio-input` en una misma página, ej. una fila por experiencia) — enlaza el input con su listbox vía aria-controls/aria-activedescendant. */
  readonly instanceId = `municipio-input-${MunicipioInputComponent.nextId++}`;

  @Input() allowRemote = false;
  @Input() label = 'Municipio';
  @Input() placeholder = 'Ej. Villavicencio, Meta';
  @Output() valueChange = new EventEmitter<string | null>();

  /**
   * Setter (no `ngOnChanges`): el valor real suele llegar recién cuando
   * termina de resolver una carga async del padre (ej. `getProfile()`),
   * después del primer render — este setter sincroniza el input visible
   * cada vez que el padre empuja un valor nuevo. No hay ningún caso real en
   * esta app donde el padre reescriba `value` mientras el usuario ya está
   * escribiendo en el campo, así que no hace falta un guard de foco.
   */
  @Input() set value(v: string | null) {
    if ((v || '') === (this.lastValidValue || '')) return;
    this.lastValidValue = v;
    this.inputCtrl.setValue(v || '', { emitEvent: false });
  }

  inputCtrl = new FormControl('');
  suggestions: Suggestion[] = [];
  showSuggestions = false;
  highlightedIndex = -1;

  private lastValidValue: string | null = null;

  ngOnInit() {
    this.inputCtrl.valueChanges.subscribe((raw) => {
      const q = raw || '';
      this.showSuggestions = true;
      this.catalog.search(q, { allowRemote: this.allowRemote }).subscribe((results) => {
        this.suggestions = results;
        this.highlightedIndex = -1;
      });
    });
  }

  onFocus() {
    this.showSuggestions = true;
  }

  /**
   * Navegación por teclado del listado de sugerencias — sin esto, el
   * dropdown solo respondía a `(mousedown)` y un usuario de teclado no
   * tenía forma de elegir una sugerencia (solo podía escribir el label
   * exacto y esperar a que `onBlur` lo validara contra el catálogo).
   * ArrowDown/ArrowUp mueven el resaltado (circular), Enter selecciona la
   * sugerencia resaltada, Escape cierra el dropdown sin elegir nada.
   */
  onKeydown(event: KeyboardEvent) {
    if (!this.showSuggestions || this.suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = (this.highlightedIndex + 1) % this.suggestions.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = this.highlightedIndex <= 0 ? this.suggestions.length - 1 : this.highlightedIndex - 1;
        break;
      case 'Enter':
        if (this.highlightedIndex >= 0) {
          event.preventDefault();
          this.select(this.suggestions[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  /** Al perder el foco: si lo que quedó escrito no es un municipio real (ni "Remoto" si aplica), se descarta — no se guarda texto libre inválido. */
  onBlur() {
    setTimeout(() => {
      this.showSuggestions = false;
      const typed = (this.inputCtrl.value || '').trim();
      if (!typed) {
        if (this.lastValidValue !== null) {
          this.lastValidValue = null;
          this.valueChange.emit(null);
        }
        return;
      }
      if (typed === this.lastValidValue) return;
      this.catalog.isValidLabel(typed, { allowRemote: this.allowRemote }).subscribe((valid) => {
        if (valid) {
          this.lastValidValue = typed;
          this.valueChange.emit(typed);
        } else {
          // No matchea ningún municipio real: revierte al último valor válido en vez de guardar texto libre.
          this.inputCtrl.setValue(this.lastValidValue || '', { emitEvent: false });
        }
      });
    }, 150); // deja tiempo a que el (mousedown) de una sugerencia se procese antes de descartar el texto
  }

  select(s: Suggestion) {
    this.inputCtrl.setValue(s.label, { emitEvent: false });
    this.lastValidValue = s.label;
    this.showSuggestions = false;
    this.highlightedIndex = -1;
    this.valueChange.emit(s.label);
  }

  isRemote(s: Suggestion): s is { label: string; remote: true } {
    return 'remote' in s;
  }

  asMunicipio(s: Suggestion): Municipio {
    return s as Municipio;
  }

  readonly remoteLabel = REMOTE_LABEL;
}
