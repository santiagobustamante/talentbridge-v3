import { registerDecorator, ValidationOptions } from 'class-validator';
import { VALID_MUNICIPIO_LABELS, REMOTE_LABEL } from '../data/valid-municipios';

const VALID_SET = new Set(VALID_MUNICIPIO_LABELS);

export interface IsValidMunicipioOptions {
  /** Además de los 1.122 municipios reales, acepta el valor especial "Remoto" (ofertas/experiencia laboral remota). */
  allowRemote?: boolean;
}

/**
 * Valida que el valor sea exactamente el `label` de un municipio real de
 * Colombia ("Nombre, Departamento", ver BACKEND/prisma/data/municipios-colombia.json
 * — fuente DIVIPOLA/DANE) — o "Remoto" si `allowRemote` está activo. Reemplaza
 * el texto libre que tenía `city` antes: ya no alcanza con escribir cualquier
 * cosa, tiene que ser un municipio real (o remoto, donde aplica).
 */
export function IsValidMunicipio(options?: IsValidMunicipioOptions, validationOptions?: ValidationOptions) {
  const allowRemote = options?.allowRemote ?? false;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMunicipio',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          if (allowRemote && value === REMOTE_LABEL) return true;
          return VALID_SET.has(value);
        },
        defaultMessage() {
          return allowRemote
            ? '$property debe ser un municipio real de Colombia o "Remoto"'
            : '$property debe ser un municipio real de Colombia';
        },
      },
    });
  };
}
