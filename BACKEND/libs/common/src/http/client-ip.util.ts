/**
 * Extrae la IP real del cliente de `X-Forwarded-For` (primer valor de la
 * cadena) — mismo criterio que `IpThrottlerGuard`: todo el tráfico real llega
 * vía el proxy del api-gateway, que reenvía ese header con la IP real del
 * cliente (ver `http-client.service.ts`); `req.ip` dentro de un servicio
 * interno sería la IP del propio gateway, no la del cliente.
 */
export function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; ip?: string }): string {
  const xff = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(xff) ? xff[0] : xff?.split(',')[0]?.trim();
  return first || req.ip || 'unknown';
}
