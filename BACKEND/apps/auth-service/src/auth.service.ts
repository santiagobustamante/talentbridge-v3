import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService, UserRole, Prisma } from '@app/database';
import { normalizeEmail, titleCaseText, trimText } from '@app/common';
import { RegisterDto, LoginDto, RegisterCompanyDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
