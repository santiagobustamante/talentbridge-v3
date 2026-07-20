import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { JobsService } from './jobs.service';

/**
 * Cubre `publishJob()` y el disparo de alertas JOB_MATCH: se notifica solo
 * a los candidatos que matchean por encima del umbral, y no se notifica a
 * nadie si la oferta no pide ninguna skill puntual (evita ruido).
 */
describe('JobsService.publishJob', () => {
  let service: JobsService;
  let prisma: {
    jobOffer: { findUnique: jest.Mock; update: jest.Mock };
    profile: { findMany: jest.Mock };
    notification: { createMany: jest.Mock };
  };

  const draftJob = { id: 1, companyId: 50, title: 'Dev Angular', description: 'desc', skillsRequired: 'angular,typescript' };

  beforeEach(async () => {
    prisma = {
      jobOffer: { findUnique: jest.fn(), update: jest.fn() },
      profile: { findMany: jest.fn() },
      notification: { createMany: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(JobsService);
  });

  it('rechaza si la oferta no le pertenece a la empresa autenticada', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue({ ...draftJob, companyId: 999 });

    await expect(service.publishJob(50, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza si la oferta no existe', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(null);

    await expect(service.publishJob(50, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('notifica solo a los candidatos que matchean por encima del umbral (50%)', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(draftJob);
    prisma.jobOffer.update.mockResolvedValue({ ...draftJob, status: 'PUBLISHED' });
    prisma.profile.findMany.mockResolvedValue([
      { userId: 101, skills: [{ normalizedName: 'angular', level: 'BASIC' }, { normalizedName: 'typescript', level: 'BASIC' }] }, // 100%
      { userId: 102, skills: [{ normalizedName: 'angular', level: 'BASIC' }] }, // 50%
      { userId: 103, skills: [{ normalizedName: 'python', level: 'EXPERT' }] }, // 0%
    ]);

    await service.publishJob(50, 1);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: 101, type: 'JOB_MATCH' }),
        expect.objectContaining({ userId: 102, type: 'JOB_MATCH' }),
      ],
    });
  });

  it('no notifica a nadie si la oferta no pide ninguna skill puntual', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue({ ...draftJob, skillsRequired: null });
    prisma.jobOffer.update.mockResolvedValue({ ...draftJob, skillsRequired: null, status: 'PUBLISHED' });

    await service.publishJob(50, 1);

    expect(prisma.profile.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('no llama a createMany si nadie matchea por encima del umbral', async () => {
    prisma.jobOffer.findUnique.mockResolvedValue(draftJob);
    prisma.jobOffer.update.mockResolvedValue({ ...draftJob, status: 'PUBLISHED' });
    prisma.profile.findMany.mockResolvedValue([
      { userId: 103, skills: [{ normalizedName: 'python', level: 'EXPERT' }] },
    ]);

    await service.publishJob(50, 1);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
