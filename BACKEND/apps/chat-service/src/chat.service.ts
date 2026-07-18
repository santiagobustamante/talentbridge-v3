import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ChatGateway } from './chat.gateway';

/**
 * Lógica de negocio del chat candidato↔empresa. A diferencia de la
 * conversación con Joaquín (assistant-service), estos mensajes SÍ se
 * persisten en base de datos (tabla `chatMessage`) porque son comunicación
 * real entre dos personas que debe sobrevivir a la sesión, ser consultable
 * como historial y sincronizarse entre dispositivos. Cada método valida
 * que el usuario autenticado sea parte de la conversación (candidato o
 * empresa dueños de ella) antes de exponer o modificar datos.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Lista todas las conversaciones del usuario autenticado (según su rol,
   * las que tiene como candidato o como empresa), con el último mensaje,
   * el conteo de no leídos y el estado de bloqueo, para pintar la bandeja
   * de entrada del chat sin queries adicionales por conversación.
   */
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

  /**
   * Trae el detalle de una conversación puntual, validando que el usuario
   * autenticado sea el candidato o la empresa involucrados (nunca un
   * tercero, aunque conozca el id).
   */
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

  /**
   * Crea la conversación entre un candidato y una empresa si todavía no
   * existe (constraint única candidateId+companyId evita duplicados), o
   * devuelve la existente. Notifica por WebSocket a ambas partes para que
   * sus listas de conversaciones se actualicen en vivo.
   */
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

  /**
   * Devuelve los mensajes de una conversación paginados en orden
   * cronológico ascendente (más viejos primero), marcando con `isMine`
   * cuáles envió el propio usuario autenticado para que el frontend los
   * alinee a derecha/izquierda sin lógica extra.
   */
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

  /**
   * Envía un mensaje: valida pertenencia a la conversación y que el
   * remitente no esté bloqueado por el destinatario, persiste el mensaje y
   * actualiza `lastMessageAt` (usado para ordenar la bandeja de entrada), y
   * recién después de guardar en base de datos dispara los eventos
   * WebSocket (mensaje nuevo, contador de no leídos, conversación
   * actualizada) para ambas partes — el orden persistir→emitir asegura que
   * un refresh de página siempre vea el mensaje aunque el socket falle.
   */
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

  /**
   * Marca como leídos (`readAt`) todos los mensajes recibidos (no enviados
   * por el propio usuario) en la conversación, y notifica por WebSocket a
   * ambas partes para sincronizar el estado de "leído" y el contador de
   * no leídos en tiempo real.
   */
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

  /** Total de mensajes sin leer del usuario autenticado, sumando todas sus conversaciones — usado para el badge de notificaciones del chat. */
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

  /**
   * Bloquea a la otra parte de la conversación: crea un registro
   * `chatBlock` que `sendMessage` consulta para impedir que el bloqueado
   * siga escribiendo. Falla si ya existía un bloqueo igual (evita
   * duplicados).
   */
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

  /** Elimina el registro de bloqueo creado por `blockConversation`, permitiendo de nuevo que la otra parte envíe mensajes. */
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
