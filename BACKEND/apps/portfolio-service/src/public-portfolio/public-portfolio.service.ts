import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';
import { ProfileRepository, ProfileViewRepository } from '@app/repository';
import { CandidateAccessService } from '../shared/candidate-access.service';

@Injectable()
export class PublicPortfolioService {
  constructor(
    // `prisma` se conserva solo para orquestar la transacción `Serializable`
    // de `recordView` — `$transaction` vive en `PrismaService`, no en un
    // repositorio (mismo criterio ya documentado en Fase 3/4 para otros
    // usos de `PrismaService` fuera de acceso directo a un modelo). Las dos
    // operaciones DENTRO de la transacción sí van por repositorio, pasando
    // el `tx` del callback.
    private readonly prisma: PrismaService,
    private readonly profileRepository: ProfileRepository,
    private readonly profileViewRepository: ProfileViewRepository,
    private readonly candidateAccess: CandidateAccessService,
  ) {}

  async getBySlug(slug: string, viewer?: { sub: number; role?: string }) {
    const profile = await this.profileRepository.findBySlugWithPortfolioDetails(slug);

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

  /**
   * No registra un nuevo view si la misma empresa ya vio este perfil en los
   * últimos 10 minutos — evita inflar el contador con refrescos de la misma
   * visita. El chequeo-y-creación va en una transacción SERIALIZABLE: sin
   * esto, dos requests casi simultáneas (doble tab, refresh muy rápido)
   * podían leer las dos "sin vista reciente" antes de que cualquiera
   * insertara, duplicando la fila. Bajo SERIALIZABLE, Postgres rechaza una
   * de las dos transacciones en conflicto — se ignora ese error porque acá
   * el objetivo es justamente deduplicar, así que un conflicto confirma que
   * la otra transacción concurrente ya registró la vista.
   */
  private async recordView(profileId: number, companyUserId: number): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const recent = await this.profileViewRepository.findRecentByProfileAndCompany(profileId, companyUserId, tenMinutesAgo, tx);
          if (recent) return;

          await this.profileViewRepository.create(profileId, companyUserId, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError)) throw err;
    }
  }

  async getPreview(userId: number) {
    if (!userId) {
      throw new NotFoundException('Usuario no autenticado');
    }

    const profile = await this.profileRepository.findByUserIdWithPortfolioDetails(userId);

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
