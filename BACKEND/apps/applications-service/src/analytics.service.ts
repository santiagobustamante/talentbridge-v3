import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

const TREND_DAYS = 30;
const TOP_JOBS_LIMIT = 5;

/**
 * Analítica de postulaciones para el panel de empresa. Todo se calcula sobre
 * datos que ya existían (JobOffer/JobApplication) — no agrega ningún modelo
 * nuevo. No incluye "vistas de vacante" porque esa señal no se trackea hoy
 * (solo se trackean vistas de perfil de candidato, `ProfileView`, que es una
 * cosa distinta — cuántas empresas vieron a un candidato, no al revés).
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyAnalytics(companyUserId: number) {
    const [jobs, applications] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where: { companyId: companyUserId },
        select: { id: true, title: true, status: true, _count: { select: { applications: true } } },
      }),
      this.prisma.jobApplication.findMany({
        where: { jobOffer: { companyId: companyUserId } },
        select: { status: true, createdAt: true },
      }),
    ]);

    const statusFunnel: Record<string, number> = {};
    for (const app of applications) {
      statusFunnel[app.status] = (statusFunnel[app.status] || 0) + 1;
    }

    const trend = this.buildTrend(applications.map((a) => a.createdAt));

    const topJobs = jobs
      .map((j) => ({ id: j.id, title: j.title, status: j.status, applicationsCount: j._count.applications }))
      .sort((a, b) => b.applicationsCount - a.applicationsCount)
      .slice(0, TOP_JOBS_LIMIT);

    const preselectedOrHired = (statusFunnel['PRESELECTED'] || 0) + (statusFunnel['HIRED'] || 0);

    return {
      totalJobs: jobs.length,
      publishedJobs: jobs.filter((j) => j.status === 'PUBLISHED').length,
      totalApplications: applications.length,
      conversionRate: applications.length === 0 ? 0 : Math.round((preselectedOrHired / applications.length) * 100),
      statusFunnel,
      trend,
      topJobs,
    };
  }

  /** Cuenta de postulaciones por día para los últimos `TREND_DAYS` días, con los días sin datos en cero (no se omiten, para que el gráfico no tenga huecos). */
  private buildTrend(createdAtDates: Date[]): { date: string; count: number }[] {
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }

    const indexByDate = new Map(days.map((d, i) => [d.date, i]));
    for (const createdAt of createdAtDates) {
      const dateStr = createdAt.toISOString().slice(0, 10);
      const idx = indexByDate.get(dateStr);
      if (idx !== undefined) days[idx].count++;
    }

    return days;
  }
}
