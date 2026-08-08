import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma, ParameterType } from '@app/database';

/**
 * Acceso a datos del modelo `SystemParameter` — arranca mínimo acá (Fase 4
 * del patrón repositorio, primer consumidor: `JobsService.getMatchThreshold`)
 * y se extiende en la Fase 8 para la pantalla "Parámetros" del panel admin.
 */
@Injectable()
export class SystemParameterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemParameter.findUnique({ where: { key } });
  }

  /** Todos los parámetros, agrupados por categoría — pantalla "Parámetros" del panel admin. */
  async findAll(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemParameter.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  /** `UncheckedUpdateInput`: el service arma `updatedById` como FK escalar directa. */
  async updateByKey(key: string, data: Prisma.SystemParameterUncheckedUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemParameter.update({ where: { key }, data });
  }

  /** Solo los parámetros booleanos de la categoría `feature-flags` — `FeatureFlagsController`, consumido por cualquier candidato/empresa autenticado (no solo ADMIN). */
  async findActiveFeatureFlags(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.systemParameter.findMany({
      where: { category: 'feature-flags', type: ParameterType.BOOLEAN },
      select: { key: true, value: true },
    });
  }
}
