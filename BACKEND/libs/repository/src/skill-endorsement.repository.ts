import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class SkillEndorsementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotente a propósito: avalar dos veces la misma habilidad no duplica el aval. */
  async upsert(skillId: number, companyId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skillEndorsement.upsert({
      where: { skillId_companyId: { skillId, companyId } },
      create: { skillId, companyId },
      update: {},
    });
  }

  async deleteMany(skillId: number, companyId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.skillEndorsement.deleteMany({ where: { skillId, companyId } });
  }
}
