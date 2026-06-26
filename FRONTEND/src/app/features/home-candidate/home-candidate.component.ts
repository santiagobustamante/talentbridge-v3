import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, CandidateDashboard } from '../../core/services/dashboard.service';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-home-candidate',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './home-candidate.component.html',
  styleUrl: './home-candidate.component.scss',
})
export class HomeCandidateComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  data: CandidateDashboard | null = null;
  loading = true;
  error = false;
  unreadMessagesCount = 0;

  private unreadSub: Subscription | null = null;
  private routerSub: Subscription | null = null;

  get userName(): string {
    const profile = this.auth.currentUser()?.profile;
    return profile?.fullName || this.auth.currentUser()?.email?.split('@')[0] || 'Usuario';
  }

  ngOnInit(): void {
    this.dashboardService.getCandidateDashboard().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.error = true; this.loading = false; },
    });

    this.chatService.refreshUnreadCount();
    this.unreadSub = this.chatService.unreadCount$.subscribe((count) => {
      this.unreadMessagesCount = count;
    });

    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        if ((e as NavigationEnd).urlAfterRedirects.startsWith('/app/inicio')) {
          this.chatService.refreshUnreadCount();
        }
      });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  formatSalary(min?: number, max?: number, currency?: string): string | null {
    if (!min && !max) return null;
    const c = currency || 'COP';
    const minStr = min ? '$' + min.toLocaleString() : '';
    const maxStr = max ? '$' + max.toLocaleString() : '';
    if (min && max) return `${minStr} – ${maxStr} ${c}`;
    return `${minStr || maxStr} ${c}`;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente', REVIEWED: 'Revisado', PRESELECTED: 'Preseleccionado',
      REJECTED: 'Rechazado', HIRED: 'Contratado',
    };
    return map[s] || s;
  }
}
