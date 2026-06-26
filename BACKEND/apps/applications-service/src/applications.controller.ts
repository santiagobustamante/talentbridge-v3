import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { ApplicationsService } from './applications.service';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('jobs/:id/apply')
  async apply(@CurrentUser() user: { sub: number }, @Param('id') jobId: string, @Body() body: any) {
    return this.applicationsService.apply(user.sub, +jobId, body.coverMessage);
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs/my-applications')
  async getMyApplications(@CurrentUser() user: { sub: number }) {
    return this.applicationsService.getMyApplications(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('company/jobs/:id/applications')
  async getJobApplications(@CurrentUser() user: { sub: number }, @Param('id') jobId: string) {
    return this.applicationsService.getJobApplications(user.sub, +jobId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch('company/applications/:id/status')
  async updateStatus(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: any) {
    return this.applicationsService.updateStatus(user.sub, +id, body.status);
  }
}
