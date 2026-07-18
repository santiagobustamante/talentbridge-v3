/**
 * DTOs del sistema de mensajería candidato↔empresa (chat.service.ts y
 * chat-socket.service.ts). Los campos `blockedByMe`/`blockedByOther`
 * soportan el bloqueo unilateral de conversaciones, e `isMine` en
 * MessageDto ya viene resuelto por el backend para que el frontend no tenga
 * que comparar IDs de usuario para alinear las burbujas de chat.
 */
export interface ConversationDto {
  id: number;
  candidate: { id: number; fullName: string | null; professionalTitle: string | null; city: string | null; slug: string };
  company: { id: number; companyName: string | null; logoUrl?: string | null; sector: string | null; city: string | null };
  lastMessage: { body: string; createdAt: string; senderId: number } | null;
  lastMessageAt: string | null;
  unreadCount: number;
  blockedByMe: boolean;
  blockedByOther: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
  isMine: boolean;
}

export interface UnreadCountDto {
  count: number;
}

export interface MessagesResponse {
  data: MessageDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChatUserSummary {
  id: number;
  fullName: string;
  name: string;
  title: string;
  city: string | null;
}
