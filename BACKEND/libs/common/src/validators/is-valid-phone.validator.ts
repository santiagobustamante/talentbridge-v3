import { registerDecorator, ValidationOptions } from 'class-validator';
import { normalizePhoneStorage } from '../normalize/phone.util';

/**
 * Valida que el valor, si viene, tenga una cantidad de dígitos real de teléfono
 * (10 dígitos locales colombianos, o hasta 12 si el usuario incluyó el
 * indicativo "57") — antes no había ningún chequeo de formato, así que un
 * valor de 1 dígito se guardaba igual que uno real. Usa `normalizePhoneStorage`
 * para no rechazar algo que el propio guardado va a normalizar igual.
 */
export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          const digits = normalizePhoneStorage(value).replace(/\D/g, '');
          return digits.length >= 10 && digits.length <= 12;
        },
        defaultMessage() {
          return '$property debe ser un teléfono válido (10 dígitos, con indicativo opcional)';
        },
      },
    });
  };
}
