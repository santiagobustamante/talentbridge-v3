import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class EducationDto {
  @IsString()
  institution: string;

  @IsString()
  degree: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  @IsString()
  educationType?: string;

  @IsOptional()
  @IsString()
  formationLevel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
