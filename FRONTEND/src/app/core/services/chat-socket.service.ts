import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import type { MessageDto, UnreadCountDto } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatSocketService implements OnDestroy {
  private socket: Socket | null = null;

  private messageSubject = new Subject<MessageDto>();
  private typingSubject = new Subject<{ conversationId: number; userId: number; isTyping: boolean }>();
  private readSubject = new Subject<{ conversationId: number; readBy: number }>();
  private unreadCountSubject = new Subject<UnreadCountDto>();

  message$: Observable<MessageDto> = this.messageSubject.asObservable();
  typing$: Observable<{ conversationId: number; userId: number; isTyping: boolean }> = this.typingSubject.asObservable();
  read$: Observable<{ conversationId: number; readBy: number }> = this.readSubject.asObservable();
  unreadCount$: Observable<UnreadCountDto> = this.unreadCountSubject.asObservable();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3008/chat', {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('chat:message', (msg: MessageDto) => this.messageSubject.next(msg));
    this.socket.on('chat:typing', (data: any) => this.typingSubject.next(data));
    this.socket.on('chat:read', (data: any) => this.readSubject.next(data));
    this.socket.on('chat:unread-count', (data: UnreadCountDto) => this.unreadCountSubject.next(data));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId: number): void {
    this.socket?.emit('chat:join', { conversationId });
  }

  leaveConversation(conversationId: number): void {
    this.socket?.emit('chat:leave', { conversationId });
  }

  sendMessage(conversationId: number, body: string): void {
    this.socket?.emit('chat:send', { conversationId, body });
  }

  sendTyping(conversationId: number, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { conversationId, isTyping });
  }

  markAsRead(conversationId: number): void {
    this.socket?.emit('chat:read', { conversationId });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
