/** Correo: minúsculas, sin espacios. Última línea de defensa antes de Postgres
 *  (comparación sensible a mayúsculas) — el frontend ya normaliza, pero no se confía solo en eso. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}
