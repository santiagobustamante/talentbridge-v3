import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Rechaza una fecha (string parseable por `Date`) anterior a la de otro campo del
 * mismo DTO (ej. `endDate` respecto a `startDate`) — sin esto, experiencias/educación/
 * proyectos podían guardarse con un rango invertido ("desde 2026 hasta 2020"). Si
 * cualquiera de las dos fechas falta o no parsea, no valida acá — de eso ya se
 * encargan `@IsString()`/`@IsOptional()` en cada campo.
 */
export function IsAfterOrEqualDateString(relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterOrEqualDateString',
      target: object.constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value == null || value === '') return true;
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
          if (relatedValue == null || relatedValue === '') return true;
          if (typeof value !== 'string' || typeof relatedValue !== 'string') return true;

          const end = new Date(value);
          const start = new Date(relatedValue);
          if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return true;

          return end.getTime() >= start.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          return `$property no puede ser anterior a ${relatedProperty}`;
        },
      },
    });
  };
}
