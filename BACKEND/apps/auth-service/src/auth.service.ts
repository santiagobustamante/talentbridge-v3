import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService, UserRole } from '@app/database';
import { normalizeEmail, titleCaseText } from '@app/common';
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

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            slug: await this.generateUniqueSlug(email),
          },
        },
      },
      include: { profile: true },
    });

    const token = this.generateToken(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), token };
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

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.COMPANY,
        companyProfile: {
          create: {
            companyName: titleCaseText(dto.companyName),
            sector: dto.sector ? titleCaseText(dto.sector) : dto.sector,
            city: dto.city ? titleCaseText(dto.city) : dto.city,
          },
        },
      },
      include: { companyProfile: true },
    });

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

  private async generateUniqueSlug(email: string): Promise<string> {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    let slug = base;
    let counter = 1;
    while (await this.prisma.profile.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }
}
