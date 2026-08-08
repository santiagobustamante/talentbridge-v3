import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma, UserRole } from '@app/database';

/** Selección de candidato/empresa compartida por `findByIdWithChatDetails`/`findManyForUserWithDetails` — la bandeja y el detalle de una conversación de chat muestran los mismos datos resumidos de ambas partes. */
const CHAT_PARTICIPANTS_INCLUDE = {
  candidate: {
    select: {
      id: true,
      profile: { select: { fullName: true, professionalTitle: true, photoUrl: true, slug: true, city: true } },
    },
  },
  company: {
    select: {
      id: true,
      companyProfile: { select: { companyName: true, logoUrl: true, sector: true, city: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nombre genérico a propósito (no "paraSkills" ni "paraBúsqueda") — lo usan
   * dos consumidores distintos: la búsqueda de candidatos (Fase 3) y la
   * regla de elegibilidad de avales (`CandidateAccessService`, Fase 5).
   */
  async existsBetweenCandidateAndCompany(candidateId: number, companyId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const conversation = await client.conversation.findUnique({
      where: { candidateId_companyId: { candidateId, companyId } },
    });
    return !!conversation;
  }

  /** Batch — qué candidatos de una lista ya tuvieron conversación con esta empresa, en una sola consulta (evita N+1 en la búsqueda de candidatos). */
  async findManyForCompanyAndCandidates(companyId: number, candidateIds: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.findMany({
      where: { companyId, candidateId: { in: candidateIds } },
      select: { candidateId: true },
    });
  }

  /** Todas las conversaciones de un usuario (según sea candidato o empresa), con el resumen de ambas partes y el último mensaje — bandeja de entrada del chat. */
  async findManyForUserWithDetails(userId: number, role: UserRole, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.findMany({
      where: role === UserRole.CANDIDATE ? { candidateId: userId } : { companyId: userId },
      include: {
        ...CHAT_PARTICIPANTS_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        blocks: { select: { blockerId: true, blockedId: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  /**
   * Solo los ids de las conversaciones de un usuario — insumo del contador
   * global de no leídos (`ChatService.getUnreadCount` y
   * `ChatGateway.sendUnreadCount`, misma lógica duplicada en ambos antes de
   * este refactor) y de `ChatGateway.handleConnection` para unir el socket
   * a la sala de cada conversación.
   */
  async findIdsForUser(userId: number, role: UserRole, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.findMany({
      where: role === UserRole.CANDIDATE ? { candidateId: userId } : { companyId: userId },
      select: { id: true },
    });
  }

  /** Detalle de una conversación puntual, con el resumen de ambas partes — `ChatService.getConversation`. */
  async findByIdWithChatDetails(conversationId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        ...CHAT_PARTICIPANTS_INCLUDE,
        blocks: { select: { blockerId: true, blockedId: true } },
      },
    });
  }

  /** Registro completo sin relaciones — chequeo de pertenencia (candidato/empresa dueños), reusado por varios métodos de chat que no necesitan el detalle de las partes. */
  async findById(conversationId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.findUnique({ where: { id: conversationId } });
  }

  /**
   * Crea la conversación entre un candidato y una empresa si no existe, o
   * devuelve la existente — `upsert` (no find-then-create) para que sea
   * atómico ante dos requests simultáneas creando la misma conversación.
   */
  async upsertForCandidateAndCompany(candidateId: number, companyId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.upsert({
      where: { candidateId_companyId: { candidateId, companyId } },
      update: {},
      create: { candidateId, companyId, lastMessageAt: new Date() },
    });
  }

  async update(conversationId: number, data: Prisma.ConversationUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.conversation.update({ where: { id: conversationId }, data });
  }
}
