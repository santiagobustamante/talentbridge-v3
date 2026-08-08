import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemCatalogRepository } from '@app/repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCatalogEntryDto, UpdateCatalogEntryDto } from './catalog-entry.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly systemCatalogRepository: SystemCatalogRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Agrupa todas las filas por `catalogKey` — el panel las muestra como una sección por catálogo. */
  async listAll() {
    const rows = await this.systemCatalogRepository.findAllOrdered();
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.catalogKey) ?? [];
      list.push(row);
      grouped.set(row.catalogKey, list);
    }
    return Array.from(grouped.entries()).map(([catalogKey, entries]) => ({ catalogKey, entries }));
  }

  async listByKey(catalogKey: string, activeOnly = false) {
    return this.systemCatalogRepository.findByKey(catalogKey, activeOnly);
  }

  async create(catalogKey: string, dto: CreateCatalogEntryDto, adminId: number, ipAddress?: string) {
    const existing = await this.systemCatalogRepository.findByKeyAndValue(catalogKey, dto.value);
    if (existing) {
      throw new BadRequestException(`Ya existe un valor "${dto.value}" en el catálogo "${catalogKey}"`);
    }

    const created = await this.systemCatalogRepository.create({
      catalogKey,
      value: dto.value,
      label: dto.label,
      sortOrder: dto.sortOrder ?? 0,
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
    const before = await this.systemCatalogRepository.findById(id);
    if (!before) throw new NotFoundException('Entrada de catálogo no encontrada');

    const updated = await this.systemCatalogRepository.update(id, {
      ...(dto.label !== undefined ? { label: dto.label } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
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
