import { Controller, Post, Get, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RegisterCompanyDto } from './dto/auth.dto';
import { JwtAuthGuard, CurrentUser } from '@app/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @Post('register-company')
  async registerCompany(
    @Body() dto: RegisterCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerCompany(dto);
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @Post('login-company')
  async loginCompany(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginCompany(dto);
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @Post('logout')
  clearCookie(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      // 'none' en producción: frontend (Vercel) y backend (Railway) viven en
      // dominios distintos, y 'lax' no manda la cookie en llamadas cross-site
      // por fetch/XHR. 'none' exige secure:true, que ya es el caso en producción.
      sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax',
      path: '/',
    });
    return { message: 'Sesión cerrada' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { sub: number }) {
    const userId = user.sub;
    return this.authService.me(userId);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
