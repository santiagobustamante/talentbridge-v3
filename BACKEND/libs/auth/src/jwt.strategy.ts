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
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'dev_secret',
    });
  }

  async validate(payload: { sub: number; email: string; role?: string }) {
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
