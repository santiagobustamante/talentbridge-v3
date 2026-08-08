import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class CvAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCvDocumentId(cvDocumentId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvAnalysis.findMany({ where: { cvDocumentId }, orderBy: { createdAt: 'desc' } });
  }

  /** `UncheckedCreateInput`: el service arma `cvDocumentId` como FK escalar directa. */
  async create(data: Prisma.CvAnalysisUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvAnalysis.create({ data });
  }
}
