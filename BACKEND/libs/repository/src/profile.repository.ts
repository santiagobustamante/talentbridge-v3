import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

/** Include compartido por `findBySlugWithPortfolioDetails`/`findByUserIdWithPortfolioDetails` — el portafolio público (`PublicPortfolioService`), distinto del include de `findByUserIdWithFullDetails` (pantalla de perfil del propio candidato, incluye `views` en vez de `user.email`). */
const PORTFOLIO_DETAILS_INCLUDE = {
  skills: { include: { endorsements: true } },
  experiences: true,
  educations: true,
  projects: true,
  user: { select: { email: true } },
} satisfies Prisma.ProfileInclude;

/**
 * Acceso a datos del modelo `Profile` — arranca mínimo acá (Fase 1 del
 * patrón repositorio) y se extiende fase a fase a medida que cada service
 * que hoy usa `this.prisma.profile.*` directo migra sus consultas. Ver
 * `docs/plan-repository-pattern.md`.
 */
@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cada método acepta un `tx` opcional para poder participar de una transacción del service que lo llama, sin duplicar la consulta. */
  async findByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findUnique({ where: { userId } });
  }

  /** Perfil completo con todas las relaciones que arma la pantalla de perfil del candidato (skills/experiencia/educación/proyectos/vistas). */
  async findByUserIdWithFullDetails(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findUnique({
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
  }

  async findBySlug(slug: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findUnique({ where: { slug } });
  }

  async update(userId: number, data: Prisma.ProfileUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.update({ where: { userId }, data });
  }

  /** Ciudades distintas entre perfiles publicados — puebla el filtro de búsqueda de candidatos. */
  async findDistinctCities(limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findMany({
      select: { city: true },
      where: { isPublished: true, city: { not: null } },
      distinct: ['city'],
      take: limit,
    });
  }

  /** Profesiones distintas entre perfiles publicados — puebla el filtro de búsqueda de candidatos. */
  async findDistinctProfessions(limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findMany({
      select: { professionalTitle: true },
      where: { isPublished: true, professionalTitle: { not: null } },
      distinct: ['professionalTitle'],
      take: limit,
    });
  }

  /** Página de perfiles publicados que matchean el `where` dinámico armado por `CandidateSearchService` (filtros de texto/ciudad/profesión/skills quedan en el service, acá solo se ejecuta la consulta). */
  async searchPublished(
    where: Prisma.ProfileWhereInput,
    skip: number,
    take: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.profile.findMany({
      where,
      include: {
        skills: { include: { endorsements: true } },
        _count: { select: { experiences: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    });
  }

  /** Total de perfiles publicados que matchean el mismo `where` dinámico usado por `searchPublished` — para la paginación. */
  async countPublished(where: Prisma.ProfileWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.count({ where });
  }

  /** Perfiles publicados con sus skills (solo nombre/nivel) — insumo de `computeSkillMatch` para decidir a quién notificar cuando se publica una oferta nueva (`JobsService.notifyMatchingCandidates`). */
  async findPublishedWithSkillsForMatching(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findMany({
      where: { isPublished: true },
      select: {
        userId: true,
        skills: { select: { normalizedName: true, level: true } },
      },
    });
  }

  /** Portafolio público por slug — `PublicPortfolioService.getBySlug`. */
  async findBySlugWithPortfolioDetails(slug: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findUnique({ where: { slug }, include: PORTFOLIO_DETAILS_INCLUDE });
  }

  /** Vista previa del propio portafolio (antes de publicar) — `PublicPortfolioService.getPreview`. */
  async findByUserIdWithPortfolioDetails(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findUnique({ where: { userId }, include: PORTFOLIO_DETAILS_INCLUDE });
  }

  /**
   * Perfiles publicados con el registro completo de sus skills (no solo
   * nombre/nivel como `findPublishedWithSkillsForMatching`) — insumo del
   * asistente Joaquín del lado empresa (`AssistantService.getCompanyCandidateMatches`),
   * que además necesita `fullName`/`city`/`slug` para armar las tarjetas de
   * candidato sugeridas.
   */
  async findPublishedWithSkillsCapped(limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profile.findMany({
      where: { isPublished: true },
      include: { skills: true },
      take: limit,
    });
  }
}
