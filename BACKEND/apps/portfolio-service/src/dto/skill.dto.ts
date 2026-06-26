import { IsString, IsOptional, IsIn } from 'class-validator';

const LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export class SkillDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: string;
}
