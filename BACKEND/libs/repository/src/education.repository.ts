import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class EducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProfileId(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.education.findMany({ where: { profileId }, orderBy: { startDate: 'desc' } });
  }

  /** `UncheckedCreateInput`: el service arma `profileId` como FK escalar directa. */
  async create(data: Prisma.EducationUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.education.create({ data });
  }

  /** Chequeo de pertenencia — reusado por `updateEducation` y `removeEducation`. */
  async findByIdAndProfileId(eduId: number, profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.education.findFirst({ where: { id: eduId, profileId } });
  }

  async update(eduId: number, data: Prisma.EducationUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.education.update({ where: { id: eduId }, data });
  }

  async delete(eduId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.education.delete({ where: { id: eduId } });
  }
}
