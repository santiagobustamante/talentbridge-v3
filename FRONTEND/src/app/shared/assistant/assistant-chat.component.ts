import { Component, ChangeDetectorRef, NgZone, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssistantService, AssistantResponse } from '../../core/services/assistant.service';
import { AuthService } from '../../core/auth/auth.service';

interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  actions?: { label: string; route: string }[];
  results?: any[];
}

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

  open = signal(false);
  loading = signal(false);
  inputMessage = '';
  messages: ChatMessage[] = [];

  get isCandidate(): boolean {
    return this.auth.isCandidate();
  }

  get isCompany(): boolean {
    return this.auth.isCompany();
  }

  ngOnInit() {
    this.zone.run(() => {
      this.showGreeting();
      this.cdr.detectChanges();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    if (this.open()) {
      this.zone.run(() => {
        this.open.set(false);
        this.cdr.detectChanges();
      });
    }
  }

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

  closePanel() {
    this.zone.run(() => {
      this.open.set(false);
      this.cdr.detectChanges();
    });
  }

  sendMessage(text?: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.zone.run(() => {
      const msg = (text || this.inputMessage).trim();
      if (!msg || this.loading()) return;

      this.messages = [...this.messages, { from: 'user' as const, text: msg }];
      this.inputMessage = '';
      this.loading.set(true);
      this.cdr.detectChanges();

      this.assistantService.sendMessage(msg).subscribe({
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

  navigate(route: string, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.router.navigateByUrl(route);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.sendMessage();
    }
  }

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

  private scrollToBottom() {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
