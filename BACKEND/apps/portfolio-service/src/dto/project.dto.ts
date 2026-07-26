import { IsString, IsOptional, IsArray, IsIn, MaxLength } from 'class-validator';
import { IsNotFutureDateString, IsAfterOrEqualDateString, IsValidUrl } from '@app/common';

const PROJECT_TYPES = ['INDIVIDUAL', 'TEAM'] as const;
const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'] as const;

export class ProjectDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  responsibilities?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsValidUrl()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsValidUrl()
  demoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsValidUrl()
  imageUrl?: string;

  @IsOptional()
  @IsIn(PROJECT_TYPES)
  projectType?: string;

  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @IsNotFutureDateString()
  @IsAfterOrEqualDateString('startDate')
  endDate?: string;
}
