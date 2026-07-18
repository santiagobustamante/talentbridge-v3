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

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** Valida que, tras normalizar (agregar https:// si hacía falta), el resultado sea una URL http(s) bien formada. */
export function isValidUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  if (!normalized) return false;
  return URL_RE.test(normalized);
}
