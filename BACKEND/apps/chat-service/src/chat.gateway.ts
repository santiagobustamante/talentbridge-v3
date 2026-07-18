import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtUtil } from '@app/auth';
import { PrismaService } from '@app/database';

/** Extiende el Socket de socket.io con el id de usuario ya autenticado, seteado en `handleConnection`. */
interface AuthenticatedSocket extends Socket {
  userId?: number;
}

/**
 * Gateway WebSocket (Socket.io, namespace `/chat`) del chat en tiempo real
 * entre candidato y empresa. A diferencia de un chat con `@SubscribeMessage`
 * bidireccional, este gateway es principalmente "push": no recibe mensajes
 * del cliente por socket (el envío de mensajes se hace vía HTTP en
 * `ChatController`/`ChatService`, que persiste primero en base de datos y
 * recién después llama a este gateway para retransmitir en vivo). Su
 * trabajo es mantener el mapeo usuario→sockets conectados y las salas
 * (`user:<id>` y `conversation:<id>`) para poder emitir eventos dirigidos.
 */
@WebSocketGateway({
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** Sockets activos por usuario (un usuario puede tener varias pestañas/dispositivos abiertos). */
  private userSockets = new Map<number, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Se ejecuta en cada nueva conexión de socket. Autentica leyendo el JWT
   * de la cookie httpOnly, con el token mandado en `handshake.auth.token`
   * como respaldo (mismo motivo que el header Authorization en HTTP: en
   * despliegues cross-domain algunos navegadores bloquean la cookie
   * `SameSite=None`, y sin este respaldo el chat quedaría inutilizable en
   * esos casos aunque el resto de la sesión funcione vía localStorage).
   * Si no hay token válido por ninguna de las dos vías, desconecta el
   * socket. Si es válido, une al socket a la sala personal `user:<id>` y a
   * la sala de cada conversación en la que participa, para poder recibir
   * eventos dirigidos sin tener que "suscribirse" manualmente desde el
   * cliente.
   */
  async handleConnection(client: Socket) {
    const cookie = client.handshake.headers.cookie;
    const token = JwtUtil.extractTokenFromCookie(cookie) || (client.handshake.auth?.['token'] as string | undefined);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = JwtUtil.verifyToken(token);
      const authClient = client as AuthenticatedSocket;
      authClient.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)?.add(client.id);

      await client.join(`user:${payload.sub}`);

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        const conversations = await this.prisma.conversation.findMany({
          where: user.role === 'CANDIDATE'
            ? { candidateId: payload.sub }
            : { companyId: payload.sub },
          select: { id: true },
        });
        for (const conv of conversations) {
          await client.join(`conversation:${conv.id}`);
        }
      }

      await this.sendUnreadCount(payload.sub);
    } catch {
      client.disconnect();
    }
  }

  /** Al desconectarse un socket, lo quita del registro `userSockets` (y limpia la entrada del usuario si ya no le quedan sockets abiertos). */
  handleDisconnect(client: Socket) {
    const authClient = client as AuthenticatedSocket;
    if (authClient.userId) {
      this.userSockets.get(authClient.userId)?.delete(client.id);
      if (this.userSockets.get(authClient.userId)?.size === 0) {
        this.userSockets.delete(authClient.userId);
      }
    }
  }

  /**
   * Emite el evento `chat:message` a todos los sockets unidos a la sala de
   * esta conversación, para que aparezca en tiempo real en la pantalla del
   * destinatario sin necesidad de hacer polling. Llamado por `ChatService`
   * después de guardar el mensaje en la base de datos.
   */
  async sendMessageToConversation(conversationId: number, senderId: number, body: string, messageId: number, createdAt: string) {
    this.server.to(`conversation:${conversationId}`).emit('chat:message', {
      id: messageId,
      conversationId,
      senderId,
      body,
      createdAt,
      readAt: null,
      isMine: false,
    });
  }

  /** Avisa a los sockets de la conversación que otro usuario marcó mensajes como leídos, para actualizar los checks de "visto" en la UI en vivo. */
  async notifyReadMessages(conversationId: number, readerId: number) {
    this.server.to(`conversation:${conversationId}`).emit('chat:read', { conversationId, readBy: readerId });
  }

  /** Recalcula y empuja el contador de mensajes sin leer de un usuario (usado para actualizar el badge de notificaciones en tiempo real). */
  async notifyUnreadCount(userId: number) {
    await this.sendUnreadCount(userId);
  }

  /** Avisa a un usuario que su lista de conversaciones cambió (nueva conversación creada o actualizada), para que el frontend la refresque. */
  async notifyConversationUpdated(userId: number) {
    this.server.to(`user:${userId}`).emit('chat:conversation-updated', { userId });
  }

  /** Calcula el total de mensajes sin leer de un usuario y lo emite por su sala personal, solo si tiene algún socket conectado. */
  private async sendUnreadCount(userId: number) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

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

    this.server.to(`user:${userId}`).emit('chat:unread-count', { count });
  }
}
