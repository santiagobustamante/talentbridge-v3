import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, JobOfferStatus, JobApplicationStatus, NotificationType, Prisma } from '@app/database';
import { computeSkillMatch } from '@app/contracts';
import { getPaginationLimits, clampLimit } from '@app/common';

/** Traduce el estado de una postulación al texto que ve el candidato en su notificación. */
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  REVIEWED: 'Revisada',
  PRESELECTED: 'Preseleccionado',
  REJECTED: 'Rechazada',
  HIRED: 'Contratado',
};

/**
 * Lógica de negocio de las postulaciones. Encapsula todas las reglas de
 * validación (oferta publicada, perfil completo, no duplicar postulación,
 * match mínimo de habilidades) y las consultas paginadas/filtradas que
 * consume el controller, tanto desde el lado candidato como empresa.
 */
@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una postulación de un candidato a una oferta. Antes de guardar,
   * valida en cadena: que la oferta exista y esté publicada, que el
   * candidato tenga perfil, que no se haya postulado ya (constraint única
   * jobOfferId+candidateId) y que tenga al menos una habilidad que matchee
   * con los requisitos — esto evita postulaciones "spam" a ofertas para las
   * que el candidato claramente no califica, usando la misma función de
   * matching (`computeSkillMatch`) que usa el resto de la plataforma.
   */
  async apply(candidateUserId: number, jobId: number, coverMessage?: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.status !== JobOfferStatus.PUBLISHED) throw new BadRequestException('Esta oferta no está publicada');

    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    if (!profile) throw new BadRequestException('Completa tu perfil antes de aplicar');

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobOfferId_candidateId: { jobOfferId: jobId, candidateId: candidateUserId } },
    });
    if (existing) throw new ConflictException('Ya aplicaste a esta oferta');

    const candidateSkills = await this.prisma.skill.findMany({
      where: { profileId: profile.id },
      select: { normalizedName: true, level: true },
    });
    const match = computeSkillMatch(job.skillsRequired, candidateSkills);
    if (!match.hasAnyMatch) {
      throw new BadRequestException('No tienes al menos una habilidad que coincida con los requisitos de esta oferta');
    }

    // El chequeo de `existing` de arriba es best-effort (dos requests
    // simultáneas del mismo candidato — doble click, dos pestañas — pueden
    // pasarlo las dos antes de que cualquiera cree el registro). La
    // constraint única jobOfferId+candidateId en la base es la que
    // realmente lo impide; acá solo traducimos su violación (P2002) al
    // mismo 409 amigable en vez de dejar pasar el error crudo de Prisma.
    //
    // La postulación y su notificación a la empresa van en la misma
    // transacción: sin esto, si `notification.create` fallaba después de
    // que la postulación ya se hubiera guardado, el candidato veía un error
    // (y podía reintentar) pero la postulación había quedado creada de
    // todos modos — un reintento entonces chocaba con "Ya aplicaste" pese a
    // que, de cara al candidato, la primera vez había "fallado".
    let application;
    try {
      application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.jobApplication.create({
          data: {
            jobOfferId: jobId,
            candidateId: candidateUserId,
            coverMessage,
            status: JobApplicationStatus.PENDING,
          },
        });

        const candidateName = profile.fullName || 'Un candidato';
        await tx.notification.create({
          data: {
            userId: job.companyId,
            type: NotificationType.NEW_APPLICATION,
            title: 'Nueva postulación',
            body: `${candidateName} se postuló a tu vacante "${job.title}".`,
            link: `/company/jobs?jobId=${jobId}&applicationId=${created.id}`,
          },
        });

        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ya aplicaste a esta oferta');
      }
      throw err;
    }

    return application;
  }

  /**
   * Devuelve, paginadas, las postulaciones del candidato autenticado, con
   * la info de la oferta y la empresa embebida para que el frontend no
   * tenga que hacer otro round-trip. Soporta filtro opcional por estado y
   * por rango de fechas de creación.
   */
  async getMyApplications(
    candidateUserId: number,
    params?: { page?: string; limit?: string; status?: string; fromDate?: string; toDate?: string },
  ) {
    const page = Math.max(1, parseInt(params?.page || '1', 10) || 1);
    const paginationLimits = await getPaginationLimits(this.prisma);
    const limit = clampLimit(params?.limit ? parseInt(params.limit, 10) : undefined, paginationLimits);

    const where: any = { candidateId: candidateUserId };

    if (params?.status) {
      const validStatuses = Object.values(JobApplicationStatus);
      if (validStatuses.includes(params.status as JobApplicationStatus)) {
        where.status = params.status;
      }
    }

    if (params?.fromDate || params?.toDate) {
      where.createdAt = {};
      if (params.fromDate) {
        const from = new Date(params.fromDate);
        if (isNaN(from.getTime())) throw new BadRequestException('fromDate inválida. Usa formato YYYY-MM-DD');
        where.createdAt.gte = from;
      }
      if (params.toDate) {
        const to = new Date(params.toDate);
        if (isNaN(to.getTime())) throw new BadRequestException('toDate inválida. Usa formato YYYY-MM-DD');
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        include: {
          jobOffer: {
            select: {
              id: true,
              title: true,
              city: true,
              modality: true,
              contractType: true,
              customContractType: true,
              workload: true,
              customWorkload: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
              status: true,
              skillsRequired: true,
              publishedAt: true,
              createdAt: true,
              company: {
                select: {
                  companyProfile: {
                    select: { companyName: true, logoUrl: true, city: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Lista los candidatos que se postularon a una oferta puntual de la
   * empresa. Verifica que la oferta pertenezca a la empresa autenticada
   * (companyUserId) antes de devolver datos — evita que una empresa vea
   * postulaciones de ofertas ajenas.
   */
  async getJobApplications(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    return this.prisma.jobApplication.findMany({
      where: { jobOfferId: jobId },
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                professionalTitle: true,
                city: true,
                slug: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cambia el estado de una postulación (ej. aceptarla o rechazarla).
   * Solo la empresa dueña de la oferta asociada puede hacerlo, y el nuevo
   * estado debe ser uno de los valores válidos del enum JobApplicationStatus.
   */
  async updateStatus(companyUserId: number, applicationId: number, newStatus: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { jobOffer: true },
    });

    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (application.jobOffer.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    const validStatuses = Object.values(JobApplicationStatus);
    if (!validStatuses.includes(newStatus as JobApplicationStatus)) {
      throw new BadRequestException('Estado no válido');
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    // Mismo motivo que en `apply()`: el cambio de estado y la notificación
    // al candidato van en una sola transacción para que no quede el estado
    // actualizado sin avisarle (o viceversa) si una de las dos escrituras falla.
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: newStatus as JobApplicationStatus },
      });

      await tx.notification.create({
        data: {
          userId: application.candidateId,
          type: NotificationType.APPLICATION_STATUS_CHANGED,
          title: 'Tu postulación cambió de estado',
          body: `Tu postulación en "${application.jobOffer.title}" cambió su estado a ${statusLabel}.`,
          link: `/app/jobs?tab=my-applications&jobId=${application.jobOfferId}`,
        },
      });

      return result;
    });

    return updated;
  }
}
