import { IsString, IsOptional, IsInt, IsIn, Min, Max, MaxLength, ValidateBy, buildMessage, ValidationOptions } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { IsValidMunicipio } from '@app/common';

const MODALITIES = ['Remoto', 'Híbrido', 'Presencial'] as const;
const CONTRACT_TYPES = [
  'Término indefinido', 'Término fijo', 'Obra o labor', 'Aprendizaje',
  'Prestación de servicios', 'Temporal / ocasional / accidental', 'Prácticas', 'Otro',
] as const;
const WORKLOADS = ['Tiempo completo', 'Medio tiempo', 'Por horas', 'Turnos', 'Flexible', 'Otra'] as const;

/** El frontend siempre manda un string ya serializado ("Angular:ADVANCED,SQL"), pero el
 *  service también acepta un array de strings (una skill por elemento) por flexibilidad
 *  de API — esta validación cubre ambas formas sin perder esa flexibilidad. */
function IsStringOrStringArray(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isStringOrStringArray',
      validator: {
        validate: (value): boolean =>
          typeof value === 'string' || (Array.isArray(value) && value.every((v) => typeof v === 'string')),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property debe ser un texto o una lista de textos`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

export class CreateJobOfferDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(8000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  requirements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  responsibilities?: string;

  @IsOptional()
  @IsString()
  @IsValidMunicipio({ allowRemote: true })
  city?: string;

  @IsOptional()
  @IsIn(MODALITIES)
  modality?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customContractType?: string;

  @IsOptional()
  @IsIn(WORKLOADS)
  workload?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customWorkload?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  salaryMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsStringOrStringArray()
  skillsRequired?: string | string[];
}

/** Todos los campos opcionales: PATCH /company/jobs/:id actualiza solo lo que venga en
 *  el body, y con `CreateJobOfferDto` (title/description requeridos) el ValidationPipe
 *  rechazaba cualquier actualización parcial que no repitiera esos dos campos. */
export class UpdateJobOfferDto extends PartialType(CreateJobOfferDto) {}
