import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Rechaza un número menor al de otro campo del mismo DTO (ej. `salaryMax`
 * respecto a `salaryMin`) — mismo patrón que `IsAfterOrEqualDateString` para
 * fechas, pero no existía equivalente para rangos numéricos: una oferta podía
 * guardarse con `salaryMin: 10000000, salaryMax: 1000000` (invertido) sin
 * ningún aviso. Si cualquiera de los dos valores falta o no es un número, no
 * valida acá — de eso ya se encargan `@IsInt()`/`@IsOptional()` en cada campo.
 */
export function IsGreaterOrEqual(relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGreaterOrEqual',
      target: object.constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value == null) return true;
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
          if (relatedValue == null) return true;
          if (typeof value !== 'number' || typeof relatedValue !== 'number') return true;

          return value >= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          return `$property no puede ser menor a ${relatedProperty}`;
        },
      },
    });
  };
}
