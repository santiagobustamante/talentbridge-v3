import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, NotificationType } from '@app/database';

/**
 * Notificaciones in-app. `create()` la usan otros services de esta misma app
 * (ApplicationsService, en los dos eventos reales que ya existían: alguien se
 * postula, alguien cambia el estado de una postulación) y jobs-service la
 * llama vía HTTP interno para las alertas de vacante-que-matchea. El resto
 * de métodos los consume NotificationsController para la campanita del navbar.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, type: NotificationType, title: string, body: string, link?: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, link },
    });
  }

  async list(userId: number, params?: { page?: string; limit?: string }) {
    const page = Math.max(1, parseInt(params?.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(params?.limit || '20', 10) || 20));

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notification.count({ where: { userId, read: false } });
    return { count };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) throw new NotFoundException('Notificación no encontrada');

    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { message: 'Notificaciones marcadas como leídas' };
  }
}
