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

/** Valida que, tras normalizar (agregar https:// si hacía falta), el resultado sea una URL http(s) bien formada — o una ruta relativa ("/assets/logo.svg"), que `normalizeUrl` deja intacta a propósito. Rechaza texto con espacios internos ("no es una url") antes de normalizar — `normalizeUrl` los elimina para tolerar pegado descuidado, pero eso mismo dejaría pasar cualquier frase como si fuera un dominio. */
export function isValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  const normalized = normalizeUrl(trimmed);
  if (!normalized) return false;
  if (normalized.startsWith('/')) return true;
  return URL_RE.test(normalized);
}
