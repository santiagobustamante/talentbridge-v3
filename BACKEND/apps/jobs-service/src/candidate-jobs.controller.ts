import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getJobById(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.jobsService.getJobById(user.sub, +id);
  }
}
