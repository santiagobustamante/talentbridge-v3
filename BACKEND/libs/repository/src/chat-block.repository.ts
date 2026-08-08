import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class ChatBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** ¿Está `blockedId` bloqueado por alguien en esta conversación? — chequeo de `sendMessage` antes de dejar escribir (no le importa quién bloqueó, solo si puede escribir). */
  async findByConversationAndBlockedUser(conversationId: number, blockedId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatBlock.findFirst({ where: { conversationId, blockedId } });
  }

  /** ¿`blockerId` ya bloqueó específicamente a `blockedId` en esta conversación? — chequeo anti-duplicado de `blockConversation`. */
  async findByConversationBlockerAndBlocked(conversationId: number, blockerId: number, blockedId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatBlock.findFirst({ where: { conversationId, blockerId, blockedId } });
  }

  /** `UncheckedCreateInput`: el service arma `conversationId`/`blockerId`/`blockedId` como FKs escalares directas. */
  async create(data: Prisma.ChatBlockUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatBlock.create({ data });
  }

  async deleteMany(conversationId: number, blockerId: number, blockedId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.chatBlock.deleteMany({ where: { conversationId, blockerId, blockedId } });
  }
}
