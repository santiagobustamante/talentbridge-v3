import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

interface RecordAuditEntry {
  adminId: number;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditEntry) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: (entry.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (entry.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
      },
    });
  }

  async list(params: { page: number; limit: number; entityType?: string; from?: string; to?: string }) {
    const where: Prisma.AdminAuditLogWhereInput = {};
    if (params.entityType) where.entityType = params.entityType;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { admin: { select: { email: true, name: true } } },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit };
  }

  /** Lista de valores distintos de `entityType` ya registrados — puebla el selector de filtro sin hardcodear la lista de entidades posibles. */
  async listEntityTypes(): Promise<string[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });
    return rows.map((r) => r.entityType);
  }
}
