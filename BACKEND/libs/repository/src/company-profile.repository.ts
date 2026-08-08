import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class CompanyProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.companyProfile.findUnique({ where: { userId } });
  }

  /** Solo los campos públicos — usado cuando un candidato ve el perfil de la empresa que le respondió/postuló. */
  async findPublicByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.companyProfile.findUnique({
      where: { userId },
      select: { companyName: true, sector: true, city: true, phone: true, websiteUrl: true, description: true, logoUrl: true },
    });
  }

  async update(userId: number, data: Prisma.CompanyProfileUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.companyProfile.update({ where: { userId }, data });
  }
}
