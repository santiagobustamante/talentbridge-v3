/** Correo: minúsculas, sin espacios. Sin esto, "User@Gmail.com" y "user@gmail.com" se
 *  tratarían como cuentas distintas en el login (Postgres compara texto sensible a mayúsculas). */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}
