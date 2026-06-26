import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard, CurrentUser } from '@app/auth';
import { PublicPortfolioService } from './public-portfolio.service';

@Controller()
export class PublicPortfolioController {
  constructor(private readonly publicPortfolioService: PublicPortfolioService) {}

  @Get('portfolio/:slug')
  async getPublicPortfolio(@Param('slug') slug: string) {
    return this.publicPortfolioService.getBySlug(slug);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('portfolio/preview/me')
  async previewMyPortfolio(@CurrentUser() user?: { sub: number }) {
    const userId = user?.sub || 0;
    return this.publicPortfolioService.getPreview(userId);
  }
}
