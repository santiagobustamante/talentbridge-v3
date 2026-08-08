import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProfileId(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.project.findMany({ where: { profileId }, orderBy: { createdAt: 'desc' } });
  }

  /** `UncheckedCreateInput`: el service arma `profileId` como FK escalar directa. */
  async create(data: Prisma.ProjectUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.project.create({ data });
  }

  /** Chequeo de pertenencia — reusado por `updateProject` y `removeProject`. */
  async findByIdAndProfileId(projId: number, profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.project.findFirst({ where: { id: projId, profileId } });
  }

  async update(projId: number, data: Prisma.ProjectUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.project.update({ where: { id: projId }, data });
  }

  async delete(projId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.project.delete({ where: { id: projId } });
  }
}
