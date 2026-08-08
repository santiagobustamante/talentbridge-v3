import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportRepository, JobOfferRepository, ChatMessageRepository, UserRepository } from '@app/repository';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ModerationService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly jobOfferRepository: JobOfferRepository,
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Lista reportes filtrables por estado/tipo, enriquecidos con un resumen
   * del contenido reportado — `targetId` no tiene FK real (apunta a 3 tablas
   * distintas según `targetType`, ver el modelo `Report`), así que se
   * resuelve con 3 lookups separados en vez de un solo `include` de Prisma.
   */
  async list(params: { status?: string; targetType?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.targetType) where.targetType = params.targetType;

    const [reports, total] = await Promise.all([
      this.reportRepository.findManyWithFilters(where, (params.page - 1) * params.limit, params.limit),
      this.reportRepository.count(where),
    ]);

    const jobIds = reports.filter((r) => r.targetType === 'JOB_OFFER').map((r) => r.targetId);
    const messageIds = reports.filter((r) => r.targetType === 'CHAT_MESSAGE').map((r) => r.targetId);
    const userIds = reports.filter((r) => r.targetType === 'USER').map((r) => r.targetId);

    const [jobs, messages, users] = await Promise.all([
      jobIds.length ? this.jobOfferRepository.findManyByIdsBasic(jobIds) : [],
      messageIds.length ? this.chatMessageRepository.findManyByIdsBasic(messageIds) : [],
      userIds.length ? this.userRepository.findManyByIdsForAdminLookup(userIds) : [],
    ]);
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const messageById = new Map(messages.map((m) => [m.id, m]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const data = reports.map((r) => ({
      ...r,
      target:
        r.targetType === 'JOB_OFFER' ? jobById.get(r.targetId) || null :
        r.targetType === 'CHAT_MESSAGE' ? messageById.get(r.targetId) || null :
        userById.get(r.targetId) || null,
    }));

    return { data, total, page: params.page, limit: params.limit };
  }

  /** Cuenta de reportes pendientes — usada en el dashboard (Fase 14). */
  async countPending() {
    return this.reportRepository.count({ status: 'PENDING' });
  }

  /**
   * Marca un reporte como descartado o resuelto. No automatiza ninguna
   * acción de remediación (despublicar oferta, suspender usuario) — esas ya
   * existen como funciones propias del panel (Catálogos/Usuarios) y un
   * admin las aplica por separado si corresponde; acá solo se registra que
   * el reporte fue atendido, para no mezclar dos responsabilidades en un
   * solo endpoint.
   */
  async resolve(reportId: number, status: 'DISMISSED' | 'ACTION_TAKEN', adminId: number, ipAddress?: string) {
    const before = await this.reportRepository.findById(reportId);
    if (!before) throw new NotFoundException('Reporte no encontrado');

    const updated = await this.reportRepository.update(reportId, { status, reviewedById: adminId, reviewedAt: new Date() });

    await this.auditLog.record({
      adminId,
      action: status === 'DISMISSED' ? 'DISMISS_REPORT' : 'RESOLVE_REPORT',
      entityType: 'Report',
      entityId: String(reportId),
      before: { status: before.status },
      after: { status: updated.status },
      ipAddress,
    });

    return updated;
  }
}
