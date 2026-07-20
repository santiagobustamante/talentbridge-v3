import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { AnalyticsService } from './analytics.service';

/** GET /api/company/analytics — panel de analítica de la empresa autenticada. */
@Controller('company/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get()
  async getAnalytics(@CurrentUser() user: { sub: number }) {
    return this.analyticsService.getCompanyAnalytics(user.sub);
  }
}
