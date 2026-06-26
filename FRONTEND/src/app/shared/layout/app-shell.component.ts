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

interface NavItem {
  label: string;
  icon: string;
  route: string;
  subtitle?: string;
}

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
    { label: 'Inicio', icon: 'home', route: '/app/inicio' },
    { label: 'Perfil', icon: 'person', route: '/app/profile' },
    { label: 'Trabajos', icon: 'work', route: '/app/jobs' },
    { label: 'Mensajes', icon: 'chat', route: '/app/messages' },
    { label: 'Habilidades', icon: 'psychology', route: '/app/skills' },
    { label: 'Experiencia', icon: 'work_history', route: '/app/experience' },
    { label: 'Educación', icon: 'school', route: '/app/education' },
    { label: 'Proyectos', icon: 'code', route: '/app/projects' },
    { label: 'CV', icon: 'document_scanner', route: '/app/cv-analysis' },
    { label: 'Vista pública', icon: 'visibility', route: '/app/public-view' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentRoute.set(e.urlAfterRedirects));
  }

  ngOnInit(): void {
    this.chatSocket.connect();
    this.unreadSub = this.chatSocket.unreadCount$.subscribe((data) => {
      this.chatService.setUnreadCount(data.count ?? 0);
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
  }

  isActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }

  get userEmail(): string {
    return this.auth.currentUser()?.email || 'Usuario';
  }

  get userInitial(): string {
    return this.userEmail.charAt(0).toUpperCase();
  }

  get publicSlug(): string {
    return this.auth.currentUser()?.profile?.slug || '';
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) {
      this.mobileOpen.set(false);
    }
  }
}
