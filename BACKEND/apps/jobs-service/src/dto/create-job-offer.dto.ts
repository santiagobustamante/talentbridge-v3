import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateJobOfferDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  customContractType?: string;

  @IsOptional()
  @IsString()
  workload?: string;

  @IsOptional()
  @IsString()
  customWorkload?: string;

  @IsOptional()
  @IsInt()
  salaryMin?: number;

  @IsOptional()
  @IsInt()
  salaryMax?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  skillsRequired?: string | string[];
}
