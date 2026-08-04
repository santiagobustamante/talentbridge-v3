import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { IsNotFutureDateString, IsAfterOrEqualDateString } from '@app/common';

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
  @IsString()
  @MaxLength(50)
  educationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  formationLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customFormationLevel?: string;

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
