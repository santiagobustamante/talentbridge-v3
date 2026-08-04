import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

/** Métricas generales del sistema para el panel de control (Fase 14) — solo lectura, sin modelo propio, agrega sobre tablas que ya existen. */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [usersByRole, suspendedCount, jobsByStatus, totalApplications, pendingReports] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.user.count({ where: { suspended: true } }),
      this.prisma.jobOffer.groupBy({ by: ['status'], _count: true }),
      this.prisma.jobApplication.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
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
