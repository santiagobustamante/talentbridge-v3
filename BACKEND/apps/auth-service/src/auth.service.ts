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
import { RegisterDto, LoginDto, RegisterCompanyDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto';

/** Frase exacta que dispara, en el frontend, el botón "Reenviar correo" en el error de login — ver AllExceptionsFilter, que solo reenvía `message` (no un código de error aparte). */
const EMAIL_NOT_VERIFIED_MESSAGE =
  'Tu correo todavía no fue confirmado. Revisa tu bandeja de entrada o reenvía el correo de confirmación antes de iniciar sesión.';

/** Cuenta suspendida por un administrador (Fase 7 del panel admin) — mensaje genérico, sin detalle del motivo (eso queda en el audit log, no en la respuesta al usuario). */
const SUSPENDED_MESSAGE = 'Esta cuenta está suspendida. Si crees que es un error, contacta al soporte.';

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

    // No se emite cookie ni token: la cuenta existe pero no es utilizable
    // todavía — `login()` la rechaza hasta que `emailVerified` sea true.
    return {
      message: `Te enviamos un correo a ${user.email} para confirmar tu cuenta. Tienes que confirmarlo antes de poder iniciar sesión.`,
      email: user.email,
    };
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

    return {
      message: `Te enviamos un correo a ${user.email} para confirmar tu cuenta. Tienes que confirmarlo antes de poder iniciar sesión.`,
      email: user.email,
    };
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

    if (user.suspended) {
      throw new ForbiddenException(SUSPENDED_MESSAGE);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
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

    if (user.suspended) {
      throw new ForbiddenException(SUSPENDED_MESSAGE);
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  /**
   * Login del panel de administración — ruta separada del login de
   * candidato/empresa a propósito (menor superficie de descubrimiento para
   * el login más sensible del sistema). No existe (ni debe existir) un
   * registro público para ADMIN: la única forma de crear esta cuenta es un
   * script de un solo uso corrido a mano contra la base.
   */
  async loginAdmin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Esta cuenta no tiene acceso al panel de administración.');
    }

    if (user.suspended) {
      throw new ForbiddenException(SUSPENDED_MESSAGE);
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
<p><a href="${resetUrl}">Haz clic aquí para elegir una nueva contraseña</a></p>
<p>Este enlace vence en 1 hora. Si tú no pediste esto, puedes ignorar este correo.</p>`,
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
      throw new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva.' };
  }

  /**
   * Genera el token de verificación y envía el correo. Si el envío falla
   * (proveedor caído, etc.) no se revierte la creación de la cuenta — queda
   * creada pero inutilizable hasta confirmar el correo, igual que si el
   * envío hubiera funcionado; solo se registra el error para diagnóstico
   * (el usuario tiene la opción de reenviar el correo más adelante).
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
        subject: 'Confirma tu correo — TalentBridge',
        html: `<p>Gracias por registrarte en TalentBridge.</p>
<p><a href="${verifyUrl}">Haz clic aquí para confirmar que este correo es tuyo</a></p>
<p>Este enlace vence en 24 horas. Tienes que confirmarlo antes de poder iniciar sesión.</p>`,
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
      throw new BadRequestException('El enlace no es válido o ya venció. Pide uno nuevo desde la pantalla de inicio de sesión.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Correo confirmado. Ya puedes iniciar sesión.' };
  }

  /**
   * Siempre responde el mismo mensaje genérico, exista o no la cuenta, o ya
   * esté verificada — mismo criterio anti-enumeración que `forgotPassword`.
   * Sin sesión (a diferencia de la versión anterior, no bloqueante): un
   * usuario recién registrado todavía no tiene cookie/token, así que este
   * endpoint tiene que identificar la cuenta por correo, no por el JWT.
   */
  async resendVerification(dto: ResendVerificationDto): Promise<{ message: string }> {
    const genericResponse = { message: 'Si el correo está registrado y todavía no fue confirmado, te reenviamos el enlace de confirmación.' };
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return genericResponse;

    await this.sendVerificationEmail(user.id, user.email);
    return genericResponse;
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

  /**
   * Las cuentas ADMIN firman con una sesión más corta que candidato/empresa
   * (2h en vez del `JWT_EXPIRES_IN` general, hoy 1d) — dado el poder de este
   * rol, conviene que una sesión abierta en un dispositivo compartido u
   * olvidado expire rápido. A propósito NO es un `SystemParameter`
   * editable desde el propio panel: dejar que un admin extienda su propia
   * sesión sería debilitar esta protección justo desde donde más importa.
   */
  private generateToken(userId: number, email: string, role?: string): string {
    const payload = { sub: userId, email, role };
    if (role === UserRole.ADMIN) {
      return this.jwtService.sign(payload, { expiresIn: '2h' });
    }
    return this.jwtService.sign(payload);
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
