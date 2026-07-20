import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService, UserRole } from '@app/database';
import { AuthService } from './auth.service';

// bcrypt es un binding nativo — sus exports no son configurables, así que
// jest.spyOn() falla en tiempo de ejecución ("Cannot redefine property").
// jest.mock() reemplaza el módulo entero antes de que nada lo importe.
jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'hash-nuevo'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';
const mockedCompare = bcrypt.compare as unknown as jest.Mock;

/**
 * Cubre el flujo de mayor riesgo del proyecto: login/registro y emisión de
 * JWT. `PrismaService` y `JwtService` van mockeados (no toca ninguna base
 * real) — el objetivo es la lógica de negocio de `AuthService`, no la
 * integración con Postgres.
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    profile: { findUnique: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };

  const baseUser = {
    id: 1,
    email: 'candidato@demo.com',
    passwordHash: 'hash-guardado',
    role: UserRole.CANDIDATE,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: null,
    companyProfile: null,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      profile: { findUnique: jest.fn() },
    };
    jwtService = { sign: jest.fn().mockReturnValue('token-firmado') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('devuelve user + token con credenciales correctas', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      mockedCompare.mockResolvedValue(true);

      const result = await service.login({ email: 'candidato@demo.com', password: 'correcta' });

      expect(result.token).toBe('token-firmado');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1, email: 'candidato@demo.com', role: UserRole.CANDIDATE });
    });

    it('rechaza con 401 si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'no-existe@demo.com', password: 'x' }))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 401 si la contraseña no coincide (nunca revela cuál de las dos falló)', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      mockedCompare.mockResolvedValue(false);

      await expect(service.login({ email: 'candidato@demo.com', password: 'incorrecta' }))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 403 si una cuenta de empresa intenta entrar por el login de candidato', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, role: UserRole.COMPANY });
      mockedCompare.mockResolvedValue(true);

      await expect(service.login({ email: 'empresa@demo.com', password: 'correcta' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('loginCompany', () => {
    it('rechaza con 403 si una cuenta de candidato intenta entrar por el login de empresa', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      mockedCompare.mockResolvedValue(true);

      await expect(service.loginCompany({ email: 'candidato@demo.com', password: 'correcta' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('register', () => {
    it('rechaza si las contraseñas no coinciden, sin llegar a tocar la base', async () => {
      await expect(
        service.register({ email: 'nuevo@demo.com', password: 'a', confirmPassword: 'b' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el correo ya está registrado', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register({ email: 'candidato@demo.com', password: 'a', confirmPassword: 'a' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('normaliza el email (minúsculas) antes de buscar duplicados y de guardar', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.profile.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...baseUser, email: 'nuevo@demo.com' });

      await service.register({ email: 'NUEVO@DEMO.COM', password: 'a', confirmPassword: 'a' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'nuevo@demo.com' } });
      expect(prisma.user.create.mock.calls[0][0].data.email).toBe('nuevo@demo.com');
    });

    it('genera un slug alternativo si el slug base ya está en uso', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.profile.findUnique
        .mockResolvedValueOnce({ id: 1 }) // "nuevo" ya existe
        .mockResolvedValueOnce(null); // "nuevo-1" está libre
      prisma.user.create.mockResolvedValue({ ...baseUser, email: 'nuevo@demo.com' });

      await service.register({ email: 'nuevo@demo.com', password: 'a', confirmPassword: 'a' });

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.profile.create.slug).toBe('nuevo-1');
    });
  });
});
