/** URLs y redes sociales: sin espacios, con protocolo. Sin esto un usuario que pega
 *  "linkedin.com/in/juan" guarda un link que el navegador no abre como absoluto.
 *  Las rutas relativas ("/assets/logo.svg") se dejan intactas — son válidas tal cual
 *  y anteponerles "https://" las rompe (quedarían con "https:///assets/..."). */
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

/** Valida que, tras normalizar (agregar https:// si hacía falta), el resultado sea una URL http(s) bien formada — o una ruta relativa ("/assets/logo.svg"), que `normalizeUrl` deja intacta a propósito. Rechaza texto con espacios internos ("no es una url") antes de normalizar — `normalizeUrl` los elimina para tolerar pegado descuidado, pero eso mismo dejaría pasar cualquier frase como si fuera un dominio.
 *  Exige que el host tenga forma de dominio real (`HOST_RE`) en vez de solo "algo no vacío": una versión anterior solo chequeaba que hubiera 2+ caracteres tras "https://", así que cualquier palabra suelta ("srtsrn", "sedrthdrthsgfh") pasaba como "válida" apenas se le anteponía el protocolo. */
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
