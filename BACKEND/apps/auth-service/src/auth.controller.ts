import { Controller, Post, Get, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RegisterCompanyDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto, TwoFactorCodeDto, VerifyTwoFactorLoginDto } from './dto/auth.dto';
import { JwtAuthGuard, CurrentUser } from '@app/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro ya no emite cookie/token: la cuenta queda creada pero inutilizable
  // hasta que se confirme el correo (ver AuthService.register/login).
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register-company')
  async registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
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

  // Puede devolver `{ user, token }` (login completo) o `{ twoFactorRequired:
  // true, tempToken }` si la cuenta tiene 2FA activado (Fase 17) — en ese
  // caso no se emite cookie todavía, falta el segundo paso (`/2fa/verify-login`).
  @Post('login-admin')
  async loginAdmin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginAdmin(dto);
    if ('twoFactorRequired' in result) {
      return result;
    }
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactorLogin(dto.tempToken, dto.code);
    this.setAuthCookie(res, result.token);
    return { user: result.user, token: result.token };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async setupTwoFactor(@CurrentUser() user: { sub: number }) {
    return this.authService.setupTwoFactor(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify-setup')
  async confirmTwoFactorSetup(@CurrentUser() user: { sub: number }, @Body() dto: TwoFactorCodeDto) {
    return this.authService.confirmTwoFactorSetup(user.sub, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async disableTwoFactor(@CurrentUser() user: { sub: number }, @Body() dto: TwoFactorCodeDto) {
    return this.authService.disableTwoFactor(user.sub, dto.code);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // Sin guard: un usuario recién registrado todavía no tiene sesión (ver
  // arriba), así que este endpoint identifica la cuenta por correo, no por JWT.
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
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
