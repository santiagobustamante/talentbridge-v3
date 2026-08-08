import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { getClientIp } from '@app/common';
import { ModerationService } from './moderation.service';
import { ResolveReportDto } from './resolve-report.dto';

/** Reportes de contenido (Fase 12) — ofertas laborales, mensajes de chat, usuarios. */
@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.list({
      status: status || undefined,
      targetType: targetType || undefined,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Number(limit) || 20),
    });
  }

  @Patch(':id')
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: { sub: number },
    @Req() req: Request,
  ) {
    return this.moderationService.resolve(id, dto.status, user.sub, getClientIp(req));
  }
}
