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
import { AssistantChatComponent } from '../../shared/assistant/assistant-chat.component';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  subtitle?: string;
}

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

  mobileOpen = signal(false);
  currentRoute = signal('');

  private unreadSub: Subscription | null = null;

  readonly navItems: NavItem[] = [
    { label: 'Panel de control', subtitle: 'Dashboard', icon: 'dashboard', route: '/company/dashboard' },
    { label: 'Información de la empresa', subtitle: 'Perfil', icon: 'business', route: '/company/profile' },
    { label: 'Descubrir talento', subtitle: 'Candidatos', icon: 'search', route: '/company/candidates' },
    { label: 'Ofertas', subtitle: 'Vacantes publicadas', icon: 'work', route: '/company/jobs' },
    { label: 'Mensajes', subtitle: 'Chat', icon: 'chat', route: '/company/messages' },
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

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 1024) {
      this.mobileOpen.set(false);
    }
  }
}
