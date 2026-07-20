import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

/**
 * Regla de elegibilidad compartida entre el aval de habilidades (SkillsService)
 * y la vista de portafolio (PublicPortfolioService): una empresa solo puede
 * avalar a un candidato con el que ya tuvo contacto real (conversación o
 * postulación a una de sus vacantes) — evita avales al voleo.
 */
@Injectable()
export class CandidateAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async companyHasContactedCandidate(companyUserId: number, candidateUserId: number): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { candidateId_companyId: { candidateId: candidateUserId, companyId: companyUserId } },
    });
    if (conversation) return true;

    const application = await this.prisma.jobApplication.findFirst({
      where: { candidateId: candidateUserId, jobOffer: { companyId: companyUserId } },
    });
    return !!application;
  }
}
