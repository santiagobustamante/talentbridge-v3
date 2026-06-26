import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { JobsService } from './jobs.service';

@Controller('company/jobs')
export class CompanyJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get()
  async getCompanyJobs(@CurrentUser() user: { sub: number }, @Query('status') status?: string) {
    return this.jobsService.getCompanyJobs(user.sub, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get(':id')
  async getCompanyJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.getCompanyJob(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Post()
  async createJob(@CurrentUser() user: { sub: number }, @Body() dto: any) {
    return this.jobsService.createJob(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch(':id')
  async updateJob(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() dto: any) {
    return this.jobsService.updateJob(user.sub, +id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Delete(':id')
  async deleteJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.deleteJob(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch(':id/publish')
  async publishJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.publishJob(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch(':id/close')
  async closeJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.closeJob(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch(':id/archive')
  async archiveJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.archiveJob(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch(':id/restore')
  async restoreJob(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.restoreJob(user.sub, +id);
  }
}
