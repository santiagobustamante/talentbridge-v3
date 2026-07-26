import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Departamento, Municipio, MunicipioCatalogService, REMOTE_LABEL } from '../../../core/services/municipio-catalog.service';

const REMOTE_SENTINEL = '__REMOTO__';

/**
 * Par de selectores en cascada Departamento → Ciudad para elegir un municipio
 * real de Colombia, reemplazando el autocomplete de texto libre de
 * `app-municipio-input` en los formularios de datos (perfil, empresa,
 * experiencia, ofertas) — ahí un selector guiado evita que el usuario tenga
 * que escribir/reconocer el nombre exacto del municipio. El autocomplete de
 * texto libre se mantiene para los filtros de búsqueda (candidatos/vacantes),
 * donde escribir directo es más rápido que navegar la jerarquía.
 *
 * Emite el mismo `label` exacto ("Nombre, Departamento") que ya valida el
 * backend — cero cambios en la API por este componente.
 */
@Component({
  selector: 'app-departamento-ciudad-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="depto-ciudad-wrap">
      <div class="depto-ciudad-field">
        <label class="depto-ciudad-field__label">Departamento</label>
        <select
          class="depto-ciudad-select"
          aria-label="Departamento"
          [ngModel]="selectedDepartamentoCodigo"
          (ngModelChange)="onDepartamentoChange($event)"
        >
          <option value="" disabled>Selecciona un departamento</option>
          @if (allowRemote) {
            <option [value]="remoteSentinel">Remoto</option>
          }
          @for (d of departamentos; track d.codigo) {
            <option [value]="d.codigo">{{ d.nombre }}</option>
          }
        </select>
      </div>
      @if (selectedDepartamentoCodigo !== remoteSentinel) {
        <div class="depto-ciudad-field">
          <label class="depto-ciudad-field__label">Ciudad</label>
          <select
            class="depto-ciudad-select"
            aria-label="Ciudad"
            [ngModel]="selectedLabel"
            (ngModelChange)="onCiudadChange($event)"
            [disabled]="!selectedDepartamentoCodigo"
          >
            <option value="" disabled>{{ selectedDepartamentoCodigo ? 'Selecciona una ciudad' : 'Elige primero el departamento' }}</option>
            @for (m of ciudades; track m.label) {
              <option [value]="m.label">{{ m.nombre }}</option>
            }
          </select>
        </div>
      }
    </div>
  `,
  styleUrl: './departamento-ciudad-input.component.scss',
})
export class DepartamentoCiudadInputComponent implements OnInit {
  private catalog = inject(MunicipioCatalogService);

  @Input() allowRemote = false;
  @Output() valueChange = new EventEmitter<string | null>();

  readonly remoteSentinel = REMOTE_SENTINEL;

  departamentos: Departamento[] = [];
  ciudades: Municipio[] = [];
  selectedDepartamentoCodigo = '';
  selectedLabel = '';

  private lastEmitted: string | null = null;

  /**
   * Setter (no `ngOnChanges`): igual que en `MunicipioInputComponent`, el
   * valor real suele llegar después del primer render (carga async del
   * padre) — este setter resuelve el `label` contra el catálogo cada vez
   * que el padre empuja un valor nuevo, sin depender de que `ngOnInit` ya
   * haya corrido (el catálogo cachea con `shareReplay`, así que no importa
   * el orden de suscripción).
   */
  @Input() set value(v: string | null) {
    const next = v || '';
    if (next === (this.lastEmitted || '')) return;
    this.lastEmitted = v;

    if (!v) {
      this.selectedDepartamentoCodigo = '';
      this.selectedLabel = '';
      this.ciudades = [];
      return;
    }
    if (this.allowRemote && v === REMOTE_LABEL) {
      this.selectedDepartamentoCodigo = REMOTE_SENTINEL;
      this.selectedLabel = '';
      this.ciudades = [];
      return;
    }
    this.catalog.findByLabel(v).subscribe((m) => {
      if (!m) return;
      this.selectedDepartamentoCodigo = m.departamentoCodigo;
      this.selectedLabel = m.label;
      this.catalog.getMunicipiosByDepartamento(m.departamentoCodigo).subscribe((list) => (this.ciudades = list));
    });
  }

  ngOnInit() {
    this.catalog.getDepartamentos().subscribe((d) => (this.departamentos = d));
  }

  onDepartamentoChange(codigo: string) {
    this.selectedDepartamentoCodigo = codigo;
    this.selectedLabel = '';
    this.ciudades = [];

    if (codigo === REMOTE_SENTINEL) {
      this.emit(REMOTE_LABEL);
      return;
    }
    // El value queda incompleto hasta que se elija una ciudad — se limpia lo que hubiera antes.
    this.emit(null);
    if (!codigo) return;
    this.catalog.getMunicipiosByDepartamento(codigo).subscribe((list) => (this.ciudades = list));
  }

  onCiudadChange(label: string) {
    this.selectedLabel = label;
    this.emit(label || null);
  }

  private emit(v: string | null) {
    this.lastEmitted = v;
    this.valueChange.emit(v);
  }
}
