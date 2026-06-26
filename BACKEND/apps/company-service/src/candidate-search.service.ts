import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { Prisma } from '@app/database';

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
    const limit = Math.min(params.limit || 20, 100);

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

    const searchSkills = skills?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) || [];

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
          skills: true,
          _count: { select: { experiences: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.profile.count({ where }),
    ]);

    const data = profiles.map((profile) => {
      const profileSkillNames = profile.skills.map((s) => s.normalizedName.toLowerCase());
      const matchedSkills = searchSkills.length
        ? searchSkills.filter((s) => profileSkillNames.includes(s))
        : [];

      return {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        professionalTitle: profile.professionalTitle,
        city: profile.city,
        summary: profile.summary,
        slug: profile.slug,
        isPublished: profile.isPublished,
        skills: profile.skills.map((s) => ({ name: s.name, level: s.level })),
        matchedSkills,
        experiencesCount: profile._count.experiences,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => {
      if (searchSkills.length > 0 && mode?.toUpperCase() === 'ALL') {
        return candidate.matchedSkills!.length >= searchSkills.length;
      }
      return true;
    });

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
      where: { normalizedName: { contains: query.toLowerCase() } },
      select: { normalizedName: true },
      distinct: ['normalizedName'],
      take: 15,
    });

    return skills.map((s) => s.normalizedName);
  }
}
