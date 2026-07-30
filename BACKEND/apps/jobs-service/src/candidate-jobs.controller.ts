import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class CandidateJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getJobs(@CurrentUser() user: { sub: number }, @Query() query: any) {
    return this.jobsService.getCandidateJobs(user.sub, query);
  }

  // Declarada antes de ':id' — si no, ':id' (con ParseIntPipe) la interceptaría
  // primero y devolvería un 400 al no poder parsear "catalogs" como entero.
  @UseGuards(JwtAuthGuard)
  @Get('catalogs')
  async getCatalogs() {
    return this.jobsService.getJobCatalogs();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getJobById(@CurrentUser() user: { sub: number }, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getJobById(user.sub, id);
  }
}
