import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ConversationDto, MessageDto, MessagesResponse, UnreadCountDto } from '../models/chat.models';
import { ChatSocketService } from './chat-socket.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = 'http://localhost:3000/api';

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

  getConversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(`${this.api}/chat/conversations`);
  }

  createConversation(candidateId: number): Observable<ConversationDto> {
    return this.http.post<ConversationDto>(`${this.api}/chat/conversations`, { candidateId });
  }

  getConversation(id: number): Observable<ConversationDto> {
    return this.http.get<ConversationDto>(`${this.api}/chat/conversations/${id}`);
  }

  getMessages(conversationId: number, page = 1, limit = 30): Observable<MessagesResponse> {
    return this.http.get<MessagesResponse>(`${this.api}/chat/conversations/${conversationId}/messages`, { params: { page, limit } });
  }

  sendMessage(conversationId: number, body: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.api}/chat/conversations/${conversationId}/messages`, { body });
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/chat/conversations/${conversationId}/read`, {});
  }

  getUnreadCount(): Observable<UnreadCountDto> {
    return this.http.get<UnreadCountDto>(`${this.api}/chat/unread-count`);
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (res) => this.setUnreadCount(res.count ?? 0),
      error: () => this.setUnreadCount(0),
    });
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, count || 0));
  }

  blockConversation(conversationId: number, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.api}/chat/conversations/${conversationId}/block`, { reason });
  }

  unblockConversation(conversationId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/chat/conversations/${conversationId}/block`);
  }
}
