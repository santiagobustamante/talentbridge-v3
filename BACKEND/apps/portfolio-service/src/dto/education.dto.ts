import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { IsNotFutureDateString, IsAfterOrEqualDateString } from '@app/common';

const EDUCATION_TYPES = ['FORMAL', 'NON_FORMAL'] as const;
const FORMATION_LEVELS = [
  'Curso', 'Certificación', 'Diplomado', 'Seminario', 'Bootcamp',
  'Bachillerato', 'Técnico', 'Tecnólogo', 'Universidad', 'Posgrado',
] as const;

export class EducationDto {
  @IsString()
  @MaxLength(150)
  institution: string;

  @IsString()
  @MaxLength(150)
  degree: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fieldOfStudy?: string;

  @IsOptional()
  @IsIn(EDUCATION_TYPES)
  educationType?: string;

  @IsOptional()
  @IsIn(FORMATION_LEVELS)
  formationLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  @IsNotFutureDateString()
  @IsAfterOrEqualDateString('startDate')
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
