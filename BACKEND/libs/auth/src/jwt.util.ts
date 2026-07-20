import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

/**
 * Antes cada punto de uso caía a un secreto hardcodeado ('dev_secret') si
 * faltaba la variable de entorno — cualquier deploy sin JWT_SECRET seteado
 * firmaba/validaba tokens con un valor público y predecible. Mejor fallar
 * en el momento que aceptar/emitir un token inseguro en silencio.
 */
function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET no está seteado.');
  }
  return secret;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as unknown as JwtPayload;
}

export class JwtUtil {
  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, getJwtSecret()) as unknown as JwtPayload;
  }

  static extractTokenFromCookie(cookieString?: string): string | null {
    if (!cookieString) return null;
    const match = cookieString.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
  }
}
