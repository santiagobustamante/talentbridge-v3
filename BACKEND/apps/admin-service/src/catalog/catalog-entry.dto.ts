import { IsString, IsBoolean, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateCatalogEntryDto {
  @IsString()
  @MaxLength(100)
  value!: string;

  @IsString()
  @MaxLength(150)
  label!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCatalogEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
