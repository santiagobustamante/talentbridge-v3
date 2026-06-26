import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class ExperienceDto {
  @IsString()
  company: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  workMode?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  functions?: string;

  @IsOptional()
  @IsString()
  achievements?: string;

  @IsOptional()
  @IsString()
  tools?: string;

  @IsOptional()
  @IsArray()
  learnedSkills?: string[];

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
