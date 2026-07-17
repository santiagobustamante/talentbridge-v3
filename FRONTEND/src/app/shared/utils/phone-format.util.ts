/**
 * Formatea un número de teléfono colombiano en vivo mientras se escribe:
 * "+57 300 123 4567" (indicativo + grupos de 3-3-4). Si el usuario ya
 * escribió el "57" como parte del número, no lo duplica.
 */
export function formatColombianPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('57') && digits.length > 10) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 10);

  let out = '+57';
  if (digits.length > 0) out += ' ' + digits.slice(0, 3);
  if (digits.length > 3) out += ' ' + digits.slice(3, 6);
  if (digits.length > 6) out += ' ' + digits.slice(6, 10);
  return out;
}

/** Formatea un NIT colombiano en vivo: "900.123.456-7" (3-3-3 + dígito de verificación). */
export function formatColombianNit(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
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
