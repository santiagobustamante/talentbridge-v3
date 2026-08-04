import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { DashboardService } from './dashboard.service';

/** Panel de control (Fase 14) — métricas generales de solo lectura. */
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getStats() {
    return this.dashboardService.getStats();
  }
}
