import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { AuditLogService } from './audit-log.service';

@Controller('admin/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditLogService.list({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Number(limit) || 20),
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  }

  @Get('entity-types')
  async listEntityTypes() {
    return this.auditLogService.listEntityTypes();
  }
}
