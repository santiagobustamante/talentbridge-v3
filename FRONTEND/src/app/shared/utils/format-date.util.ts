import { formatDate } from '@angular/common';

/**
 * short: 16/07/2026 · long: 16 de julio de 2026 · datetime: 16 jul 2026, 3:30 p. m.
 * time: 3:30 p. m. · monthYear: jul 2026 (para rangos de experiencia/educación)
 */
export type AppDateFormat = 'short' | 'long' | 'datetime' | 'time' | 'monthYear';

const FORMAT_MAP: Record<AppDateFormat, string> = {
  short: 'dd/MM/yyyy',
  long: 'longDate',
  datetime: 'medium',
  time: 'shortTime',
  monthYear: 'MMM y',
};

/**
 * Formatea una fecha (string ISO o `Date`) al patrón elegido, usando el `formatDate`
 * de Angular. Es la función que envuelve `AppDatePipe` — se expone también como
 * función suelta para los casos donde hace falta formatear fuera de un template
 * (ej. armar un string para un `title` o un log). Devuelve `''` si `value` es
 * nulo/vacío, para no mostrar "Invalid Date" en la UI.
 */
export function formatAppDate(
  value: string | Date | null | undefined,
  format: AppDateFormat = 'short',
  locale = 'es-CO',
): string {
  if (!value) return '';
  return formatDate(value, FORMAT_MAP[format], locale);
}
