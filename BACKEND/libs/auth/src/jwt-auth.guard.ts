import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { sub: number; email: string }>(
    err: Error | null,
    user: TUser | null,
    info: Error | null,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          info?.message || 'Token no válido o no proporcionado',
        )
      );
    }
    return user;
  }
}
