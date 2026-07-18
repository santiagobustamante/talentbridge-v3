import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, CandidateDashboard, DashboardJob } from '../../core/services/dashboard.service';
import { ChatService } from '../../core/services/chat.service';
import { ProfileService } from '../../core/services/profile.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { BadgeComponent, BadgeTone } from '../../shared/components/badge/badge.component';
import { statusToTone } from '../../shared/components/badge/status-tone.util';
import { statusToLabel } from '../../shared/components/badge/status-label.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { formatAppDate } from '../../shared/utils/format-date.util';
import { formatNumberDisplay } from '../../shared/utils/normalize';
import { ProfileChecklistComponent, ProfileChecklistItem } from '../../shared/components/profile-checklist/profile-checklist.component';

@Component({
  selector: 'app-home-candidate',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ButtonDirective, BadgeComponent, EmptyStateComponent, AppDatePipe, ProfileChecklistComponent],
  templateUrl: './home-candidate.component.html',
  styleUrl: './home-candidate.component.scss',
})
export class HomeCandidateComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private chatService = inject(ChatService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  data: CandidateDashboard | null = null;
  loading = true;
  error = false;
  unreadMessagesCount = 0;
  checklistItems: ProfileChecklistItem[] = [];

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

    this.profileService.getProfile().subscribe({
      next: (p) => {
        this.checklistItems = [
          { label: 'Completa tu información básica', done: !!(p.fullName && p.professionalTitle), route: '/app/profile' },
          { label: 'Agrega al menos una habilidad', done: (p.skills?.length ?? 0) > 0, route: '/app/skills' },
          { label: 'Suma experiencia o educación', done: (p.experiences?.length ?? 0) > 0 || (p.educations?.length ?? 0) > 0, route: '/app/experience' },
          { label: 'Muestra un proyecto', done: (p.projects?.length ?? 0) > 0, route: '/app/projects' },
        ];
      },
      error: () => {},
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
    const minStr = min ? '$' + formatNumberDisplay(min) : '';
    const maxStr = max ? '$' + formatNumberDisplay(max) : '';
    if (min && max) return `${minStr} – ${maxStr} ${c}`;
    return `${minStr || maxStr} ${c}`;
  }

  statusLabel(s: string): string {
    return statusToLabel(s);
  }

  statusTone(s: string): BadgeTone {
    return statusToTone(s);
  }

  formatDate(job: DashboardJob): string {
    const date = job.publishedAt || job.createdAt;
    return formatAppDate(date, 'short');
  }

  contractTypeLabel(job: DashboardJob): string | null {
    if (job.contractType === 'Otro' && job.customContractType) return job.customContractType;
    return job.contractType || null;
  }

  workloadLabel(job: DashboardJob): string | null {
    if (job.workload === 'Otra' && job.customWorkload) return job.customWorkload;
    return job.workload || null;
  }
}
