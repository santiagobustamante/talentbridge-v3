import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SkillDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;
}
