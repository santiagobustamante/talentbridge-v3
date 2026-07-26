import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { IsValidMunicipio, IsValidUrl } from '@app/common';

export class CompanyProfileDto {
  // `@IsOptional()` porque este DTO también sirve para un PATCH parcial
  // (no hace falta reenviar companyName si no cambió), pero a diferencia
  // del resto de campos de este perfil, `companyName` es NOT NULL en la
  // base — `@IsNotEmpty()` evita que, si el campo sí viene, llegue vacío y
  // borre silenciosamente el nombre de la empresa.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @IsValidMunicipio()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsValidUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsValidUrl()
  logoUrl?: string;
}
