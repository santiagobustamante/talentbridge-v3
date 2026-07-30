import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { AuditLogService } from './audit-log.service';
import { CreateCatalogEntryDto, UpdateCatalogEntryDto } from './dto/catalog-entry.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Agrupa todas las filas por `catalogKey` — el panel las muestra como una sección por catálogo. */
  async listAll() {
    const rows = await this.prisma.systemCatalog.findMany({
      orderBy: [{ catalogKey: 'asc' }, { sortOrder: 'asc' }],
    });
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.catalogKey) ?? [];
      list.push(row);
      grouped.set(row.catalogKey, list);
    }
    return Array.from(grouped.entries()).map(([catalogKey, entries]) => ({ catalogKey, entries }));
  }

  async listByKey(catalogKey: string, activeOnly = false) {
    return this.prisma.systemCatalog.findMany({
      where: { catalogKey, ...(activeOnly ? { active: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(catalogKey: string, dto: CreateCatalogEntryDto, adminId: number, ipAddress?: string) {
    const existing = await this.prisma.systemCatalog.findUnique({
      where: { catalogKey_value: { catalogKey, value: dto.value } },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un valor "${dto.value}" en el catálogo "${catalogKey}"`);
    }

    const created = await this.prisma.systemCatalog.create({
      data: {
        catalogKey,
        value: dto.value,
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.auditLog.record({
      adminId,
      action: 'CREATE_CATALOG_ENTRY',
      entityType: 'SystemCatalog',
      entityId: `${catalogKey}:${dto.value}`,
      after: created,
      ipAddress,
    });

    return created;
  }

  async update(id: number, dto: UpdateCatalogEntryDto, adminId: number, ipAddress?: string) {
    const before = await this.prisma.systemCatalog.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Entrada de catálogo no encontrada');

    const updated = await this.prisma.systemCatalog.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    await this.auditLog.record({
      adminId,
      action: 'UPDATE_CATALOG_ENTRY',
      entityType: 'SystemCatalog',
      entityId: `${before.catalogKey}:${before.value}`,
      before,
      after: updated,
      ipAddress,
    });

    return updated;
  }
}
