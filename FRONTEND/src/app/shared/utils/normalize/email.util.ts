/** Correo: minúsculas, sin espacios. Sin esto, "User@Gmail.com" y "user@gmail.com" se
 *  tratarían como cuentas distintas en el login (Postgres compara texto sensible a mayúsculas). */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim());
}
