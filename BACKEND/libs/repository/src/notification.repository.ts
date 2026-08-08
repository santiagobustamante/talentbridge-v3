import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

/**
 * Acceso a datos del modelo `Notification` — arranca mínimo acá (Fase 4 del
 * patrón repositorio, primer consumidor: `JobsService.notifyMatchingCandidates`).
 */
@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: Prisma.NotificationCreateManyInput[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.notification.createMany({ data });
  }
}
