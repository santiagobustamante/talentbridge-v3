import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { trimText, titleCaseText, normalizePhoneStorage, normalizeUrl } from '@app/common';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        projects: true,
        views: {
          select: { id: true, createdAt: true, companyUser: { select: { email: true, companyProfile: { select: { companyName: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const skillCount = profile.skills.length;
    const hasExperience = profile.experiences.length > 0;
    const hasEducation = profile.educations.length > 0;
    const hasProjects = profile.projects.length > 0;
    const hasBasicInfo = !!(profile.fullName && profile.professionalTitle);

    let completion = 0;
    if (hasBasicInfo) completion += 25;
    if (skillCount > 0) completion += 25;
    if (hasExperience || hasEducation) completion += 25;
    if (hasProjects) completion += 25;

    return {
      ...profile,
      completionPercentage: completion,
    };
  }

  async updateProfile(userId: number, dto: Partial<ProfileDto>) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.prisma.profile.update({
      where: { userId },
      data: this.normalizeProfileDto(dto),
    });
  }

  /** El frontend ya manda los campos formateados, pero no se confía solo en eso —
   *  se vuelve a normalizar acá antes de persistir. */
  private normalizeProfileDto(dto: Partial<ProfileDto>): Partial<ProfileDto> {
    const normalized: Partial<ProfileDto> = { ...dto };

    if (dto.fullName !== undefined) normalized.fullName = titleCaseText(dto.fullName);
    if (dto.professionalTitle !== undefined) normalized.professionalTitle = titleCaseText(dto.professionalTitle);
    if (dto.city !== undefined) normalized.city = titleCaseText(dto.city);
    if (dto.summary !== undefined) normalized.summary = trimText(dto.summary);
    if (dto.phone !== undefined) normalized.phone = dto.phone ? normalizePhoneStorage(dto.phone) : dto.phone;
    if (dto.linkedinUrl !== undefined) normalized.linkedinUrl = dto.linkedinUrl ? normalizeUrl(dto.linkedinUrl) : dto.linkedinUrl;
    if (dto.githubUrl !== undefined) normalized.githubUrl = dto.githubUrl ? normalizeUrl(dto.githubUrl) : dto.githubUrl;
    if (dto.websiteUrl !== undefined) normalized.websiteUrl = dto.websiteUrl ? normalizeUrl(dto.websiteUrl) : dto.websiteUrl;

    return normalized;
  }

  async generateSlug(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const email = (await this.prisma.user.findUnique({ where: { id: userId } }))?.email || '';
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    let slug = base;
    let counter = 1;
    while (await this.prisma.profile.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }

    return this.prisma.profile.update({
      where: { userId },
      data: { slug },
    });
  }

  async getProfileViews(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const views = await this.prisma.profileView.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        companyUser: {
          select: {
            email: true,
            companyProfile: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });

    return {
      total: views.length,
      views,
    };
  }
}

interface ProfileDto {
  fullName?: string;
  professionalTitle?: string;
  summary?: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  isPublished?: boolean;
  showPhone?: boolean;
  showCity?: boolean;
  showLinkedin?: boolean;
  showGithub?: boolean;
  showWebsite?: boolean;
  showExperience?: boolean;
  showEducation?: boolean;
  showProjects?: boolean;
  showSkills?: boolean;
}
