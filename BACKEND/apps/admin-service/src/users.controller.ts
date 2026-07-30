import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { getClientIp } from '@app/common';
import { UsersService } from './users.service';
import { SetSuspendedDto } from './dto/set-suspended.dto';

/** Gestión de usuarios/empresas: listar y suspender/reactivar cuentas (Fase 7). */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Query('role') role?: string, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.list({
      role: role || undefined,
      q: q || undefined,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Number(limit) || 20),
    });
  }

  @Patch(':id/suspend-state')
  async setSuspended(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSuspendedDto,
    @CurrentUser() user: { sub: number },
    @Req() req: Request,
  ) {
    return this.usersService.setSuspended(id, dto.suspended, user.sub, getClientIp(req));
  }
}
