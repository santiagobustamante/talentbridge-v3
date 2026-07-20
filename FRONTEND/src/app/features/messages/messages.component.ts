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

/**
 * Bandeja de mensajería en tiempo real, compartida por candidatos y
 * empresas (`isCandidate`/`isCompany` determinan el rol actual). Muestra
 * la lista de conversaciones a la izquierda y el hilo de mensajes de la
 * conversación activa a la derecha; combina llamadas REST (historial,
 * marcar como leído) con WebSocket (`ChatSocketService`) para recibir
 * mensajes nuevos sin recargar la página.
 */
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

  /** Si el otro participante de la conversación activa está escribiendo ahora mismo. */
  otherTyping = signal(false);
  private typingClearTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopTypingTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastTypingSent = false;

  private subs: Subscription[] = [];

  /**
   * Conecta el socket de chat, carga la lista de conversaciones y se
   * suscribe a mensajes entrantes por WebSocket (actualizando el hilo
   * activo y el contador de no leídos en tiempo real). También escucha
   * el query param `conversationId` para abrir una conversación puntual
   * cuando se llega a esta pantalla desde un link externo (ej. desde el
   * perfil de un candidato/empresa o desde una notificación).
   */
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

    this.subs.push(
      this.chatSocket.typing$.subscribe((data) => {
        const active = this.activeConversation();
        if (!active || data.conversationId !== active.id || data.userId === this.currentUserId) return;

        this.otherTyping.set(data.isTyping);
        if (this.typingClearTimeout) clearTimeout(this.typingClearTimeout);
        if (data.isTyping) {
          // Respaldo por si nunca llega el "dejó de escribir" (ej. cerró la
          // pestaña a mitad de escribir) — el indicador no queda pegado.
          this.typingClearTimeout = setTimeout(() => this.otherTyping.set(false), 5000);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.typingClearTimeout) clearTimeout(this.typingClearTimeout);
    if (this.stopTypingTimeout) clearTimeout(this.stopTypingTimeout);
  }

  /**
   * Se dispara en cada tecla del composer. Avisa "estoy escribiendo" una
   * sola vez (no en cada tecla) y programa el aviso de "dejé de escribir"
   * 2 segundos después de la última tecla, para no spamear el socket.
   */
  onTyping(): void {
    const conv = this.activeConversation();
    if (!conv) return;

    if (!this.lastTypingSent) {
      this.chatSocket.sendTyping(conv.id, true);
      this.lastTypingSent = true;
    }

    if (this.stopTypingTimeout) clearTimeout(this.stopTypingTimeout);
    this.stopTypingTimeout = setTimeout(() => {
      this.chatSocket.sendTyping(conv.id, false);
      this.lastTypingSent = false;
    }, 2000);
  }

  /**
   * El mensaje propio llega dos veces (respuesta REST optimista + eco por
   * WebSocket del mismo conversation:room) — sin este guard aparecía
   * duplicado/triplicado en pantalla aunque en la base solo hay una fila.
   */
  private appendMessage(msg: MessageDto): void {
    this.messages.update((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }

  /** Recarga la lista de conversaciones del usuario actual desde el backend. */
  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.loadingConversations.set(false);
      },
      error: () => this.loadingConversations.set(false),
    });
  }

  /**
   * Abre una conversación por id. Si ya está en la lista cargada la
   * selecciona directo (evita un round-trip innecesario); si no, la pide
   * al backend primero (caso típico: se llega por query param desde afuera).
   */
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

  /**
   * Marca la conversación como activa, une el socket a su sala y trae el
   * historial de mensajes. El parseo normaliza distintos formatos posibles
   * de respuesta del backend (array plano, `{data: [...]}` o `{messages: [...]}`)
   * y castea los ids a number porque a veces llegan como string desde la API.
   * Además marca la conversación como leída, tanto por REST como por socket.
   */
  private selectConversation(conv: ConversationDto): void {
    this.activeConversation.set(conv);
    this.loadingMessages.set(true);
    this.messages.set([]);
    this.otherTyping.set(false);
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

  /** Envía el mensaje escrito en el input a la conversación activa, con límite de 2000 caracteres. */
  send(): void {
    const body = this.inputMessage.trim();
    if (!body || body.length > 2000 || this.sending()) return;

    const conv = this.activeConversation();
    if (!conv) return;

    if (this.stopTypingTimeout) clearTimeout(this.stopTypingTimeout);
    if (this.lastTypingSent) {
      this.chatSocket.sendTyping(conv.id, false);
      this.lastTypingSent = false;
    }

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

  /** Envía el mensaje con Enter, salvo que se mantenga Shift (para permitir saltos de línea). */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  /** Pide confirmación antes de bloquear al contacto de la conversación activa. */
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

  /** Ejecuta el bloqueo ya confirmado por el usuario y actualiza el estado local de la conversación. */
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

  /** Desbloquea al contacto de la conversación activa, permitiendo volver a recibir sus mensajes. */
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

  /** Nombre del "otro lado" de la conversación: la empresa si soy candidato, o el candidato si soy empresa. */
  contactName(conv: ConversationDto): string {
    if (this.isCandidate) return conv.company?.companyName || 'Empresa no especificada';
    return conv.candidate?.fullName || 'Candidato';
  }

  /** Logo del contacto (solo aplica cuando el usuario actual es candidato y el contacto es una empresa). */
  contactLogo(conv: ConversationDto): string | undefined | null {
    if (this.isCandidate) return conv.company?.logoUrl;
    return undefined;
  }

  /** Oculta la imagen del logo si falla la carga, en vez de mostrar el ícono roto del navegador. */
  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  /** Subtítulo del contacto en la lista: sector de la empresa, o título profesional del candidato. */
  contactTitle(conv: ConversationDto): string {
    if (this.isCandidate) return conv.company?.sector || '';
    return conv.candidate?.professionalTitle || '';
  }

  /** Ciudad del contacto, según el rol del usuario actual. */
  contactCity(conv: ConversationDto): string | null {
    if (this.isCandidate) return conv.company?.city || null;
    return conv.candidate?.city || null;
  }

  /** Determina si una burbuja de mensaje corresponde al usuario actual ("me") o al contacto ("other"), para alinearla en el hilo. */
  getBubbleSender(msg: MessageDto): 'me' | 'other' {
    return msg.senderId === this.currentUserId ? 'me' : 'other';
  }

  /** Indica si la conversación activa está bloqueada, ya sea porque yo bloqueé o porque me bloquearon. */
  isBlocked(): boolean {
    return this.activeConversation()?.blockedByMe || this.activeConversation()?.blockedByOther || false;
  }

  /** Baja el scroll del panel de mensajes hasta el final, para que el último mensaje siempre quede visible. */
  private scrollToBottom(): void {
    const el = document.querySelector('.messages-body');
    if (el) el.scrollTop = el.scrollHeight;
  }
}
