import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

/**
 * Acceso a datos del modelo `Report` — arranca mínimo acá (Fase 4 del patrón
 * repositorio, primer consumidor: `JobsService.reportJob`) y se extiende en
 * la Fase 6 (chat-service) y la Fase 8 (moderación desde el panel admin).
 */
@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `UncheckedCreateInput`: los llamadores arman `reporterId` como FK escalar directa, no como `reporter: { connect }`. */
  async create(data: Prisma.ReportUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.report.create({ data });
  }

  /** `where` dinámico (estado/tipo de destino) armado por `ModerationService.list` — panel de moderación. */
  async findManyWithFilters(where: Prisma.ReportWhereInput, skip: number, take: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        reporter: { select: { email: true } },
        reviewedBy: { select: { email: true } },
      },
    });
  }

  /** Reusado tanto para el total paginado de `findManyWithFilters` como para el conteo simple de pendientes del dashboard (`{status: 'PENDING'}`). */
  async count(where: Prisma.ReportWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.report.count({ where });
  }

  async findById(reportId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.report.findUnique({ where: { id: reportId } });
  }

  /** `UncheckedUpdateInput`: `ModerationService.resolve` arma `reviewedById` como FK escalar directa. */
  async update(reportId: number, data: Prisma.ReportUncheckedUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.report.update({ where: { id: reportId }, data });
  }
}
