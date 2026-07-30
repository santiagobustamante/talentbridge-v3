import { Component, HostListener, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  subtitle?: string;
}

/**
 * Shell/layout del panel de administración ("/admin/*"). Mismo patrón
 * estructural que `app-shell`/`company-shell` (sidebar + topbar + drawer
 * mobile) — reusa directamente `company-shell.component.scss` porque es
 * puramente estructural (grid/sidebar/topbar), sin nada específico de
 * empresa. Sin asistente Joaquín ni banner de verificación de correo: son
 * funciones de candidato/empresa que no aplican a este rol.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './admin-shell.component.html',
  styleUrl: '../company/company-shell.component.scss',
})
export class AdminShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  mobileOpen = signal(false);
  currentRoute = signal('');

  private routerSub: Subscription | null = null;

  readonly navItems: NavItem[] = [
    { label: 'Panel de control', subtitle: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
    { label: 'Parámetros del sistema', subtitle: 'Parámetros', icon: 'tune', route: '/admin/parameters' },
    { label: 'Catálogos de opciones', subtitle: 'Catálogos', icon: 'list_alt', route: '/admin/catalogs' },
    { label: 'Usuarios y empresas', subtitle: 'Usuarios', icon: 'group', route: '/admin/users' },
    { label: 'Registro de cambios', subtitle: 'Auditoría', icon: 'history', route: '/admin/audit-log' },
  ];

  constructor() {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentRoute.set(e.urlAfterRedirects));
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
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
    return this.auth.currentUser()?.email || 'Admin';
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
