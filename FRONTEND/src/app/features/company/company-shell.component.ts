import { Component, HostListener, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { CompanyService } from '../../core/services/company.service';
import { AssistantChatComponent } from '../../shared/assistant/assistant-chat.component';

/** Ítem del menú lateral de navegación de la empresa. */
interface NavItem {
  label: string;
  icon: string;
  route: string;
  subtitle?: string;
}

/**
 * Shell/layout del área autenticada de empresa ("/company/*"). Envuelve
 * todas las pantallas de empresa (dashboard, perfil, candidatos, ofertas,
 * mensajes) con el sidebar de navegación, el header con datos de la
 * empresa logueada, el toggle de menú mobile y el asistente de chat IA.
 * También mantiene el contador de mensajes no leídos actualizado vía socket.
 */
@Component({
  selector: 'app-company-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule, AssistantChatComponent],
  templateUrl: './company-shell.component.html',
  styleUrl: './company-shell.component.scss',
})
export class CompanyShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly companyService = inject(CompanyService);

  mobileOpen = signal(false);
  currentRoute = signal('');
  companyName = signal<string | null>(null);
  companyLogoUrl = signal<string | null>(null);

  private unreadSub: Subscription | null = null;

  readonly navItems: NavItem[] = [
    { label: 'Panel de control', subtitle: 'Dashboard', icon: 'dashboard', route: '/company/dashboard' },
    { label: 'Información de la empresa', subtitle: 'Perfil', icon: 'business', route: '/company/profile' },
    { label: 'Descubrir talento', subtitle: 'Candidatos', icon: 'search', route: '/company/candidates' },
    { label: 'Ofertas', subtitle: 'Vacantes publicadas', icon: 'work', route: '/company/jobs' },
    { label: 'Mensajes', subtitle: 'Chat', icon: 'chat', route: '/company/messages' },
  ];

  /** Mantiene `currentRoute` sincronizada con el router para resaltar el ítem de menú activo. */
  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentRoute.set(e.urlAfterRedirects));
  }

  /**
   * Conecta el socket de chat para recibir el contador de mensajes no
   * leídos en tiempo real (se refleja como badge en el ítem "Mensajes"
   * del menú) y carga el nombre/logo de la empresa para el header.
   */
  ngOnInit(): void {
    this.chatSocket.connect();
    this.unreadSub = this.chatSocket.unreadCount$.subscribe((data) => {
      this.chatService.setUnreadCount(data.count ?? 0);
    });
    this.companyService.getProfile().subscribe({
      next: (profile) => {
        this.companyName.set(profile.companyName || null);
        this.companyLogoUrl.set(profile.logoUrl || null);
      },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  /** Determina si una ruta del menú corresponde a la sección actual (para resaltarla). */
  isActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  /** Abre/cierra el menú lateral en vista mobile. */
  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  /** Cierra el menú mobile, típicamente al navegar a una sección. */
  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }

  get userEmail(): string {
    return this.auth.currentUser()?.email || 'Usuario';
  }

  /** Nombre a saludar en el header: el de la empresa si ya se cargó el perfil, o el email como respaldo. */
  get greetingName(): string {
    return this.companyName() || this.userEmail;
  }

  /** Inicial usada en el avatar cuando la empresa no tiene logo cargado. */
  get userInitial(): string {
    return this.greetingName.charAt(0).toUpperCase();
  }

  /** Cierra el menú mobile automáticamente al agrandar la ventana a tamaño desktop. */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) {
      this.mobileOpen.set(false);
    }
  }
}
