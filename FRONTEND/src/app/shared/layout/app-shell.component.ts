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
import { AssistantChatComponent } from '../assistant/assistant-chat.component';

/** Un ítem del menú de navegación lateral (label largo + subtítulo corto, ícono e ruta destino). */
interface NavItem {
  label: string;
  icon: string;
  route: string;
  subtitle?: string;
}

/**
 * Layout raíz del área autenticada del candidato (`/app/*`): sidebar de navegación,
 * cabecera con datos del usuario logueado, botón de logout, y el widget flotante
 * del asistente (Joaquín, `AssistantChatComponent`). Envuelve el contenido de cada
 * pantalla vía `<router-outlet>` (definido en el template). También mantiene el
 * contador de mensajes no leídos vivo mediante el socket de chat, y colapsa el
 * menú a un drawer en mobile.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    AssistantChatComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly chatService = inject(ChatService);
  private readonly chatSocket = inject(ChatSocketService);

  mobileOpen = signal(false);
  currentRoute = signal('');

  private unreadSub: Subscription | null = null;

  readonly navItems: NavItem[] = [
    { label: 'Tu centro profesional', subtitle: 'Inicio', icon: 'home', route: '/app/inicio' },
    { label: 'Tu información pública', subtitle: 'Perfil', icon: 'person', route: '/app/profile' },
    { label: 'Explora oportunidades', subtitle: 'Trabajos', icon: 'work', route: '/app/jobs' },
    { label: 'Habla con empresas', subtitle: 'Mensajes', icon: 'chat', route: '/app/messages' },
    { label: 'Tu mapa de competencias', subtitle: 'Habilidades', icon: 'psychology', route: '/app/skills' },
    { label: 'Tu trayectoria laboral', subtitle: 'Experiencia', icon: 'work_history', route: '/app/experience' },
    { label: 'Tu formación académica', subtitle: 'Educación', icon: 'school', route: '/app/education' },
    { label: 'Lo que has construido', subtitle: 'Proyectos', icon: 'code', route: '/app/projects' },
    { label: 'Análisis inteligente', subtitle: 'CV', icon: 'document_scanner', route: '/app/cv-analysis' },
    { label: 'Así te ven las empresas', subtitle: 'Vista pública', icon: 'visibility', route: '/app/public-view' },
  ];

  constructor() {
    // Escucha la navegación para saber qué ítem del menú resaltar como activo (ver `isActive`).
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentRoute.set(e.urlAfterRedirects));
  }

  /** Al montar el shell, conecta el socket de chat y sincroniza el contador de mensajes no leídos (badge en el menú). */
  ngOnInit(): void {
    this.chatSocket.connect();
    this.unreadSub = this.chatSocket.unreadCount$.subscribe((data) => {
      this.chatService.setUnreadCount(data.count ?? 0);
    });
  }

  /** Libera la suscripción al contador de no leídos al destruir el shell, para evitar fugas de memoria. */
  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  /** True si la ruta actual pertenece a esa sección del menú (usa `startsWith` para incluir sub-rutas). */
  isActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  /** Abre/cierra el drawer de navegación en mobile. */
  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  /** Cierra el drawer de navegación en mobile (ej. tras elegir una opción del menú). */
  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  /** Cierra la sesión del usuario mediante `AuthService` (invalida token/redirige a login). */
  logout(): void {
    this.auth.logout().subscribe();
  }

  /** Email del usuario logueado, o 'Usuario' si por algún motivo no hay sesión resuelta todavía. */
  get userEmail(): string {
    return this.auth.currentUser()?.email || 'Usuario';
  }

  /** Nombre a mostrar en el saludo de la cabecera: nombre completo del perfil, o el email si aún no lo completó. */
  get greetingName(): string {
    return this.auth.currentUser()?.profile?.fullName || this.userEmail;
  }

  /** Inicial usada en el avatar circular de la cabecera. */
  get userInitial(): string {
    return this.greetingName.charAt(0).toUpperCase();
  }

  /** Slug del portafolio público del candidato, usado para armar el link "Ver mi portafolio". */
  get publicSlug(): string {
    return this.auth.currentUser()?.profile?.slug || '';
  }

  /** Cierra el drawer mobile automáticamente si la ventana se agranda a tamaño desktop (evita quedar abierto tras un resize). */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) {
      this.mobileOpen.set(false);
    }
  }
}
