import { Injectable } from '@nestjs/common';
import { ConversationRepository, JobApplicationRepository } from '@app/repository';

/**
 * Regla de elegibilidad compartida entre el aval de habilidades (SkillsService)
 * y la vista de portafolio (PublicPortfolioService): una empresa solo puede
 * avalar a un candidato con el que ya tuvo contacto real (conversación o
 * postulación a una de sus vacantes) — evita avales al voleo.
 */
@Injectable()
export class CandidateAccessService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly jobApplicationRepository: JobApplicationRepository,
  ) {}

  async companyHasContactedCandidate(companyUserId: number, candidateUserId: number): Promise<boolean> {
    const hasConversation = await this.conversationRepository.existsBetweenCandidateAndCompany(candidateUserId, companyUserId);
    if (hasConversation) return true;

    return this.jobApplicationRepository.existsForCandidateAndCompany(candidateUserId, companyUserId);
  }
}
