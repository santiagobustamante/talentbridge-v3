import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env['JWT_SECRET'] || 'dev_secret';
  return jwt.verify(token, secret) as unknown as JwtPayload;
}

export class JwtUtil {
  static verifyToken(token: string): JwtPayload {
    const secret = process.env['JWT_SECRET'] || 'dev_secret';
    return jwt.verify(token, secret) as unknown as JwtPayload;
  }

  static extractTokenFromCookie(cookieString?: string): string | null {
    if (!cookieString) return null;
    const match = cookieString.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
  }
}
