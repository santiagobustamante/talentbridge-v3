import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizeNitStorage } from '../normalize/nit.util';

/**
 * Valida que, si el campo tiene contenido, tenga 9-10 dígitos (cuerpo + dígito
 * de verificación de un NIT colombiano real) — antes no había ningún chequeo
 * de formato acá. No calcula el dígito de verificación real (algoritmo DIAN)
 * a propósito, ver `docs/plan-barrido-validaciones-y-datos-2026-07-26.md` 0.2.
 * Campo vacío es válido (es opcional).
 */
export const validNit: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const digits = normalizeNitStorage(value);
  return digits.length >= 9 && digits.length <= 10 ? null : { validNit: true };
};
