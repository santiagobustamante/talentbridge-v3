import { IsString, IsOptional, IsNotEmpty, IsArray, MaxLength } from 'class-validator';
import { IsNotFutureDateString, IsAfterOrEqualDateString, IsValidUrl } from '@app/common';

// Antes solo `name` era obligatorio -- un proyecto se podía guardar con un
// solo campo lleno. Descripción/rol/tipo/estado/fecha de inicio ahora se
// exigen también (URLs, responsabilidades y fecha fin siguen opcionales:
// no todo proyecto tiene repo público, demo, o ya terminó).
export class ProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  role: string;

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

  @IsString()
  @MaxLength(50)
  projectType: string;

  @IsString()
  @MaxLength(50)
  status: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsString()
  @IsNotFutureDateString()
  @IsAfterOrEqualDateString('startDate')
  endDate?: string;
}
