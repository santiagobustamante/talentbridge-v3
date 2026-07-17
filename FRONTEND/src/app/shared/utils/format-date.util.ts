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

export function formatAppDate(
  value: string | Date | null | undefined,
  format: AppDateFormat = 'short',
  locale = 'es-CO',
): string {
  if (!value) return '';
  return formatDate(value, FORMAT_MAP[format], locale);
}
