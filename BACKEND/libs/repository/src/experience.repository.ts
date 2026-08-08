import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class ExperienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProfileId(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.experience.findMany({ where: { profileId }, orderBy: { startDate: 'desc' } });
  }

  /** `UncheckedCreateInput`: el service arma `profileId` como FK escalar directa. */
  async create(data: Prisma.ExperienceUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.experience.create({ data });
  }

  /** Chequeo de pertenencia — reusado por `updateExperience` y `removeExperience`. */
  async findByIdAndProfileId(expId: number, profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.experience.findFirst({ where: { id: expId, profileId } });
  }

  async update(expId: number, data: Prisma.ExperienceUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.experience.update({ where: { id: expId }, data });
  }

  async delete(expId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.experience.delete({ where: { id: expId } });
  }
}
