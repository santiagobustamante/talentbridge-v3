import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ConversationDto, MessageDto, MessagesResponse, UnreadCountDto } from '../models/chat.models';
import { ChatSocketService } from './chat-socket.service';
import { environment } from '../../../environments/environment';

/**
 * Servicio de mensajería (HTTP) entre candidatos y empresas. Combina
 * llamadas REST tradicionales (historial de mensajes, crear conversación)
 * con el contador de no-leídos, que se mantiene en un `BehaviorSubject`
 * local y se actualiza tanto por HTTP (`refreshUnreadCount`) como en tiempo
 * real vía WebSocket (suscripción a `chatSocket.unreadCount$` en el
 * constructor) para que el badge de mensajes no leídos se refresque sin
 * recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = environment.apiUrl;

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private chatSocket: ChatSocketService,
  ) {
    this.chatSocket.unreadCount$.subscribe((data) => {
      this.setUnreadCount(data.count ?? 0);
    });
  }

  /** Lista las conversaciones del usuario autenticado (candidato o empresa), con el último mensaje y estado de bloqueo. */
  getConversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(`${this.api}/chat/conversations`);
  }

  /** Crea (o recupera si ya existe) una conversación entre la empresa autenticada y un candidato. */
  createConversation(candidateId: number): Observable<ConversationDto> {
    return this.http.post<ConversationDto>(`${this.api}/chat/conversations`, { candidateId });
  }

  /** Obtiene el detalle de una conversación puntual. */
  getConversation(id: number): Observable<ConversationDto> {
    return this.http.get<ConversationDto>(`${this.api}/chat/conversations/${id}`);
  }

  /** Obtiene los mensajes de una conversación, paginados. */
  getMessages(conversationId: number, page = 1, limit = 30): Observable<MessagesResponse> {
    return this.http.get<MessagesResponse>(`${this.api}/chat/conversations/${conversationId}/messages`, { params: { page, limit } });
  }

  /** Envía un mensaje por HTTP (persistencia). El envío en tiempo real vía socket lo maneja chat-socket.service.ts por separado. */
  sendMessage(conversationId: number, body: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.api}/chat/conversations/${conversationId}/messages`, { body });
  }

  /** Marca como leídos todos los mensajes de una conversación. */
  markAsRead(conversationId: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/chat/conversations/${conversationId}/read`, {});
  }

  /** Consulta el total de mensajes no leídos del usuario autenticado. */
  getUnreadCount(): Observable<UnreadCountDto> {
    return this.http.get<UnreadCountDto>(`${this.api}/chat/unread-count`);
  }

  /** Refresca el contador de no-leídos por HTTP y lo publica en unreadCount$ (fallback cuando no se puede confiar solo en eventos de socket, por ejemplo al cargar la app). */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (res) => this.setUnreadCount(res.count ?? 0),
      error: () => this.setUnreadCount(0),
    });
  }

  /** Publica un nuevo valor de contador de no-leídos, nunca negativo. */
  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, count || 0));
  }

  /** Bloquea una conversación (deja de recibir mensajes del otro lado). */
  blockConversation(conversationId: number, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.api}/chat/conversations/${conversationId}/block`, { reason });
  }

  /** Revierte el bloqueo de una conversación. */
  unblockConversation(conversationId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/chat/conversations/${conversationId}/block`);
  }
}
