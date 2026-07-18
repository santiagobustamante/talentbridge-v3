/** Mismo principio que teléfono: se guarda limpio (solo dígitos), se muestra con puntos/guion. */
export function normalizeNitStorage(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}

/** "9001234567" -> "900.123.456-7" */
export function formatNitDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';

  const body = digits.slice(0, 9);
  const check = digits.slice(9, 10);

  let out = '';
  if (body.length > 0) out += body.slice(0, 3);
  if (body.length > 3) out += '.' + body.slice(3, 6);
  if (body.length > 6) out += '.' + body.slice(6, 9);
  if (check) out += '-' + check;
  return out;
}
