import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Rechaza una fecha (string parseable por `Date`) posterior al momento actual.
 * `null`/`undefined`/`''` se consideran válidos — combinar con `@IsOptional()`
 * para campos no obligatorios, esta validación es solo sobre el valor si existe.
 */
export function IsNotFutureDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDateString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          const parsed = new Date(value);
          return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
        },
        defaultMessage() {
          return '$property no puede ser una fecha futura';
        },
      },
    });
  };
}
