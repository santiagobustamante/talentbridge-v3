/** Espejo del frontend: sin espacios, con protocolo. Rutas relativas ("/assets/logo.svg")
 *  se dejan intactas — anteponerles "https://" las rompe. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

/** Dominio con al menos dos etiquetas separadas por punto y un TLD alfabético
 *  de 2+ letras (ej. "example.com", "sub.example.co") — o "localhost" a secas. */
const HOST_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Exige que el host tenga forma de dominio real (`HOST_RE`) en vez de solo "algo no
 *  vacío": una versión anterior solo chequeaba 2+ caracteres tras "https://", así que
 *  cualquier palabra suelta ("srtsrn") pasaba como "válida" apenas se le anteponía el
 *  protocolo. Espejo de `isValidUrl` en el frontend — mantener ambos sincronizados. */
export function isValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  const normalized = normalizeUrl(trimmed);
  if (!normalized) return false;
  if (normalized.startsWith('/')) return true;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.hostname === 'localhost') return true;
  return HOST_RE.test(parsed.hostname);
}
