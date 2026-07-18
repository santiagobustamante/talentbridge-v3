/**
 * Separación storage vs. display para valores numéricos (salarios, montos):
 * - `parseNumericInput`: lo que se guarda — número plano, sin símbolo de moneda ni
 *   separadores de miles. Acepta lo que el usuario pueda haber escrito o pegado
 *   ("$2.500.000", "2,500,000", "2500000") y devuelve siempre el mismo número.
 * - `formatCurrencyDisplay` / `formatNumberDisplay`: lo que se muestra, con separador
 *   de miles según locale ("$2.500.000" en es-CO).
 */

/** Convierte cualquier entrada con símbolos/separadores a un número plano (o null si no hay dígitos). */
export function parseNumericInput(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[^\d,.\-]/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    // Mixto: el separador que aparece último es el decimal ("2.500,75" o "2,500.75").
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (hasDot || hasComma) {
    // Un solo tipo de separador: si el último grupo tiene 3 dígitos ("2.500", "2,500,000")
    // es separador de miles; si tiene 1-2 ("2.50") se asume decimal.
    const sep = hasDot ? '.' : ',';
    const parts = cleaned.split(sep);
    const lastGroup = parts[parts.length - 1];
    const isThousandsSep = parts.length > 2 || lastGroup.length === 3;
    normalized = isThousandsSep
      ? cleaned.split(sep).join('')
      : cleaned.replace(',', '.');
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatNumberDisplay(value: number | null | undefined, locale = 'es-CO'): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function formatCurrencyDisplay(
  value: number | null | undefined,
  currency = 'COP',
  locale = 'es-CO',
): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Porcentajes: se guardan como número (sin "%"), el símbolo solo se agrega al mostrar. */
export function formatPercentDisplay(value: number | null | undefined, locale = 'es-CO'): string {
  if (value == null || !Number.isFinite(value)) return '';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
}
