/**
 * Espejo del frontend (`FRONTEND/src/app/shared/utils/normalize/text.util.ts`) — misma
 * lógica en ambos lados porque el backend no debe confiar únicamente en lo que ya
 * llegó formateado del cliente.
 */

/** Colapsa espacios múltiples a uno solo y recorta los extremos. No toca saltos de línea. */
export function collapseSpaces(raw: string): string {
  return raw.replace(/[^\S\n]+/g, ' ').trim();
}

/** Solo recorta extremos — para textos largos (descripciones, funciones, logros). */
export function trimText(raw: string): string {
  return raw.trim();
}

/**
 * Capitaliza nombres, ciudades, cargos, instituciones y empresas. Respeta compuestos
 * con guión/apóstrofe y NO toca palabras que ya parecen una sigla intencional (todo
 * mayúsculas, con puntos, o con números) — así "TalentBridge S.A.S." o "AWS" no se rompen.
 */
export function titleCaseText(raw: string): string {
  const collapsed = collapseSpaces(raw);
  if (!collapsed) return '';
  return collapsed.split(' ').map(titleCaseWord).join(' ');
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  if (/^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(word)) return word;
  if (/\d/.test(word)) return word;
  if (word.includes('.')) return word;

  return word
    .split(/([-'])/)
    .map((segment) => (segment === '-' || segment === "'" ? segment : capitalizeSegment(segment)))
    .join('');
}

function capitalizeSegment(segment: string): string {
  if (!segment) return segment;
  const lower = segment.toLocaleLowerCase('es-CO');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
