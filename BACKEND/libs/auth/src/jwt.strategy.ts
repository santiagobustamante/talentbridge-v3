import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies && req.cookies['auth_token']) {
    return req.cookies['auth_token'] as string;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      // Antes caía a un secreto hardcodeado ('dev_secret') si faltaba la
      // variable de entorno — cualquier deploy sin JWT_SECRET seteado firmaba
      // y validaba tokens con un valor público y predecible. Mejor fallar al
      // arrancar que arrancar inseguro en silencio.
      throw new Error('JWT_SECRET no está seteado. El servicio no puede arrancar sin este secreto.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: number; email: string; role?: string }) {
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
