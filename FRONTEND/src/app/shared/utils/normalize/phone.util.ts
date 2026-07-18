/**
 * Separación storage vs. display para teléfono:
 * - `normalizePhoneStorage`: lo que se guarda — solo dígitos + "+" inicial, sin
 *   espacios ni separadores. Es lo que se manda al backend y lo que el backend
 *   vuelve a normalizar por su cuenta (no hay que confiar solo en el frontend).
 * - `formatPhoneDisplay`: lo que se muestra — agrupado "+57 312 439 2090".
 * Asume Colombia como indicativo por defecto si el usuario no puso ninguno.
 */

/** Solo dígitos y un "+" inicial opcional, sin duplicar el indicativo. */
export function normalizePhoneStorage(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Si ya viene con indicativo (más de 10 dígitos empezando en "57"), se respeta tal cual.
  return '+' + digits;
}

/** Agrupa en 3-3-4 para mostrar. Si no reconoce el indicativo, agrupa desde el final. */
export function formatPhoneDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, '');
  if (!digits) return '';

  let countryCode = '57';
  let local = digits;
  if (digits.length > 10) {
    countryCode = digits.slice(0, digits.length - 10);
    local = digits.slice(digits.length - 10);
  }

  let out = `+${countryCode}`;
  if (local.length > 0) out += ' ' + local.slice(0, 3);
  if (local.length > 3) out += ' ' + local.slice(3, 6);
  if (local.length > 6) out += ' ' + local.slice(6, 10);
  return out;
}

/** Filtro de caracteres válidos para usar EN VIVO mientras se escribe (sin reordenar
 *  nada, así no mueve el cursor) — solo bloquea lo que nunca puede ser parte de un
 *  teléfono. El agrupado con espacios se aplica recién en formatPhoneDisplay (blur). */
export function filterPhoneChars(raw: string): string {
  const hasLeadingPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return hasLeadingPlus ? '+' + digits : digits;
}
