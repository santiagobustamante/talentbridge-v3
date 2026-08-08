import { Test } from '@nestjs/testing';
import { PrismaService } from '@app/database';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService.getCompanyAnalytics', () => {
  let service: AnalyticsService;
  let prisma: { jobOffer: { findMany: jest.Mock }; jobApplication: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { jobOffer: { findMany: jest.fn() }, jobApplication: { findMany: jest.fn() } };
    const module = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AnalyticsService);
  });

  it('arma el embudo por status, el top de vacantes y la tasa de conversión', async () => {
    prisma.jobOffer.findMany.mockResolvedValue([
      { id: 1, title: 'Dev Angular', status: 'PUBLISHED', _count: { applications: 3 } },
      { id: 2, title: 'Dev NestJS', status: 'PUBLISHED', _count: { applications: 1 } },
      { id: 3, title: 'Dev sin postulaciones', status: 'DRAFT', _count: { applications: 0 } },
    ]);
    const today = new Date();
    prisma.jobApplication.findMany.mockResolvedValue([
      { status: 'PENDING', createdAt: today },
      { status: 'PENDING', createdAt: today },
      { status: 'REVIEWED', createdAt: today },
      { status: 'PRESELECTED', createdAt: today },
    ]);

    const result = await service.getCompanyAnalytics(50);

    expect(result.totalJobs).toBe(3);
    expect(result.publishedJobs).toBe(2);
    expect(result.totalApplications).toBe(4);
    expect(result.statusFunnel).toEqual({ PENDING: 2, REVIEWED: 1, PRESELECTED: 1 });
    // 1 de 4 (PRESELECTED) -> 25%
    expect(result.conversionRate).toBe(25);
    expect(result.topJobs[0]).toEqual({ id: 1, title: 'Dev Angular', status: 'PUBLISHED', applicationsCount: 3 });
    expect(result.trend).toHaveLength(30);
    expect(result.trend[29].count).toBe(4); // hoy
    expect(result.trend[0].count).toBe(0); // hace 29 días
  });

  it('no rompe si la empresa no tiene vacantes ni postulaciones todavía', async () => {
    prisma.jobOffer.findMany.mockResolvedValue([]);
    prisma.jobApplication.findMany.mockResolvedValue([]);

    const result = await service.getCompanyAnalytics(50);

    expect(result.totalJobs).toBe(0);
    expect(result.totalApplications).toBe(0);
    expect(result.conversionRate).toBe(0);
    expect(result.topJobs).toEqual([]);
  });
});
