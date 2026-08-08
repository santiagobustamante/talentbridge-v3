import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  JobOfferRepository,
  SystemCatalogRepository,
  SystemParameterRepository,
  NotificationRepository,
  ReportRepository,
  ProfileRepository,
  SkillRepository,
} from '@app/repository';
import { JobsService } from './jobs.service';

/**
 * Cubre `publishJob()` y el disparo de alertas JOB_MATCH: se notifica solo
 * a los candidatos que matchean por encima del umbral, y no se notifica a
 * nadie si la oferta no pide ninguna skill puntual (evita ruido).
 */
describe('JobsService.publishJob', () => {
  let service: JobsService;
  let jobOfferRepository: { findById: jest.Mock; update: jest.Mock };
  let profileRepository: { findPublishedWithSkillsForMatching: jest.Mock };
  let notificationRepository: { createMany: jest.Mock };
  let systemParameterRepository: { findByKey: jest.Mock };

  const draftJob = { id: 1, companyId: 50, status: 'DRAFT', title: 'Dev Angular', description: 'desc', skillsRequired: 'angular,typescript' };

  beforeEach(async () => {
    jobOfferRepository = { findById: jest.fn(), update: jest.fn() };
    profileRepository = { findPublishedWithSkillsForMatching: jest.fn() };
    notificationRepository = { createMany: jest.fn() };
    systemParameterRepository = { findByKey: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: {} },
        { provide: JobOfferRepository, useValue: jobOfferRepository },
        { provide: SystemCatalogRepository, useValue: {} },
        { provide: SystemParameterRepository, useValue: systemParameterRepository },
        { provide: NotificationRepository, useValue: notificationRepository },
        { provide: ReportRepository, useValue: {} },
        { provide: ProfileRepository, useValue: profileRepository },
        { provide: SkillRepository, useValue: {} },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('rechaza si la oferta no le pertenece a la empresa autenticada', async () => {
    jobOfferRepository.findById.mockResolvedValue({ ...draftJob, companyId: 999 });

    await expect(service.publishJob(50, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza si la oferta no existe', async () => {
    jobOfferRepository.findById.mockResolvedValue(null);

    await expect(service.publishJob(50, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('notifica solo a los candidatos que matchean por encima del umbral (50%)', async () => {
    jobOfferRepository.findById.mockResolvedValue(draftJob);
    jobOfferRepository.update.mockResolvedValue({ ...draftJob, status: 'PUBLISHED' });
    profileRepository.findPublishedWithSkillsForMatching.mockResolvedValue([
      { userId: 101, skills: [{ normalizedName: 'angular', level: 'BASIC' }, { normalizedName: 'typescript', level: 'BASIC' }] }, // 100%
      { userId: 102, skills: [{ normalizedName: 'angular', level: 'BASIC' }] }, // 50%
      { userId: 103, skills: [{ normalizedName: 'python', level: 'EXPERT' }] }, // 0%
    ]);

    await service.publishJob(50, 1);

    expect(notificationRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 101, type: 'JOB_MATCH' }),
      expect.objectContaining({ userId: 102, type: 'JOB_MATCH' }),
    ]);
  });

  it('no notifica a nadie si la oferta no pide ninguna skill puntual', async () => {
    jobOfferRepository.findById.mockResolvedValue({ ...draftJob, skillsRequired: null });
    jobOfferRepository.update.mockResolvedValue({ ...draftJob, skillsRequired: null, status: 'PUBLISHED' });

    await service.publishJob(50, 1);

    expect(profileRepository.findPublishedWithSkillsForMatching).not.toHaveBeenCalled();
    expect(notificationRepository.createMany).not.toHaveBeenCalled();
  });

  it('no llama a createMany si nadie matchea por encima del umbral', async () => {
    jobOfferRepository.findById.mockResolvedValue(draftJob);
    jobOfferRepository.update.mockResolvedValue({ ...draftJob, status: 'PUBLISHED' });
    profileRepository.findPublishedWithSkillsForMatching.mockResolvedValue([
      { userId: 103, skills: [{ normalizedName: 'python', level: 'EXPERT' }] },
    ]);

    await service.publishJob(50, 1);

    expect(notificationRepository.createMany).not.toHaveBeenCalled();
  });
});
