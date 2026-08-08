import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma, JobApplicationStatus } from '@app/database';

@Injectable()
export class JobApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nombre genérico a propósito — lo usan dos consumidores distintos: la
   * búsqueda de candidatos (Fase 3) y la regla de elegibilidad de avales
   * (`CandidateAccessService`, Fase 5).
   */
  async existsForCandidateAndCompany(candidateId: number, companyId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const application = await client.jobApplication.findFirst({
      where: { candidateId, jobOffer: { companyId } },
    });
    return !!application;
  }

  /** Batch — qué candidatos de una lista ya postularon a alguna oferta de esta empresa, en una sola consulta (evita N+1 en la búsqueda de candidatos). */
  async findManyForCompanyAndCandidates(companyId: number, candidateIds: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobApplication.findMany({
      where: { candidateId: { in: candidateIds }, jobOffer: { companyId } },
      select: { candidateId: true },
    });
  }

  /** Total de postulaciones en toda la plataforma — tarjeta del dashboard admin. */
  async count(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobApplication.count();
  }

  /** Total de postulaciones de UN candidato — estadística del asistente Joaquín (`postulacionesRealizadas`). */
  async countForCandidate(candidateId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobApplication.count({ where: { candidateId } });
  }

  /** Total de postulaciones recibidas por UNA empresa, opcionalmente filtrado por estado — estadísticas del asistente Joaquín del lado empresa (`postulacionesTotales`/`postulacionesPendientes`). */
  async countForCompany(companyId: number, status?: JobApplicationStatus, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.jobApplication.count({ where: { jobOffer: { companyId }, ...(status ? { status } : {}) } });
  }
}
