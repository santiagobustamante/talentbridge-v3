import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { NotificationsService } from './notifications.service';

/**
 * Notificaciones in-app del usuario autenticado (candidato o empresa —
 * el `userId` es el mismo `User.id` para ambos roles). Todas las rutas
 * requieren sesión válida; no hay noción de "notificación de otro usuario"
 * expuesta acá, cada método filtra siempre por el usuario del token.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @CurrentUser() user: { sub: number },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.list(user.sub, { page, limit });
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: { sub: number }) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markRead(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  async markAllRead(@CurrentUser() user: { sub: number }) {
    return this.notificationsService.markAllRead(user.sub);
  }
}
