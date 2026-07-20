import { Component, OnInit, OnDestroy, HostListener, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AppDatePipe } from '../../pipes/app-date.pipe';

const POLL_INTERVAL_MS = 45000;

/**
 * Campanita de notificaciones del navbar (compartida entre el shell de
 * candidato y el de empresa — el backend ya filtra por usuario autenticado,
 * a este componente no le importa el rol). Sondea el contador de no leídas
 * cada 45s; la lista completa solo se pide al abrir el dropdown.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, MatIconModule, EmptyStateComponent, AppDatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  open = signal(false);
  unreadCount = signal(0);
  notifications = signal<AppNotification[]>([]);
  loading = signal(false);

  private pollSub?: Subscription;

  ngOnInit(): void {
    this.pollSub = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationService.unreadCount()),
      )
      .subscribe({
        next: (res) => this.unreadCount.set(res.count),
        error: () => {},
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  /** Cierra el dropdown si se hace clic fuera del componente. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      this.loadList();
    }
  }

  private loadList(): void {
    this.loading.set(true);
    this.notificationService.list(1, 15).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
      this.unreadCount.set(0);
    });
  }

  /** Ícono según el tipo de evento que generó la notificación. */
  typeIcon(type: AppNotification['type']): string {
    const map: Record<AppNotification['type'], string> = {
      NEW_APPLICATION: 'assignment_ind',
      APPLICATION_STATUS_CHANGED: 'sync',
      JOB_MATCH: 'work',
    };
    return map[type] || 'notifications';
  }

  /** Marca como leída (si no lo estaba), cierra el dropdown y navega al link asociado, si tiene. */
  openNotification(n: AppNotification): void {
    if (!n.read) {
      this.notificationService.markRead(n.id).subscribe();
      this.notifications.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      this.unreadCount.update((c) => Math.max(0, c - 1));
    }
    this.open.set(false);
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }
}
