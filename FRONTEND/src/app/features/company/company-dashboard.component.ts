import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, CompanyDashboard } from '../../core/services/dashboard.service';
import { ChatService } from '../../core/services/chat.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { statusToTone } from '../../shared/components/badge/status-tone.util';
import { statusToLabel } from '../../shared/components/badge/status-label.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * Dashboard principal de la empresa autenticada (ruta "/company/dashboard").
 * Muestra un resumen de la actividad: ofertas publicadas, postulaciones
 * recientes y su estado, y el contador de mensajes no leídos. También
 * refresca ese contador cada vez que la empresa vuelve a esta pantalla
 * (navegación interna), para que el badge de mensajes no quede desactualizado.
 */
@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ButtonDirective, BadgeComponent, EmptyStateComponent, AppDatePipe],
  styleUrl: './company-dashboard.component.scss',
  templateUrl: './company-dashboard.component.html',
})
export class CompanyDashboardComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  data = signal<CompanyDashboard | null>(null);
  loading = signal(true);
  error = signal(false);
  unreadMessagesCount = signal(0);

  private unreadSub: Subscription | null = null;
  private routerSub: Subscription | null = null;

  /**
   * Carga los datos del dashboard, se suscribe al contador global de
   * mensajes no leídos, y además escucha la navegación del router para
   * refrescar ese contador cada vez que se vuelve a entrar al dashboard
   * (por ejemplo, después de leer mensajes y volver atrás).
   */
  ngOnInit(): void {
    this.dashboardService.getCompanyDashboard().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });

    this.chatService.refreshUnreadCount();
    this.unreadSub = this.chatService.unreadCount$.subscribe((count) => {
      this.unreadMessagesCount.set(count);
    });

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        if ((e as NavigationEnd).urlAfterRedirects.startsWith('/company/dashboard')) {
          this.chatService.refreshUnreadCount();
        }
      });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  /** Nombre a mostrar de la empresa: el del dashboard, o el usuario del email como respaldo. */
  get companyName(): string {
    return this.data()?.companyName || this.auth.currentUser()?.email?.split('@')[0] || 'Empresa';
  }

  /** Iniciales (hasta 2) del nombre de la empresa, para el avatar cuando no hay logo. */
  get companyInitials(): string {
    const clean = this.companyName.trim();
    if (!clean) return 'E';
    return clean.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

  /** Traduce el estado interno de una postulación a una etiqueta legible en español. */
  statusLabel(s: string): string {
    return statusToLabel(s);
  }

  /** Mapea el estado de una postulación al tono de color del badge (ej. éxito, pendiente). */
  statusTone(s: string): BadgeTone {
    return statusToTone(s);
  }

  /** Chips de sugerencias rápidas de búsqueda de candidatos mostrados en el dashboard. */
  searchChips = [
    { label: 'desarrollador', q: 'desarrollador' },
    { label: 'ingeniero', q: 'ingeniero' },
    { label: 'administrativo', q: 'administrativo' },
    { label: 'contador', q: 'contador' },
    { label: 'diseñador', q: 'diseñador' },
    { label: 'marketing', q: 'marketing' },
    { label: 'soporte técnico', q: 'soporte' },
    { label: 'datos', q: 'datos' },
  ];
}
