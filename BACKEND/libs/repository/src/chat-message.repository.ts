import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class ChatMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** No leídos en UNA conversación puntual — usado por `getConversations` (por cada fila) y `getConversation`. */
  async countUnreadForUser(conversationId: number, userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.count({ where: { conversationId, senderId: { not: userId }, readAt: null } });
  }

  /** No leídos sumando VARIAS conversaciones — badge global de notificaciones (`ChatService.getUnreadCount` y `ChatGateway.sendUnreadCount`, misma lógica duplicada en ambos antes de este refactor). */
  async countUnreadAcrossConversations(conversationIds: number[], userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.count({ where: { conversationId: { in: conversationIds }, senderId: { not: userId }, readAt: null } });
  }

  /** Página de mensajes en orden cronológico ascendente — historial de una conversación. */
  async findByConversationId(conversationId: number, skip: number, take: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      select: { id: true, conversationId: true, body: true, senderId: true, createdAt: true, readAt: true },
    });
  }

  /** Total de mensajes de una conversación — para la paginación de `findByConversationId`. */
  async countByConversationId(conversationId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.count({ where: { conversationId } });
  }

  /** `UncheckedCreateInput`: el service arma `conversationId`/`senderId` como FKs escalares directas. */
  async create(data: Prisma.ChatMessageUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.create({ data });
  }

  /** Marca como leídos todos los mensajes recibidos (no enviados por `userId`) en la conversación. */
  async markAllReadForUser(conversationId: number, userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Mensaje + quiénes participan de su conversación — `ChatService.reportMessage` necesita validar que quien reporta sea parte de la conversación. */
  async findByIdWithConversationParticipants(messageId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { candidateId: true, companyId: true } } },
    });
  }

  /** Registro acotado — batch lookup del panel de moderación (`ModerationService.list`) para resolver a qué mensaje apunta un reporte tipo `CHAT_MESSAGE`. */
  async findManyByIdsBasic(ids: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatMessage.findMany({ where: { id: { in: ids } }, select: { id: true, body: true, senderId: true } });
  }
}
