import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';
import { getPaginationLimits, clampLimit } from '@app/common';
import { ProfileRepository, SkillRepository, ConversationRepository, JobApplicationRepository } from '@app/repository';

interface SearchParams {
  q?: string;
  city?: string;
  profession?: string;
  skills?: string;
  mode?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CandidateSearchService {
  constructor(
    // `prisma` se conserva solo para `getPaginationLimits`, utilidad
    // compartida en `libs/common` (también la usan applications-service y
    // jobs-service) que toma un `PrismaLike` — no es un acceso a modelo
    // directo de este service, así que queda fuera del alcance de esta
    // migración (se revisará si conviene refactorizarla al construir
    // `SystemParameterRepository` en la Fase 4).
    private readonly prisma: PrismaService,
    private readonly profileRepository: ProfileRepository,
    private readonly skillRepository: SkillRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly jobApplicationRepository: JobApplicationRepository,
  ) {}

  async getFilterOptions() {
    const skills = await this.skillRepository.findDistinctPublishedSkillNames(50);
    const cities = await this.profileRepository.findDistinctCities(30);
    const professions = await this.profileRepository.findDistinctProfessions(30);

    return {
      skills: skills.map((s) => s.normalizedName),
      cities: cities.map((c) => c.city).filter(Boolean),
      professions: professions.map((p) => p.professionalTitle).filter(Boolean),
    };
  }

  async search(companyUserId: number, params: SearchParams) {
    const { q, city, profession, skills, mode } = params;
    const page = params.page || 1;
    const paginationLimits = await getPaginationLimits(this.prisma);
    const limit = clampLimit(params.limit, paginationLimits);

    const where: Prisma.ProfileWhereInput = { isPublished: true };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { professionalTitle: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (profession) {
      where.professionalTitle = { contains: profession, mode: 'insensitive' };
    }

    const searchSkills = skills?.split(',').map((s) => s.trim().toLocaleLowerCase('es-CO')).filter(Boolean) || [];

    if (searchSkills.length > 0) {
      if (mode?.toUpperCase() === 'ALL') {
        where.AND = searchSkills.map((skill) => ({
          skills: { some: { normalizedName: skill } },
        }));
      } else {
        where.skills = { some: { normalizedName: { in: searchSkills } } };
      }
    }

    const [profiles, total] = await Promise.all([
      this.profileRepository.searchPublished(where, (page - 1) * limit, limit),
      this.profileRepository.countPublished(where),
    ]);

    // Para saber, sin N+1 queries, a qué candidatos de esta página ya puede
    // avalar la empresa (misma regla que SkillsService.companyHasContactedCandidate:
    // conversación o postulación previa) — se resuelve en 2 queries batch en vez
    // de una por candidato.
    const candidateUserIds = profiles.map((p) => p.userId);
    const [conversedWith, appliedFrom] = await Promise.all([
      this.conversationRepository.findManyForCompanyAndCandidates(companyUserId, candidateUserIds),
      this.jobApplicationRepository.findManyForCompanyAndCandidates(companyUserId, candidateUserIds),
    ]);
    const endorsableCandidateIds = new Set([
      ...conversedWith.map((c) => c.candidateId),
      ...appliedFrom.map((a) => a.candidateId),
    ]);

    const data = profiles.map((profile) => {
      const profileSkillNames = profile.skills.map((s) => s.normalizedName.toLocaleLowerCase('es-CO'));
      // Se calcula siempre sobre los datos reales (independiente de
      // `showSkills`) porque el filtro modo "ALL" de abajo lo necesita para
      // decidir qué candidatos calificaron en la búsqueda — el toggle de
      // privacidad solo determina si esto se expone en la respuesta, no si
      // el candidato es encontrable por skill.
      const matchedSkills = searchSkills.length
        ? searchSkills.filter((s) => profileSkillNames.includes(s))
        : [];

      return {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        professionalTitle: profile.professionalTitle,
        // Respeta los toggles de privacidad del candidato (mismos
        // `showCity`/`showSkills` que ya aplica el portafolio público) —
        // sin esto, una empresa veía la ciudad y las habilidades de
        // cualquier candidato aunque las hubiera marcado como ocultas.
        city: profile.showCity ? profile.city : '',
        summary: profile.summary,
        slug: profile.slug,
        isPublished: profile.isPublished,
        skills: profile.showSkills
          ? profile.skills.map((s) => ({
              id: s.id,
              name: s.name,
              level: s.level,
              endorsementCount: s.endorsements.length,
              endorsedByMe: s.endorsements.some((e) => e.companyId === companyUserId),
            }))
          : [],
        matchedSkills: profile.showSkills ? matchedSkills : [],
        experiencesCount: profile._count.experiences,
        canEndorse: endorsableCandidateIds.has(profile.userId),
        _matchCount: matchedSkills.length,
      };
    })
    .filter((candidate) => {
      if (searchSkills.length > 0 && mode?.toUpperCase() === 'ALL') {
        return candidate._matchCount >= searchSkills.length;
      }
      return true;
    })
    .map(({ _matchCount, ...candidate }) => candidate);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async suggestions(query: string) {
    if (!query || query.length < 2) return [];

    const skills = await this.skillRepository.searchDistinctSkillNames(query.toLocaleLowerCase('es-CO'), 15);

    return skills.map((s) => s.normalizedName);
  }
}
