import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  coverMessage?: string;
}
