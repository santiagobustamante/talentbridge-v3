import { Component, ChangeDetectorRef, NgZone, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssistantService, AssistantResponse, AssistantHistoryItem } from '../../core/services/assistant.service';
import { AuthService } from '../../core/auth/auth.service';

/** Un turno de la conversación con el asistente: quién lo dijo, el texto, y opcionalmente
 *  botones de acción (navegación sugerida) o resultados estructurados (ej. lista de candidatos/ofertas). */
interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  actions?: { label: string; route: string }[];
  results?: any[];
}

/**
 * Widget flotante del asistente conversacional "Joaquín" (impulsado por IA vía
 * `AssistantService`, backend `assistant-service`), embebido en `AppShellComponent`
 * y visible en toda el área autenticada. Se adapta al rol del usuario logueado:
 * para candidatos ofrece ayuda con el perfil/CV, para empresas ayuda a buscar
 * talento. No tiene `@Input`/`@Output` — toma el usuario actual de `AuthService`.
 */
@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './assistant-chat.component.html',
  styleUrl: './assistant-chat.component.scss',
})
export class AssistantChatComponent implements OnInit, AfterViewChecked {
  private assistantService = inject(AssistantService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  /** Si el panel de chat está expandido (true) o solo se ve el botón flotante (false). */
  open = signal(false);
  /** True mientras se espera la respuesta del backend, para deshabilitar el input y mostrar el indicador de "escribiendo". */
  loading = signal(false);
  inputMessage = '';
  messages: ChatMessage[] = [];

  /** True si el usuario logueado es un candidato (determina el saludo y el tono de las respuestas). */
  get isCandidate(): boolean {
    return this.auth.isCandidate();
  }

  /** True si el usuario logueado es una empresa. */
  get isCompany(): boolean {
    return this.auth.isCompany();
  }

  /** Al iniciar el componente, muestra el mensaje de bienvenida según el rol del usuario. */
  ngOnInit() {
    this.zone.run(() => {
      this.showGreeting();
      this.cdr.detectChanges();
    });
  }

  /** Tras cada actualización de la vista, hace scroll al final del historial (así el último mensaje siempre queda visible). */
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  /** Cierra el panel de chat al presionar Escape, para no bloquear la navegación por teclado del resto de la app. */
  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    if (this.open()) {
      this.zone.run(() => {
        this.open.set(false);
        this.cdr.detectChanges();
      });
    }
  }

  /** Abre o cierra el panel del chat (botón flotante). */
  toggle(event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.zone.run(() => {
      this.open.update((v) => !v);
      this.cdr.detectChanges();
    });
  }

  /** Cierra el panel del chat sin togglear (ej. desde un botón "X" dedicado). */
  closePanel() {
    this.zone.run(() => {
      this.open.set(false);
      this.cdr.detectChanges();
    });
  }

  /**
   * Envía el mensaje del usuario (o uno pasado por parámetro, ej. una sugerencia
   * clickeada) al backend del asistente junto con el historial reciente, y agrega
   * tanto el mensaje del usuario como la respuesta a la conversación en pantalla.
   * Ignora el envío si el input está vacío o ya hay una respuesta en curso.
   */
  sendMessage(text?: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.zone.run(() => {
      const msg = (text || this.inputMessage).trim();
      if (!msg || this.loading()) return;

      const history = this.buildHistory();
      this.messages = [...this.messages, { from: 'user' as const, text: msg }];
      this.inputMessage = '';
      this.loading.set(true);
      this.cdr.detectChanges();

      this.assistantService.sendMessage(msg, history).subscribe({
        next: (res: AssistantResponse) => {
          this.zone.run(() => {
            this.messages = [
              ...this.messages,
              {
                from: 'assistant' as const,
                text: res.reply || 'No recibí una respuesta válida.',
                actions: res.actions,
                results: res.results,
              },
            ];
            this.loading.set(false);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.messages = [
              ...this.messages,
              {
                from: 'assistant' as const,
                text: 'Lo siento, no pude procesar tu mensaje. Intenta nuevamente en unos momentos.',
              },
            ];
            this.loading.set(false);
            this.cdr.detectChanges();
          });
        },
      });
    });
  }

  /** Navega a la ruta sugerida por el asistente (botón de acción en la respuesta), ej. "Ir a Habilidades". */
  navigate(route: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigateByUrl(route);
  }

  /** Envía el mensaje con Enter; Shift+Enter se deja pasar para permitir un salto de línea en el textarea. */
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.sendMessage();
    }
  }

  /** Últimos turnos de la conversación en memoria, para que el backend le dé
   *  contexto al modelo — no se persiste nada, es solo lo que ya está en pantalla. */
  private buildHistory(): AssistantHistoryItem[] {
    return this.messages
      .filter((m) => m.text?.trim())
      .slice(-8)
      .map((m) => ({ role: m.from === 'user' ? ('user' as const) : ('assistant' as const), content: m.text }));
  }

  /** Muestra el mensaje inicial de "Joaquín" adaptado al rol (candidato o empresa) al abrir el chat por primera vez. */
  private showGreeting() {
    if (this.isCandidate) {
      this.messages = [
        {
          from: 'assistant' as const,
          text: 'Hola, soy Joaquín. Estoy aquí para ayudarte a mejorar tu perfil profesional, completar tu portafolio y orientarte con tu hoja de vida.',
          actions: [],
        },
      ];
    } else if (this.isCompany) {
      this.messages = [
        {
          from: 'assistant' as const,
          text: 'Hola, soy Joaquín. Puedo ayudarte a encontrar talento por profesión, habilidades o ciudad, y orientarte en el uso del buscador.',
          actions: [],
        },
      ];
    }
  }

  /** Fuerza el scroll del contenedor de mensajes hasta el final, si el ViewChild ya está disponible. */
  private scrollToBottom() {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
