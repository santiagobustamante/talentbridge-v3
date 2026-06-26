import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, CompanyDashboard } from '../../core/services/dashboard.service';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
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

  get companyName(): string {
    return this.data()?.companyName || this.auth.currentUser()?.email?.split('@')[0] || 'Empresa';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador', PUBLISHED: 'Publicada', CLOSED: 'Cerrada', ARCHIVED: 'Archivada',
      PENDING: 'Pendiente', REVIEWED: 'Revisado', PRESELECTED: 'Preseleccionado',
      REJECTED: 'Rechazado', HIRED: 'Contratado',
    };
    return map[s] || s;
  }

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
