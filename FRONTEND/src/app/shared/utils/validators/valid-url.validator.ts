import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidUrl } from '../normalize/url.util';

/**
 * Valida que, si el campo tiene contenido, termine siendo una URL http(s)
 * bien formada tras normalizar (`isValidUrl` agrega https:// si hacía falta
 * antes de chequear) — campo vacío es válido (estos campos son opcionales).
 */
export const validUrl: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || !value.trim()) return null;
  return isValidUrl(value) ? null : { validUrl: true };
};
