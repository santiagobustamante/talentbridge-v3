import { Injectable } from '@nestjs/common';
import { Prisma } from '@app/database';
import { AdminAuditLogRepository, UserRepository } from '@app/repository';

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
  constructor(
    private readonly adminAuditLogRepository: AdminAuditLogRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async record(entry: RecordAuditEntry) {
    return this.adminAuditLogRepository.create({
      adminId: entry.adminId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: (entry.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      after: (entry.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ipAddress: entry.ipAddress,
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

    const [rows, total] = await Promise.all([
      this.adminAuditLogRepository.findManyWithFilters(where, (params.page - 1) * params.limit, params.limit),
      this.adminAuditLogRepository.count(where),
    ]);

    // `entityId` no tiene FK real (es genérico entre User/SystemParameter/Report/SystemCatalog) —
    // se resuelve por separado, mismo patrón que ModerationService.list() para el target de un reporte.
    const userIds = rows
      .filter((r) => r.entityType === 'User' && r.entityId)
      .map((r) => Number(r.entityId))
      .filter((id) => !Number.isNaN(id));
    const users = userIds.length ? await this.userRepository.findManyByIdsForAdminLookup(userIds) : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const data = rows.map((r) => ({
      ...r,
      targetUser: r.entityType === 'User' && r.entityId ? userById.get(Number(r.entityId)) || null : null,
    }));

    return { data, total, page: params.page, limit: params.limit };
  }

  /** Lista de valores distintos de `entityType` ya registrados — puebla el selector de filtro sin hardcodear la lista de entidades posibles. */
  async listEntityTypes(): Promise<string[]> {
    const rows = await this.adminAuditLogRepository.findDistinctEntityTypes();
    return rows.map((r) => r.entityType);
  }
}
