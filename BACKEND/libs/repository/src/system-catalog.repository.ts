import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class SystemCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Opciones activas de un catálogo (ej. modalidad, tipo de contrato) — puebla selects editables desde el panel admin. */
  async findActiveByKey(catalogKey: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.findMany({
      where: { catalogKey, active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Fila cruda (activa o no) — el llamador decide qué significa "válido" (ej. `assertValidCatalogValue` exige `active: true`). */
  async findByKeyAndValue(catalogKey: string, value: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.findUnique({
      where: { catalogKey_value: { catalogKey, value } },
    });
  }

  /** Todas las filas de todos los catálogos — `CatalogService.listAll`, el service las agrupa por `catalogKey` para la pantalla del panel admin. */
  async findAllOrdered(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.findMany({ orderBy: [{ catalogKey: 'asc' }, { sortOrder: 'asc' }] });
  }

  /** A diferencia de `findActiveByKey` (siempre `active: true`), acá el panel admin necesita poder ver también las inactivas para poder reactivarlas. */
  async findByKey(catalogKey: string, activeOnly: boolean, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.findMany({
      where: { catalogKey, ...(activeOnly ? { active: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: Prisma.SystemCatalogCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.create({ data });
  }

  /** Por `id` numérico — chequeo de pertenencia antes de `update`, distinto de `findByKeyAndValue` (que busca por la clave de negocio compuesta). */
  async findById(id: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.findUnique({ where: { id } });
  }

  async update(id: number, data: Prisma.SystemCatalogUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemCatalog.update({ where: { id }, data });
  }
}
