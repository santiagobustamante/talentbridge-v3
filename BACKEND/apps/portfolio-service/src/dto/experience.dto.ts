import { IsString, IsOptional, IsBoolean, IsArray, IsIn, MaxLength } from 'class-validator';
import { IsValidMunicipio, IsNotFutureDateString, IsAfterOrEqualDateString } from '@app/common';

const WORK_MODES = ['ONSITE', 'REMOTE', 'HYBRID'] as const;
const CONTRACT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERNSHIP', 'FREELANCE', 'TEMPORARY', 'OTHER'] as const;

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
  @IsIn(WORK_MODES)
  workMode?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: string;

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
