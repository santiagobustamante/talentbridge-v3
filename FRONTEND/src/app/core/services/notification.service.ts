import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NotificationType = 'NEW_APPLICATION' | 'APPLICATION_STATUS_CHANGED' | 'JOB_MATCH';

export interface AppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Notificaciones in-app (campanita del navbar): nueva postulación recibida,
 * cambio de estado de una postulación propia, y alertas de vacantes que
 * matchean el perfil. El backend vive en `applications-service`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(page = 1, limit = 20): Observable<PaginatedNotifications> {
    return this.http.get<PaginatedNotifications>(`${this.api}/notifications`, { params: { page, limit } });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/notifications/unread-count`);
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.api}/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.api}/notifications/read-all`, {});
  }
}
