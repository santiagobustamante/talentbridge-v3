import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * `Validators.required` de Angular solo rechaza `null`/`undefined`/`''` — un
 * string de solo espacios ("   ") pasa como válido. Para campos de texto
 * obligatorios (nombre, institución, cargo, etc.) eso deja completar el
 * formulario con un valor que, tras el `trim()` que igual aplica el backend
 * al guardar, termina siendo un registro con el campo vacío. Combinar con
 * `Validators.required` (este validador no reemplaza esa falta-de-valor).
 */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || value === '') return null;
  return value.trim() ? null : { notBlank: true };
};
