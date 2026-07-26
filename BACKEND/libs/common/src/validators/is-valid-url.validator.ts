import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidUrl } from '../normalize/url.util';

/**
 * Valida que el valor, si viene, sea una URL http(s) bien formada (o una ruta
 * relativa como "/assets/logo.svg") — usa la misma lógica que `normalizeUrl`
 * para no rechazar algo que el propio guardado va a normalizar igual.
 */
export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          return isValidUrl(value);
        },
        defaultMessage() {
          return '$property debe ser una URL válida que empiece con http:// o https://';
        },
      },
    });
  };
}
