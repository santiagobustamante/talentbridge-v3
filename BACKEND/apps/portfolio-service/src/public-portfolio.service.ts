import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { CandidateAccessService } from './candidate-access.service';

@Injectable()
export class PublicPortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateAccess: CandidateAccessService,
  ) {}

  async getBySlug(slug: string, viewer?: { sub: number; role?: string }) {
    const profile = await this.prisma.profile.findUnique({
      where: { slug },
      include: {
        skills: { include: { endorsements: true } },
        experiences: true,
        educations: true,
        projects: true,
        user: { select: { email: true } },
      },
    });

    if (!profile || !profile.isPublished) {
      throw new NotFoundException('Portafolio no encontrado o no publicado');
    }

    let canEndorse: boolean | undefined;
    if (viewer?.role === 'COMPANY' && viewer.sub !== profile.userId) {
      await this.recordView(profile.id, viewer.sub);
      canEndorse = await this.candidateAccess.companyHasContactedCandidate(viewer.sub, profile.userId);
    }

    return this.filterByVisibility(profile, viewer, canEndorse);
  }

  /** No registra un nuevo view si la misma empresa ya vio este perfil en los últimos 10 minutos — evita inflar el contador con refrescos de la misma visita. */
  private async recordView(profileId: number, companyUserId: number): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await this.prisma.profileView.findFirst({
      where: { profileId, companyUserId, createdAt: { gte: tenMinutesAgo } },
    });
    if (recent) return;

    await this.prisma.profileView.create({
      data: { profileId, companyUserId },
    });
  }

  async getPreview(userId: number) {
    if (!userId) {
      throw new NotFoundException('Usuario no autenticado');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: { include: { endorsements: true } },
        experiences: true,
        educations: true,
        projects: true,
        user: { select: { email: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.filterByVisibility(profile);
  }

  private filterByVisibility(profile: any, viewer?: { sub: number; role?: string }, canEndorse?: boolean) {
    const result: any = {
      slug: profile.slug,
      fullName: profile.fullName,
      professionalTitle: profile.professionalTitle,
      summary: profile.summary,
      photoUrl: profile.photoUrl,
      isPublished: profile.isPublished,
      showPhone: profile.showPhone,
      showCity: profile.showCity,
      showLinkedin: profile.showLinkedin,
      showGithub: profile.showGithub,
      showWebsite: profile.showWebsite,
      showExperience: profile.showExperience,
      showEducation: profile.showEducation,
      showProjects: profile.showProjects,
      showSkills: profile.showSkills,
    };

    if (profile.showCity) result.city = profile.city;
    if (profile.showPhone) result.phone = profile.phone;
    if (profile.showLinkedin) result.linkedinUrl = profile.linkedinUrl;
    if (profile.showGithub) result.githubUrl = profile.githubUrl;
    if (profile.showWebsite) result.websiteUrl = profile.websiteUrl;
    if (profile.showSkills) {
      const isCompanyViewer = viewer?.role === 'COMPANY';
      result.skills = profile.skills.map((s: any) => ({
        id: s.id,
        name: s.name,
        level: s.level,
        endorsementCount: s.endorsements?.length ?? 0,
        ...(isCompanyViewer ? { endorsedByMe: s.endorsements.some((e: any) => e.companyId === viewer!.sub) } : {}),
      }));
      if (isCompanyViewer) result.canEndorse = canEndorse ?? false;
    }
    if (profile.showExperience) result.experiences = profile.experiences;
    if (profile.showEducation) result.educations = profile.educations;
    if (profile.showProjects) result.projects = profile.projects;

    return result;
  }
}
