import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

const LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export class SkillDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: string;
}
