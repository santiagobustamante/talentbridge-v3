import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { IsValidMunicipio } from '@app/common';

export class ProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  professionalTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @IsValidMunicipio()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  githubUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  showCity?: boolean;

  @IsOptional()
  @IsBoolean()
  showLinkedin?: boolean;

  @IsOptional()
  @IsBoolean()
  showGithub?: boolean;

  @IsOptional()
  @IsBoolean()
  showWebsite?: boolean;

  @IsOptional()
  @IsBoolean()
  showExperience?: boolean;

  @IsOptional()
  @IsBoolean()
  showEducation?: boolean;

  @IsOptional()
  @IsBoolean()
  showProjects?: boolean;

  @IsOptional()
  @IsBoolean()
  showSkills?: boolean;
}
