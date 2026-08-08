import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma, JobOfferStatus } from '@app/database';

/** Include compartido por `findManyForCompany`/`findOneForCompany` — la empresa viendo sus propias ofertas (distinto del include de `findByIdForCandidate`, que es un candidato viendo el detalle público). */
const COMPANY_VIEW_INCLUDE = {
  _count: { select: { applications: true } },
  company: {
    select: {
      companyProfile: { select: { companyName: true, logoUrl: true } },
    },
  },
} satisfies Prisma.JobOfferInclude;

@Injectable()
export class JobOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(jobId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findUnique({ where: { id: jobId } });
  }

  async exists(jobId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const job = await client.jobOffer.findUnique({ where: { id: jobId }, select: { id: true } });
    return !!job;
  }

  /** `status` ya viene validado por el service (contra `ALL_STATUSES`) — acá solo se arma el filtro, no se revalida. */
  async findManyForCompany(companyUserId: number, status: JobOfferStatus | undefined, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findMany({
      where: { companyId: companyUserId, ...(status ? { status } : {}) },
      include: COMPANY_VIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForCompany(companyUserId: number, jobId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findFirst({
      where: { id: jobId, companyId: companyUserId },
      include: COMPANY_VIEW_INCLUDE,
    });
  }

  /** `UncheckedCreateInput`: el service arma `companyId` como FK escalar directa, no como `company: { connect }`. */
  async create(data: Prisma.JobOfferUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.create({ data });
  }

  async update(jobId: number, data: Prisma.JobOfferUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.update({ where: { id: jobId }, data });
  }

  async delete(jobId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.delete({ where: { id: jobId } });
  }

  /** Página de ofertas publicadas que matchean el `where` dinámico armado por `JobsService` (filtros de texto/ciudad/modalidad/contrato quedan en el service) — incluye, por candidato, si ya se postuló. */
  async findPublishedForCandidate(
    where: Prisma.JobOfferWhereInput,
    candidateUserId: number,
    skip: number,
    take: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findMany({
      where,
      include: {
        company: {
          select: { id: true, companyProfile: { select: { companyName: true, logoUrl: true, city: true } } },
        },
        applications: {
          where: { candidateId: candidateUserId },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /** Total de ofertas publicadas que matchean el mismo `where` dinámico usado por `findPublishedForCandidate` — para la paginación. */
  async countForCandidate(where: Prisma.JobOfferWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.count({ where });
  }

  /** Detalle de una oferta para la vista de candidato (incluye datos públicos completos de la empresa) — distinto del detalle que ve la empresa dueña (`findOneForCompany`). */
  async findByIdForCandidate(jobId: number, candidateUserId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            companyProfile: { select: { companyName: true, logoUrl: true, city: true, description: true, websiteUrl: true } },
          },
        },
        applications: {
          where: { candidateId: candidateUserId },
          select: { id: true, status: true },
        },
      },
    });
  }

  /** Registro acotado — batch lookup del panel de moderación (`ModerationService.list`) para resolver a qué oferta apunta un reporte tipo `JOB_OFFER`. */
  async findManyByIdsBasic(ids: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, status: true } });
  }

  /** Cuántas ofertas hay por estado — tarjetas del dashboard admin. */
  async groupByStatus(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.groupBy({ by: ['status'], _count: true });
  }

  /** Ofertas publicadas más recientes de toda la plataforma, con el nombre de la empresa — insumo del asistente Joaquín para calcular compatibilidad candidato→ofertas (`AssistantService.getCandidateJobMatches`). */
  async findPublishedForMatching(limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findMany({
      where: { status: JobOfferStatus.PUBLISHED },
      include: { company: { select: { companyProfile: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Ofertas publicadas de UNA empresa puntual, sin relaciones — insumo del asistente Joaquín del lado empresa (`AssistantService.getCompanyCandidateMatches`), distinto de `findManyForCompany` (que trae el include pesado para la pantalla "Mis ofertas"). */
  async findPublishedForCompanyMatching(companyId: number, limit: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.findMany({
      where: { companyId, status: JobOfferStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Total de ofertas publicadas en toda la plataforma — estadística del asistente Joaquín del lado candidato. */
  async countPublished(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.count({ where: { status: JobOfferStatus.PUBLISHED } });
  }

  /** Total de ofertas de una empresa, opcionalmente filtrado por estado — estadísticas del asistente Joaquín del lado empresa (`ofertasTotales`/`ofertasActivas`). */
  async countForCompany(companyId: number, status?: JobOfferStatus, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobOffer.count({ where: { companyId, ...(status ? { status } : {}) } });
  }
}
