import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { CandidateSearchService } from './candidate-search.service';

@Controller('company')
export class CandidateSearchController {
  constructor(private readonly candidateSearchService: CandidateSearchService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('candidates/filter-options')
  async getFilterOptions() {
    return this.candidateSearchService.getFilterOptions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('candidates/search')
  async search(
    @CurrentUser() user: { sub: number },
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('profession') profession?: string,
    @Query('skills') skills?: string,
    @Query('skillMatch') mode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.candidateSearchService.search(user.sub, {
      q, city, profession, skills, mode,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('candidates/suggestions')
  async suggestions(@Query('q') q?: string) {
    return this.candidateSearchService.suggestions(q || '');
  }
}
