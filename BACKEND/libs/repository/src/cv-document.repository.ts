import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class CvDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      include: { analyses: true },
    });
  }

  /** Con sus análisis — usado por `getOne` (detalle de un CV puntual). */
  async findByIdAndUserIdWithAnalyses(cvId: number, userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.findFirst({ where: { id: cvId, userId }, include: { analyses: true } });
  }

  /** Chequeo de pertenencia sin el detalle de análisis — reusado por `analyzeCv`, `getAnalyses` y `deleteCv`. */
  async findByIdAndUserId(cvId: number, userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.findFirst({ where: { id: cvId, userId } });
  }

  /** `UncheckedCreateInput`: el service arma `userId` como FK escalar directa. */
  async create(data: Prisma.CvDocumentUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.create({ data });
  }

  async update(cvId: number, data: Prisma.CvDocumentUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.update({ where: { id: cvId }, data });
  }

  async delete(cvId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.cvDocument.delete({ where: { id: cvId } });
  }
}
