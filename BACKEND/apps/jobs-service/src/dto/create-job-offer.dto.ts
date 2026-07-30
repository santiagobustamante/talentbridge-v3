import { IsString, IsOptional, IsInt, IsIn, Min, Max, MaxLength, ValidateBy, buildMessage, ValidationOptions } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { IsValidMunicipio, IsGreaterOrEqual } from '@app/common';

/** Única moneda que la app maneja hoy (ver `formatSalaryRange` en el frontend) — antes
 *  `currency` solo tenía `@MaxLength(10)`, así que cualquier string corto pasaba. */
const CURRENCIES = ['COP'] as const;

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

  // La lista de valores válidos ya no es un array estático acá — se
  // administra en SystemCatalog (panel admin) y JobsService la valida en
  // tiempo real contra la tabla antes de guardar (assertValidCatalogValue).
  // Solo se valida forma/longitud a nivel de DTO.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customContractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @IsGreaterOrEqual('salaryMin')
  salaryMax?: number;

  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: string;

  @IsOptional()
  @IsStringOrStringArray()
  skillsRequired?: string | string[];
}

/** Todos los campos opcionales: PATCH /company/jobs/:id actualiza solo lo que venga en
 *  el body, y con `CreateJobOfferDto` (title/description requeridos) el ValidationPipe
 *  rechazaba cualquier actualización parcial que no repitiera esos dos campos. */
export class UpdateJobOfferDto extends PartialType(CreateJobOfferDto) {}
