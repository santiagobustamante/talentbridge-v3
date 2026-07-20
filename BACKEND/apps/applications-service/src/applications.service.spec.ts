import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, JobOfferStatus } from '@app/database';
import { ApplicationsService } from './applications.service';
import { NotificationsService } from './notifications.service';

/**
 * Cubre la cadena de validación de `apply()` — la lógica de negocio con más
 * pasos de todo el proyecto (oferta publicada, perfil completo, no duplicar,
 * match mínimo de habilidades). `PrismaService` va mockeado, no toca base real.
 */
describe('ApplicationsService.apply', () => {
  let service: ApplicationsService;
  let prisma: {
    jobOffer: { findUnique: jest.Mock };
    profile: { findUnique: jest.Mock };
    jobApplication: { findUnique: jest.Mock; create: jest.Mock };
    skill: { findMany: jest.Mock };
  };

  const publishedJob = { id: 10, companyId: 50, title: 'Dev Angular', status: JobOfferStatus.PUBLISHED, skillsRequired: 'Angular' };
  const profile = { id: 100, userId: 1, fullName: 'Ana Torres' };
  let notifications: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      jobOffer: { findUnique: jest.fn() },
      profile: { findUnique: jest.fn() },
      jobApplication: { findUnique: jest.fn(), create: jest.fn() },
      skill: { findMany: jest.fn() },
    };
    notifications = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  it('rechaza si la oferta no existe', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(null);

    await expect(service.apply(1, 999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza si la oferta existe pero no está publicada (ej. DRAFT o CLOSED)', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue({ ...publishedJob, status: JobOfferStatus.DRAFT });

    await expect(service.apply(1, 10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el candidato no tiene perfil creado', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(publishedJob);
    prisma.profile.findUnique.mockResolvedValue(null);

    await expect(service.apply(1, 10)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza con 409 si ya existe una postulación previa (constraint única jobOfferId+candidateId)', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(publishedJob);
    prisma.profile.findUnique.mockResolvedValue(profile);
    prisma.jobApplication.findUnique.mockResolvedValue({ id: 1 });

    await expect(service.apply(1, 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza si el candidato no tiene ninguna habilidad que coincida con los requisitos', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(publishedJob);
    prisma.profile.findUnique.mockResolvedValue(profile);
    prisma.jobApplication.findUnique.mockResolvedValue(null);
    prisma.skill.findMany.mockResolvedValue([{ normalizedName: 'python', level: 'ADVANCED' }]);

    await expect(service.apply(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.jobApplication.create).not.toHaveBeenCalled();
  });

  it('crea la postulación en estado PENDING cuando pasa las 4 validaciones', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(publishedJob);
    prisma.profile.findUnique.mockResolvedValue(profile);
    prisma.jobApplication.findUnique.mockResolvedValue(null);
    prisma.skill.findMany.mockResolvedValue([{ normalizedName: 'angular', level: 'BASIC' }]);
    prisma.jobApplication.create.mockResolvedValue({ id: 1, status: 'PENDING' });

    await service.apply(1, 10, 'Me interesa mucho este puesto');

    expect(prisma.jobApplication.create).toHaveBeenCalledWith({
      data: {
        jobOfferId: 10,
        candidateId: 1,
        coverMessage: 'Me interesa mucho este puesto',
        status: 'PENDING',
      },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      50,
      'NEW_APPLICATION',
      'Nueva postulación',
      expect.stringContaining('Ana Torres'),
      '/company/jobs',
    );
  });

  it('no bloquea la postulación si la oferta no exige ninguna habilidad puntual (skillsRequired vacío)', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue({ ...publishedJob, skillsRequired: null });
    prisma.profile.findUnique.mockResolvedValue(profile);
    prisma.jobApplication.findUnique.mockResolvedValue(null);
    prisma.skill.findMany.mockResolvedValue([]);
    prisma.jobApplication.create.mockResolvedValue({ id: 1, status: 'PENDING' });

    await expect(service.apply(1, 10)).resolves.toBeDefined();
  });
});
