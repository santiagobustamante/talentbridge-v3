import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/auth';
import { PrismaService, ParameterType } from '@app/database';

/**
 * Feature flags (Fase 8 del panel admin) — se leen del mismo
 * `SystemParameter` que el resto de los parámetros (categoría
 * `feature-flags`, tipo BOOLEAN), pero este endpoint NO exige rol ADMIN:
 * cualquier candidato/empresa autenticado necesita poder consultarlo para
 * decidir si mostrar una función (ej. el asistente Joaquín) sin tener que
 * pasar por el panel de administración.
 */
@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getFlags(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.systemParameter.findMany({
      where: { category: 'feature-flags', type: ParameterType.BOOLEAN },
      select: { key: true, value: true },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value === 'true']));
  }
}
