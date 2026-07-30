import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { Prisma } from '@app/database';
import { getPaginationLimits, clampLimit } from '@app/common';

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
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions() {
    const skills = await this.prisma.skill.findMany({
      select: { normalizedName: true },
      distinct: ['normalizedName'],
      take: 50,
      where: {
        profile: { isPublished: true },
      },
    });

    const cities = await this.prisma.profile.findMany({
      select: { city: true },
      where: { isPublished: true, city: { not: null } },
      distinct: ['city'],
      take: 30,
    });

    const professions = await this.prisma.profile.findMany({
      select: { professionalTitle: true },
      where: { isPublished: true, professionalTitle: { not: null } },
      distinct: ['professionalTitle'],
      take: 30,
    });

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
      this.prisma.profile.findMany({
        where,
        include: {
          skills: { include: { endorsements: true } },
          _count: { select: { experiences: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.profile.count({ where }),
    ]);

    // Para saber, sin N+1 queries, a qué candidatos de esta página ya puede
    // avalar la empresa (misma regla que SkillsService.companyHasContactedCandidate:
    // conversación o postulación previa) — se resuelve en 2 queries batch en vez
    // de una por candidato.
    const candidateUserIds = profiles.map((p) => p.userId);
    const [conversedWith, appliedFrom] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { companyId: companyUserId, candidateId: { in: candidateUserIds } },
        select: { candidateId: true },
      }),
      this.prisma.jobApplication.findMany({
        where: { jobOffer: { companyId: companyUserId }, candidateId: { in: candidateUserIds } },
        select: { candidateId: true },
      }),
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

    const skills = await this.prisma.skill.findMany({
      where: { normalizedName: { contains: query.toLocaleLowerCase('es-CO') } },
      select: { normalizedName: true },
      distinct: ['normalizedName'],
      take: 15,
    });

    return skills.map((s) => s.normalizedName);
  }
}
