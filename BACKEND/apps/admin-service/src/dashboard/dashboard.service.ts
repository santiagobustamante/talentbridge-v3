import { Injectable } from '@nestjs/common';
import { UserRepository, JobOfferRepository, JobApplicationRepository, ReportRepository } from '@app/repository';

/** Métricas generales del sistema para el panel de control (Fase 14) — solo lectura, sin modelo propio, agrega sobre tablas que ya existen. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jobOfferRepository: JobOfferRepository,
    private readonly jobApplicationRepository: JobApplicationRepository,
    private readonly reportRepository: ReportRepository,
  ) {}

  async getStats() {
    const [usersByRole, suspendedCount, jobsByStatus, totalApplications, pendingReports] = await Promise.all([
      this.userRepository.groupByRole(),
      this.userRepository.count({ suspended: true }),
      this.jobOfferRepository.groupByStatus(),
      this.jobApplicationRepository.count(),
      this.reportRepository.count({ status: 'PENDING' }),
    ]);

    const roleCounts: Record<string, number> = {};
    for (const row of usersByRole) roleCounts[row.role] = row._count;

    const statusCounts: Record<string, number> = {};
    for (const row of jobsByStatus) statusCounts[row.status] = row._count;

    return {
      users: {
        candidates: roleCounts['CANDIDATE'] || 0,
        companies: roleCounts['COMPANY'] || 0,
        admins: roleCounts['ADMIN'] || 0,
        suspended: suspendedCount,
      },
      jobOffers: {
        draft: statusCounts['DRAFT'] || 0,
        published: statusCounts['PUBLISHED'] || 0,
        closed: statusCounts['CLOSED'] || 0,
        archived: statusCounts['ARCHIVED'] || 0,
      },
      totalApplications,
      pendingReports,
    };
  }
}
