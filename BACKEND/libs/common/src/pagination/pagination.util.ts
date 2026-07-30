/**
 * Lee los límites de paginación desde `SystemParameter` (editables en
 * caliente desde el panel admin, Fase 4) — antes cada servicio tenía su
 * propio default/tope hardcodeado e inconsistente (20/50/100 según el
 * archivo). `prisma` es cualquier cliente con acceso a `systemParameter`
 * (cada microservicio comparte la misma base). Si los parámetros todavía no
 * existen (ej. una base que no corrió el seed del panel admin), usa 20/100
 * como respaldo — los mismos valores que ya eran el default más común.
 */
export interface PaginationLimits {
  defaultLimit: number;
  maxLimit: number;
}

const FALLBACK: PaginationLimits = { defaultLimit: 20, maxLimit: 100 };

interface PrismaLike {
  systemParameter: {
    findMany(args: { where: { key: { in: string[] } } }): Promise<{ key: string; value: string }[]>;
  };
}

export async function getPaginationLimits(prisma: PrismaLike): Promise<PaginationLimits> {
  const rows = await prisma.systemParameter.findMany({
    where: { key: { in: ['DEFAULT_PAGE_SIZE', 'MAX_PAGE_SIZE'] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, Number(r.value)]));
  const defaultLimit = byKey.get('DEFAULT_PAGE_SIZE');
  const maxLimit = byKey.get('MAX_PAGE_SIZE');
  return {
    defaultLimit: Number.isFinite(defaultLimit) ? (defaultLimit as number) : FALLBACK.defaultLimit,
    maxLimit: Number.isFinite(maxLimit) ? (maxLimit as number) : FALLBACK.maxLimit,
  };
}

/** Aplica los límites a un `limit` pedido por el cliente: entre 1 y `maxLimit`, usando `defaultLimit` si no se pidió ninguno. */
export function clampLimit(requested: number | undefined, limits: PaginationLimits): number {
  if (!requested || requested < 1) return limits.defaultLimit;
  return Math.min(requested, limits.maxLimit);
}
