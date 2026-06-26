import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtUtil } from '@app/auth';
import { PrismaService } from '@app/database';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

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

  private userSockets = new Map<number, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const cookie = client.handshake.headers.cookie;
    const token = JwtUtil.extractTokenFromCookie(cookie);

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

  handleDisconnect(client: Socket) {
    const authClient = client as AuthenticatedSocket;
    if (authClient.userId) {
      this.userSockets.get(authClient.userId)?.delete(client.id);
      if (this.userSockets.get(authClient.userId)?.size === 0) {
        this.userSockets.delete(authClient.userId);
      }
    }
  }

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

  async notifyReadMessages(conversationId: number, readerId: number) {
    this.server.to(`conversation:${conversationId}`).emit('chat:read', { conversationId, readBy: readerId });
  }

  async notifyUnreadCount(userId: number) {
    await this.sendUnreadCount(userId);
  }

  async notifyConversationUpdated(userId: number) {
    this.server.to(`user:${userId}`).emit('chat:conversation-updated', { userId });
  }

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
