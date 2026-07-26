import { registerDecorator, ValidationOptions } from 'class-validator';
import { normalizeNitStorage } from '../normalize/nit.util';

/**
 * Valida que el valor, si viene, tenga 9-10 dígitos (cuerpo + dígito de
 * verificación de un NIT colombiano real) — antes no había ningún chequeo de
 * formato, así que un valor de 1 dígito se guardaba igual que uno real. No
 * calcula el dígito de verificación real (algoritmo DIAN) a propósito: solo
 * se exige longitud, ver `docs/plan-barrido-validaciones-y-datos-2026-07-26.md`
 * ítem 0.2 para la decisión de no implementar el algoritmo completo.
 */
export function IsValidNit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidNit',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          const digits = normalizeNitStorage(value);
          return digits.length >= 9 && digits.length <= 10;
        },
        defaultMessage() {
          return '$property debe ser un NIT válido (9-10 dígitos)';
        },
      },
    });
  };
}
