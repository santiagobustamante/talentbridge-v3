/**
 * Espejo del frontend. `parseNumericInput` es lo que el backend aplica a cualquier
 * valor numérico que llegue como string (o incluso number, por si acaso) antes de
 * guardarlo — nunca se guarda el símbolo de moneda ni separadores de miles.
 */
export function parseNumericInput(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const cleaned = raw.replace(/[^\d,.\-]/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (hasDot || hasComma) {
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
