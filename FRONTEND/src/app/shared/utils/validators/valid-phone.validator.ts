import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizePhoneStorage } from '../normalize/phone.util';

/**
 * Valida que, si el campo tiene contenido, tenga una cantidad de dígitos real
 * de teléfono (10 dígitos locales colombianos, o hasta 12 con indicativo) —
 * antes no había ningún chequeo de formato acá, así que "1" pasaba igual que
 * un teléfono real. Campo vacío es válido (es opcional).
 */
export const validPhone: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const digits = normalizePhoneStorage(value).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 12 ? null : { validPhone: true };
};
