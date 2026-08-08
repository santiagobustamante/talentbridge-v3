import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class SkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Nombres de habilidad distintos entre perfiles publicados — puebla el filtro de búsqueda de candidatos. */
  async findDistinctPublishedSkillNames(limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findMany({
      select: { normalizedName: true },
      distinct: ['normalizedName'],
      take: limit,
      where: { profile: { isPublished: true } },
    });
  }

  /** Autocompletado de habilidades — busca por coincidencia parcial, sin filtrar por perfil publicado. */
  async searchDistinctSkillNames(query: string, limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findMany({
      where: { normalizedName: { contains: query } },
      select: { normalizedName: true },
      distinct: ['normalizedName'],
      take: limit,
    });
  }

  /** Habilidades (nombre/nivel) de un perfil — insumo de `computeSkillMatch` para calcular el % de coincidencia contra una oferta laboral. */
  async findByProfileId(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findMany({
      where: { profileId },
      select: { normalizedName: true, level: true },
    });
  }

  /** Registro completo (no solo nombre/nivel) con los avales y quién los dio — pantalla de Habilidades del candidato (`SkillsService.getSkills`). */
  async findByProfileIdWithEndorsements(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      include: {
        endorsements: {
          include: { company: { select: { companyProfile: { select: { companyName: true } } } } },
        },
      },
    });
  }

  /** Existencia por nombre normalizado dentro de un perfil — chequeo anti-duplicado de `SkillsService.addSkill`. */
  async findByProfileIdAndNormalizedName(profileId: number, normalizedName: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findUnique({ where: { profileId_normalizedName: { profileId, normalizedName } } });
  }

  /** `UncheckedCreateInput`: el service arma `profileId` como FK escalar directa. */
  async create(data: Prisma.SkillUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.create({ data });
  }

  /** Chequeo de pertenencia — reusado por `updateSkill` y `removeSkill`. */
  async findByIdAndProfileId(skillId: number, profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findFirst({ where: { id: skillId, profileId } });
  }

  async update(skillId: number, data: Prisma.SkillUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.update({ where: { id: skillId }, data });
  }

  async delete(skillId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.delete({ where: { id: skillId } });
  }

  /** Habilidad + el `userId` de su dueño — `SkillsService.endorseSkill` necesita saber a quién pertenece la skill para chequear la regla de elegibilidad de avales. */
  async findByIdWithProfileUserId(skillId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skill.findUnique({
      where: { id: skillId },
      include: { profile: { select: { userId: true } } },
    });
  }
}
