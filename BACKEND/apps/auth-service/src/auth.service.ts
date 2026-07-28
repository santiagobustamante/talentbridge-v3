import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService, UserRole, Prisma, VerificationTokenType } from '@app/database';
import { normalizeEmail, titleCaseText, trimText, EmailService } from '@app/common';
import { RegisterDto, LoginDto, RegisterCompanyDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/auth.dto';

/** Vigencia del token de recuperación de contraseña — corto a propósito, es un enlace que llega por correo y se usa una sola vez. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
/** Vigencia del token de verificación de correo — más laxo que el de reset: no es tan urgente, y no bloquea el uso de la cuenta mientras tanto. */
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Las contraseñas no coinciden');
    }

    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Correo ya registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.createCandidateWithUniqueSlug(email, passwordHash, dto.fullName);
    await this.sendVerificationEmail(user.id, user.email);

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Crea el usuario+perfil candidato reintentando si el slug elegido por
   * `generateUniqueSlug` choca por una carrera (dos registros concurrentes
   * con el mismo prefijo de email — ej. "juan@gmail.com" y "juan@yahoo.com"
   * a la vez — pueden ver el mismo slug "libre" antes de que cualquiera lo
   * confirme). La constraint única de `slug` en la base es la que
   * realmente decide; acá generamos otro slug y reintentamos en vez de
   * dejar pasar el P2002 crudo. Si lo que chocó fue el email (misma
   * carrera pero en el `existing` check de arriba), se traduce al 409 de siempre.
   */
  private async createCandidateWithUniqueSlug(email: string, passwordHash: string, fullName: string, attempt = 0): Promise<any> {
    try {
      return await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: {
            create: {
              slug: await this.generateUniqueSlug(email, attempt),
              fullName: titleCaseText(fullName),
            },
          },
        },
        include: { profile: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = err.meta?.target;
        const targetsEmail = Array.isArray(target) ? target.includes('email') : String(target ?? '').includes('email');
        if (targetsEmail) throw new ConflictException('Correo ya registrado');
        if (attempt < 3) return this.createCandidateWithUniqueSlug(email, passwordHash, fullName, attempt + 1);
      }
      throw err;
    }
  }

  async registerCompany(dto: RegisterCompanyDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Las contraseñas no coinciden');
    }

    const email = normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Correo ya registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // El chequeo de `existing` de arriba es best-effort: dos registros
    // simultáneos con el mismo email (doble click, dos pestañas) pueden
    // pasarlo los dos. La constraint única de `email` en la base es la que
    // realmente decide; acá traducimos su violación (P2002) al mismo 409
    // amigable en vez de dejar pasar el error crudo de Prisma.
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.COMPANY,
          companyProfile: {
            create: {
              companyName: titleCaseText(dto.companyName),
              sector: dto.sector ? titleCaseText(dto.sector) : dto.sector,
              // No se le aplica titleCaseText: el valor viene del catálogo
              // DIVIPOLA (municipio-input) con su casing oficial exacto, que
              // incluye conectores en minúscula ("San José de la Montaña") —
              // recapitalizar cada palabra los rompería ("... De La ...").
              city: dto.city ? trimText(dto.city) : dto.city,
            },
          },
        },
        include: { companyProfile: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Correo ya registrado');
      }
      throw err;
    }

    await this.sendVerificationEmail(user.id, user.email);

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
      include: { profile: true, companyProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.role !== UserRole.CANDIDATE) {
      throw new ForbiddenException(
        'Esta cuenta pertenece a una empresa. Ingresa desde el acceso para empresas.',
      );
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  async loginCompany(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
      include: { profile: true, companyProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.role !== UserRole.COMPANY) {
      throw new ForbiddenException(
        'Esta cuenta pertenece a un candidato. Ingresa desde el acceso para candidatos.',
      );
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Siempre responde el mismo mensaje genérico, exista o no el correo —
   * de lo contrario este endpoint serviría para averiguar qué correos están
   * registrados con solo probar uno por uno (mismo cuidado que ya se aplica
   * en otras partes del proyecto). Si el correo existe, genera un token de
   * un solo uso, guarda su hash (nunca el valor crudo) y envía el enlace
   * por correo; si el envío falla, no se filtra ese detalle al llamador.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericResponse = { message: 'Si el correo está registrado, vas a recibir un enlace para restablecer tu contraseña.' };
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: VerificationTokenType.RESET_PASSWORD,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:4200'}/reset-password?token=${rawToken}`;
    try {
      await this.emailService.sendMail({
        to: email,
        subject: 'Recuperar tu contraseña — TalentBridge',
        html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p><a href="${resetUrl}">Hacé clic acá para elegir una nueva contraseña</a></p>
<p>Este enlace vence en 1 hora. Si vos no pediste esto, podés ignorar este correo.</p>`,
      });
    } catch (err) {
      // No se filtra el detalle del error de envío al llamador — el mensaje
      // genérico se mantiene igual, para no revelar si el correo existe ni
      // si hubo un problema puntual de entrega.
      this.logger.error(`Fallo el envío de correo de recuperación a ${email}: ${(err as Error).message}`);
    }

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ConflictException('Las contraseñas no coinciden');
    }

    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (
      !record ||
      record.type !== VerificationTokenType.RESET_PASSWORD ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('El enlace no es válido o ya venció. Solicitá uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Contraseña actualizada. Ya podés iniciar sesión con la nueva.' };
  }

  /**
   * Genera el token de verificación y envía el correo — nunca bloquea el
   * registro: si el envío falla (proveedor caído, etc.) la cuenta igual
   * queda creada y utilizable, solo se registra el error para diagnóstico.
   * Se usa desde `register()`/`registerCompany()` y desde `resendVerification()`.
   */
  private async sendVerificationEmail(userId: number, email: string): Promise<void> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash,
        type: VerificationTokenType.VERIFY_EMAIL,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });

    const verifyUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:4200'}/verify-email?token=${rawToken}`;
    try {
      await this.emailService.sendMail({
        to: email,
        subject: 'Confirmá tu correo — TalentBridge',
        html: `<p>Gracias por registrarte en TalentBridge.</p>
<p><a href="${verifyUrl}">Hacé clic acá para confirmar que este correo es tuyo</a></p>
<p>Este enlace vence en 24 horas. Podés seguir usando tu cuenta normalmente aunque todavía no lo confirmes.</p>`,
      });
    } catch (err) {
      this.logger.error(`Fallo el envío de correo de verificación a ${email}: ${(err as Error).message}`);
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (
      !record ||
      record.type !== VerificationTokenType.VERIFY_EMAIL ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('El enlace no es válido o ya venció. Pedí uno nuevo desde tu perfil.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Correo verificado. ¡Gracias!' };
  }

  async resendVerification(userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (user.emailVerified) return { message: 'Tu correo ya está verificado.' };

    await this.sendVerificationEmail(user.id, user.email);
    return { message: 'Te reenviamos el correo de verificación.' };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, companyProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  private generateToken(userId: number, email: string, role?: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }

  private sanitizeUser(user: {
    id: number;
    email: string;
    passwordHash?: string;
    role?: string;
    emailVerified?: boolean;
    createdAt: Date;
    updatedAt: Date;
    profile?: unknown;
    companyProfile?: unknown;
  }) {
    const { passwordHash, ...safe } = user;
    void passwordHash;
    return safe;
  }

  private async generateUniqueSlug(email: string, attempt = 0): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') + (attempt > 0 ? `-${Date.now().toString(36)}` : '');
    let slug = base;
    let counter = 1;
    while (await this.prisma.profile.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }
}
