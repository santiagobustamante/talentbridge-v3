import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Sin RolesGuard, un usuario autenticado con el rol equivocado igual
  // recibía un 404 acá (el service no encuentra Profile/CompanyProfile
  // para su userId con el otro rol) — no había fuga de datos, pero era por
  // una coincidencia del modelo de datos, no por una autorización explícita.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  @Get('candidate')
  async getCandidateDashboard(@CurrentUser() user: { sub: number }) {
    return this.dashboardService.getCandidateDashboard(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('company')
  async getCompanyDashboard(@CurrentUser() user: { sub: number }) {
    return this.dashboardService.getCompanyDashboard(user.sub);
  }
}
