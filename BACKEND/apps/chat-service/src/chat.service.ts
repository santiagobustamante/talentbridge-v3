import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getConversations(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const where = user.role === 'CANDIDATE'
      ? { candidateId: userId }
      : { companyId: userId };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
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
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        blocks: {
          select: { blockerId: true, blockedId: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        const blockedByMe = conv.blocks.some((b) => b.blockerId === userId);
        const blockedByOther = conv.blocks.some((b) => b.blockedId === userId);

        return {
          id: conv.id,
          candidate: {
            id: conv.candidate.id,
            fullName: conv.candidate.profile?.fullName,
            professionalTitle: conv.candidate.profile?.professionalTitle,
            city: conv.candidate.profile?.city,
            slug: conv.candidate.profile?.slug,
          },
          company: {
            id: conv.company.id,
            companyName: conv.company.companyProfile?.companyName,
            logoUrl: conv.company.companyProfile?.logoUrl,
            sector: conv.company.companyProfile?.sector,
            city: conv.company.companyProfile?.city,
          },
          lastMessage: conv.messages[0]
            ? { body: conv.messages[0].body, createdAt: conv.messages[0].createdAt, senderId: conv.messages[0].senderId }
            : null,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          blockedByMe,
          blockedByOther,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }),
    );

    return enriched;
  }

  async getConversation(userId: number, conversationId: number) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
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
        blocks: { select: { blockerId: true, blockedId: true } },
      },
    });

    if (!conv) throw new NotFoundException('Conversación no encontrada');
    if (conv.candidateId !== userId && conv.companyId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const unreadCount = await this.prisma.chatMessage.count({
      where: { conversationId, senderId: { not: userId }, readAt: null },
    });

    return {
      id: conv.id,
      candidate: {
        id: conv.candidate.id,
        fullName: conv.candidate.profile?.fullName,
        professionalTitle: conv.candidate.profile?.professionalTitle,
        city: conv.candidate.profile?.city,
        slug: conv.candidate.profile?.slug,
      },
      company: {
        id: conv.company.id,
        companyName: conv.company.companyProfile?.companyName,
        logoUrl: conv.company.companyProfile?.logoUrl,
        sector: conv.company.companyProfile?.sector,
        city: conv.company.companyProfile?.city,
      },
      unreadCount,
      blockedByMe: conv.blocks.some((b) => b.blockerId === userId),
      blockedByOther: conv.blocks.some((b) => b.blockedId === userId),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  async createOrGetConversation(candidateId: number, companyId: number) {
    let conversation = await this.prisma.conversation.findUnique({
      where: { candidateId_companyId: { candidateId, companyId } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { candidateId, companyId, lastMessageAt: new Date() },
      });
    }

    await this.chatGateway.notifyConversationUpdated(candidateId);
    await this.chatGateway.notifyConversationUpdated(companyId);

    return conversation;
  }

  async getMessages(userId: number, conversationId: number, page = 1, limit = 30) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (conversation.candidateId !== userId && conversation.companyId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          conversationId: true,
          body: true,
          senderId: true,
          createdAt: true,
          readAt: true,
        },
      }),
      this.prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.map((m) => ({ ...m, isMine: m.senderId === userId })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(userId: number, conversationId: number, body: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (conversation.candidateId !== userId && conversation.companyId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const block = await this.prisma.chatBlock.findFirst({
      where: { conversationId, blockedId: userId },
    });
    if (block) throw new ForbiddenException('No puedes enviar mensajes en esta conversación');

    const message = await this.prisma.chatMessage.create({
      data: { conversationId, senderId: userId, body },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), updatedAt: new Date() },
    });

    const recipientId = conversation.candidateId === userId ? conversation.companyId : conversation.candidateId;

    await this.chatGateway.sendMessageToConversation(conversationId, userId, body, message.id, message.createdAt.toISOString());
    await this.chatGateway.notifyUnreadCount(userId);
    await this.chatGateway.notifyUnreadCount(recipientId);
    await this.chatGateway.notifyConversationUpdated(userId);
    await this.chatGateway.notifyConversationUpdated(recipientId);

    return message;
  }

  async markAsRead(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (conversation.candidateId !== userId && conversation.companyId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const result = await this.prisma.chatMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    const otherId = conversation.candidateId === userId ? conversation.companyId : conversation.candidateId;
    await this.chatGateway.notifyReadMessages(conversationId, userId);
    await this.chatGateway.notifyUnreadCount(userId);
    await this.chatGateway.notifyUnreadCount(otherId);

    return { markedAsRead: result.count };
  }

  async getUnreadCount(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const conversations = await this.prisma.conversation.findMany({
      where: user.role === 'CANDIDATE' ? { candidateId: userId } : { companyId: userId },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    const count = conversationIds.length > 0
      ? await this.prisma.chatMessage.count({
          where: { conversationId: { in: conversationIds }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    return { count };
  }

  async blockConversation(userId: number, conversationId: number, reason?: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (conversation.candidateId !== userId && conversation.companyId !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const blockedId = conversation.candidateId === userId ? conversation.companyId : conversation.candidateId;

    const existing = await this.prisma.chatBlock.findFirst({
      where: { conversationId, blockerId: userId, blockedId },
    });
    if (existing) throw new ConflictException('Conversación ya bloqueada');

    await this.prisma.chatBlock.create({
      data: { conversationId, blockerId: userId, blockedId, reason },
    });

    return { message: 'Conversación bloqueada' };
  }

  async unblockConversation(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    const blockedId = conversation.candidateId === userId ? conversation.companyId : conversation.candidateId;

    await this.prisma.chatBlock.deleteMany({
      where: { conversationId, blockerId: userId, blockedId },
    });

    return { message: 'Conversación desbloqueada' };
  }
}
