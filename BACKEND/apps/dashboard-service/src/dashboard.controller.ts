import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('candidate')
  async getCandidateDashboard(@CurrentUser() user: { sub: number }) {
    return this.dashboardService.getCandidateDashboard(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('company')
  async getCompanyDashboard(@CurrentUser() user: { sub: number }) {
    return this.dashboardService.getCompanyDashboard(user.sub);
  }
}
