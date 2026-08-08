import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class AdminAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `UncheckedCreateInput`: el service arma `adminId` como FK escalar directa. */
  async create(data: Prisma.AdminAuditLogUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.adminAuditLog.create({ data });
  }

  /** `where` dinámico (filtros de entidad/fecha) armado por `AuditLogService.list` — acá solo se ejecuta la consulta paginada, con el email/nombre del admin que hizo la acción. */
  async findManyWithFilters(where: Prisma.AdminAuditLogWhereInput, skip: number, take: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { admin: { select: { email: true, name: true } } },
    });
  }

  /** Total de filas que matchean el mismo `where` dinámico usado por `findManyWithFilters` — para la paginación. */
  async count(where: Prisma.AdminAuditLogWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.adminAuditLog.count({ where });
  }

  /** Valores distintos de `entityType` ya registrados — puebla el selector de filtro del panel sin hardcodear la lista de entidades posibles. */
  async findDistinctEntityTypes(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.adminAuditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });
  }
}
