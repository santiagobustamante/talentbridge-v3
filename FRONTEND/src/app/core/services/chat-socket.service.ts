import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import type { MessageDto, UnreadCountDto } from '../models/chat.models';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/**
 * Wrapper de socket.io-client para el namespace `/chat` del chat-service.
 * Traduce los eventos crudos del socket (mensajes, "escribiendo...",
 * lecturas, contador de no-leídos) a Observables de RxJS (`Subject`) para
 * que el resto de la app no dependa directamente de la librería de sockets.
 * Se conecta con `withCredentials: true` (cookie de sesión) y también manda
 * el token de `AuthService.getToken()` en `auth.token` del handshake, como
 * respaldo para navegadores que bloquean la cookie cross-domain (mismo
 * motivo que el header Authorization en las peticiones HTTP normales).
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService implements OnDestroy {
  private socket: Socket | null = null;

  constructor(private auth: AuthService) {}

  private messageSubject = new Subject<MessageDto>();
  private typingSubject = new Subject<{ conversationId: number; userId: number; isTyping: boolean }>();
  private readSubject = new Subject<{ conversationId: number; readBy: number }>();
  private unreadCountSubject = new Subject<UnreadCountDto>();

  message$: Observable<MessageDto> = this.messageSubject.asObservable();
  typing$: Observable<{ conversationId: number; userId: number; isTyping: boolean }> = this.typingSubject.asObservable();
  read$: Observable<{ conversationId: number; readBy: number }> = this.readSubject.asObservable();
  unreadCount$: Observable<UnreadCountDto> = this.unreadCountSubject.asObservable();

  /** Abre la conexión WebSocket (si no hay una ya activa) y suscribe los listeners que reenvían cada evento del servidor a su Subject correspondiente. */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(`${environment.wsUrl}/chat`, {
      withCredentials: true,
      auth: { token: this.auth.getToken() },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('chat:message', (msg: MessageDto) => this.messageSubject.next(msg));
    this.socket.on('chat:typing', (data: any) => this.typingSubject.next(data));
    this.socket.on('chat:read', (data: any) => this.readSubject.next(data));
    this.socket.on('chat:unread-count', (data: UnreadCountDto) => this.unreadCountSubject.next(data));
  }

  /** Cierra la conexión del socket, si existe. */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Se une a la "room" de una conversación puntual, para empezar a recibir sus eventos en tiempo real. */
  joinConversation(conversationId: number): void {
    this.socket?.emit('chat:join', { conversationId });
  }

  /** Sale de la room de una conversación (deja de recibir sus eventos en tiempo real). */
  leaveConversation(conversationId: number): void {
    this.socket?.emit('chat:leave', { conversationId });
  }

  /** Envía un mensaje en tiempo real por socket (complementa, no reemplaza, la persistencia por HTTP en chat.service.ts). */
  sendMessage(conversationId: number, body: string): void {
    this.socket?.emit('chat:send', { conversationId, body });
  }

  /** Notifica al otro participante que el usuario está escribiendo (o dejó de hacerlo). */
  sendTyping(conversationId: number, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { conversationId, isTyping });
  }

  /** Notifica en tiempo real que los mensajes de una conversación fueron leídos. */
  markAsRead(conversationId: number): void {
    this.socket?.emit('chat:read', { conversationId });
  }

  /** Indica si el socket está actualmente conectado. */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Angular llama esto automáticamente al destruir el servicio; asegura que el socket no quede abierto colgado. */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
