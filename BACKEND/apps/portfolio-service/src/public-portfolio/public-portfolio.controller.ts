import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '@app/auth';
import { PublicPortfolioService } from './public-portfolio.service';

interface OptionalAuthRequest extends Request {
  user?: { sub: number; email: string; role?: string };
}

@Controller()
export class PublicPortfolioController {
  constructor(private readonly publicPortfolioService: PublicPortfolioService) {}

  /**
   * Ruta pública real (candidatos anónimos también la visitan) — por eso NO
   * usa el decorador @CurrentUser(), que lanza 401 si no hay sesión. Con
   * OptionalJwtAuthGuard, req.user puede ser undefined sin que eso sea un error.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('portfolio/:slug')
  async getPublicPortfolio(@Param('slug') slug: string, @Req() req: OptionalAuthRequest) {
    return this.publicPortfolioService.getBySlug(slug, req.user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('portfolio/preview/me')
  async previewMyPortfolio(@Req() req: OptionalAuthRequest) {
    const userId = req.user?.sub || 0;
    return this.publicPortfolioService.getPreview(userId);
  }
}
