import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { NotificationsService } from './notifications.service';

/**
 * Cubre las reglas de acceso de NotificationsService: un usuario nunca puede
 * leer/listar/marcar notificaciones de otro (todo se filtra por `userId`),
 * y `markRead` rechaza intentar marcar una notificación ajena.
 */
describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('list() pagina y filtra siempre por el userId del que consulta', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(0);

    await service.list(7, { page: '2', limit: '5' });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 }, skip: 5, take: 5 }),
    );
  });

  it('unreadCount() cuenta solo las no leídas del usuario', async () => {
    prisma.notification.count.mockResolvedValue(3);

    const result = await service.unreadCount(7);

    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 7, read: false } });
    expect(result).toEqual({ count: 3 });
  });

  it('markRead() rechaza con 404 si la notificación no existe', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);

    await expect(service.markRead(7, 999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('markRead() rechaza con 404 si la notificación es de otro usuario (no filtra por where, valida en código)', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 999, read: false });

    await expect(service.markRead(7, 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('markRead() marca como leída cuando la notificación sí es del usuario', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 1, userId: 7, read: false });
    prisma.notification.update.mockResolvedValue({ id: 1, userId: 7, read: true });

    await service.markRead(7, 1);

    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { read: true } });
  });

  it('markAllRead() actualiza solo las no leídas del usuario', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });

    await service.markAllRead(7);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, read: false },
      data: { read: true },
    });
  });
});
