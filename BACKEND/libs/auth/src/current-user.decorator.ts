import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

interface RequestWithUser {
  user?: { sub: number; email: string; role?: string };
  cookies?: Record<string, string>;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return request.user;
  },
);
