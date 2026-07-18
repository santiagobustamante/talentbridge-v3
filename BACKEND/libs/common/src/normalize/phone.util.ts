/**
 * Espejo del frontend. El valor que se persiste SIEMPRE pasa por `normalizePhoneStorage`
 * en el backend, sin importar lo que haya mandado el cliente — así un llamado directo a
 * la API (Postman, otro cliente) no puede colar un teléfono sin normalizar.
 */

/** Solo dígitos y un "+" inicial, sin espacios ni separadores. */
export function normalizePhoneStorage(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return '+' + digits;
}

/** Agrupa en 3-3-4 para mostrar. Indicativo Colombia (57) por defecto si son 10 dígitos locales. */
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
