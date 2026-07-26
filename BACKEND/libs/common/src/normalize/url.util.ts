/** Espejo del frontend: sin espacios, con protocolo. Rutas relativas ("/assets/logo.svg")
 *  se dejan intactas — anteponerles "https://" las rompe. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
}

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  const normalized = normalizeUrl(trimmed);
  if (!normalized) return false;
  if (normalized.startsWith('/')) return true;
  return URL_RE.test(normalized);
}
