import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, finalize } from 'rxjs';
import { ChatService } from '../../core/services/chat.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import type { ConversationDto, MessageDto } from '../../core/models/chat.models';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatSnackBarModule, EmptyStateComponent, AppDatePipe],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private chatSocket = inject(ChatSocketService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  isCandidate = this.auth.isCandidate();
  isCompany = this.auth.isCompany();

  conversations = signal<ConversationDto[]>([]);
  activeConversation = signal<ConversationDto | null>(null);
  messages = signal<MessageDto[]>([]);
  loadingConversations = signal(true);
  loadingMessages = signal(false);
  inputMessage = '';
  sending = signal(false);
  currentUserId: number | null = null;

  unblockLoading = false;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.currentUserId = this.auth.currentUser()?.id ?? null;
    this.chatSocket.connect();
    this.loadConversations();

    this.subs.push(
      this.chatSocket.message$.subscribe((msg) => {
        const active = this.activeConversation();
        if (active && msg.conversationId === active.id) {
          this.appendMessage(msg);
          if (msg.senderId !== this.currentUserId) {
            this.chatService.markAsRead(active.id).subscribe(() => {
              this.chatService.refreshUnreadCount();
            });
            this.chatSocket.markAsRead(active.id);
          }
          setTimeout(() => this.scrollToBottom(), 50);
        }
        this.chatService.refreshUnreadCount();
        this.loadConversations();
      }),
    );

    this.route.queryParams.subscribe((params) => {
      const cid = parseInt(params['conversationId'], 10);
      if (cid) {
        this.openConversation(cid);
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /**
   * El mensaje propio llega dos veces (respuesta REST optimista + eco por
   * WebSocket del mismo conversation:room) — sin este guard aparecía
   * duplicado/triplicado en pantalla aunque en la base solo hay una fila.
   */
  private appendMessage(msg: MessageDto): void {
    this.messages.update((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.loadingConversations.set(false);
      },
      error: () => this.loadingConversations.set(false),
    });
  }

  openConversation(id: number): void {
    const existing = this.conversations().find((c) => c.id === id);
    if (existing) {
      this.selectConversation(existing);
      return;
    }
    this.chatService.getConversation(id).subscribe({
      next: (conv) => this.selectConversation(conv),
    });
  }

  private selectConversation(conv: ConversationDto): void {
    this.activeConversation.set(conv);
    this.loadingMessages.set(true);
    this.messages.set([]);
    this.chatSocket.joinConversation(conv.id);

    this.chatService.getMessages(conv.id).pipe(
      finalize(() => this.loadingMessages.set(false)),
    ).subscribe({
      next: (res: any) => {
        const rawMessages = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.messages) ? res.messages
          : [];

        const sorted = rawMessages.map((m: any) => ({
          ...m,
          id: Number(m.id),
          conversationId: Number(m.conversationId),
          senderId: Number(m.senderId),
          isMine: m.senderId === this.currentUserId || m.isMine,
        })).sort((a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        this.messages.set(sorted);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'No se pudieron cargar los mensajes';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
      },
    });

    this.chatService.markAsRead(conv.id).subscribe(() => {
      this.chatService.refreshUnreadCount();
      this.loadConversations();
    });
    this.chatSocket.markAsRead(conv.id);
  }

  send(): void {
    const body = this.inputMessage.trim();
    if (!body || body.length > 2000 || this.sending()) return;

    const conv = this.activeConversation();
    if (!conv) return;

    this.sending.set(true);
    this.chatService.sendMessage(conv.id, body).subscribe({
      next: (msg) => {
        this.appendMessage(msg);
        this.inputMessage = '';
        this.sending.set(false);
        this.loadConversations();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        this.sending.set(false);
        const message = err?.error?.message || 'Error al enviar mensaje';
        this.snackBar.open(message, 'Cerrar', { duration: 3500 });
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  blockConversation(): void {
    const conv = this.activeConversation();
    if (!conv) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Bloquear conversación',
        message: '¿Estás seguro de que deseas bloquear esta conversación? No recibirás más mensajes de este usuario.',
        confirmLabel: 'Bloquear',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.confirmBlock();
    });
  }

  private confirmBlock(): void {
    const conv = this.activeConversation();
    if (!conv) return;
    this.chatService.blockConversation(conv.id).subscribe({
      next: () => {
        this.snackBar.open('Conversación bloqueada', 'Cerrar', { duration: 2000 });
        this.loadConversations();
        const updated = this.activeConversation();
        if (updated) {
          this.activeConversation.set({ ...updated, blockedByMe: true });
        }
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Error al bloquear', 'Cerrar', { duration: 3000 });
      },
    });
  }

  unblockConversation(): void {
    const conv = this.activeConversation();
    if (!conv) return;
    this.unblockLoading = true;
    this.chatService.unblockConversation(conv.id).subscribe({
      next: () => {
        this.unblockLoading = false;
        this.snackBar.open('Conversación desbloqueada', 'Cerrar', { duration: 2000 });
        this.loadConversations();
        const updated = this.activeConversation();
        if (updated) {
          this.activeConversation.set({ ...updated, blockedByMe: false });
        }
      },
      error: (err) => {
        this.unblockLoading = false;
        this.snackBar.open(err?.error?.message || 'Error al desbloquear', 'Cerrar', { duration: 3000 });
      },
    });
  }

  contactName(conv: ConversationDto): string {
    if (this.isCandidate) return conv.company?.companyName || 'Empresa no especificada';
    return conv.candidate?.fullName || 'Candidato';
  }

  contactLogo(conv: ConversationDto): string | undefined | null {
    if (this.isCandidate) return conv.company?.logoUrl;
    return undefined;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  contactTitle(conv: ConversationDto): string {
    if (this.isCandidate) return conv.company?.sector || '';
    return conv.candidate?.professionalTitle || '';
  }

  contactCity(conv: ConversationDto): string | null {
    if (this.isCandidate) return conv.company?.city || null;
    return conv.candidate?.city || null;
  }

  getBubbleSender(msg: MessageDto): 'me' | 'other' {
    return msg.senderId === this.currentUserId ? 'me' : 'other';
  }

  isBlocked(): boolean {
    return this.activeConversation()?.blockedByMe || this.activeConversation()?.blockedByOther || false;
  }

  private scrollToBottom(): void {
    const el = document.querySelector('.messages-body');
    if (el) el.scrollTop = el.scrollHeight;
  }
}
