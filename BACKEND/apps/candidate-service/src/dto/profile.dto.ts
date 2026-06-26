import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  professionalTitle?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  githubUrl?: string;

  @IsOptional()
  @IsString()
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
