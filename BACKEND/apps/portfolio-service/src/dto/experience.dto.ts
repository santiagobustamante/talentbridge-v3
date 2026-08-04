import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { IsValidMunicipio, IsNotFutureDateString, IsAfterOrEqualDateString } from '@app/common';

export class ExperienceDto {
  @IsString()
  @MaxLength(150)
  company: string;

  @IsString()
  @MaxLength(150)
  position: string;

  @IsOptional()
  @IsString()
  @IsValidMunicipio({ allowRemote: true })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  workMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customContractType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  functions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  achievements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tools?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learnedSkills?: string[];

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
