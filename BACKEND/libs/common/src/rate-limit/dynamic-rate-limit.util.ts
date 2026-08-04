/**
 * Límite de requests/minuto editable en caliente desde el panel admin
 * (`SystemParameter`, Fase 11) — antes cada servicio tenía el número fijo
 * en `ThrottlerModule.forRoot()`, solo editable con un redeploy (ver la
 * "decisión consciente de NO parametrizar" de la Fase 5).
 *
 * A diferencia de `JOB_MATCH_ALERT_THRESHOLD` (leído sin cache, no es hot
 * path), el límite de rate limiting se evalúa en *cada* request de *cada*
 * servicio — leer la base sin cache acá sí sería un problema real de
 * latencia/carga. Cache en memoria por proceso, 30s de vida: un cambio
 * hecho desde el panel tarda como máximo esos 30s en tener efecto real en
 * cada instancia, un costo aceptable a cambio de no pegarle a Postgres en
 * cada request.
 */
interface PrismaLike {
  systemParameter: {
    findUnique(args: { where: { key: string } }): Promise<{ value: string } | null>;
  };
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: number; expiresAt: number }>();

export async function getDynamicRateLimit(prisma: PrismaLike, key: string, fallback: number): Promise<number> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value = fallback;
  try {
    const param = await prisma.systemParameter.findUnique({ where: { key } });
    const parsed = Number(param?.value);
    if (Number.isFinite(parsed) && parsed > 0) value = parsed;
  } catch {
    // Si la base no responde (ej. arranque temprano del proceso), se sigue
    // con `fallback` en vez de romper el rate limiting por completo.
  }

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
