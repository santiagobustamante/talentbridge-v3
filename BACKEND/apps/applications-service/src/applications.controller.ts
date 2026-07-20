import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { ApplicationsService } from './applications.service';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

/**
 * Controller HTTP del microservicio de Postulaciones. Expone los endpoints
 * que consume el frontend tanto para el flujo del candidato (postularse,
 * ver sus postulaciones) como para el de la empresa (ver quiénes se
 * postularon a una oferta propia y cambiar el estado de una postulación).
 * Todas las rutas requieren estar autenticado (JwtAuthGuard); las de empresa
 * además exigen el rol COMPANY (RolesGuard + @Roles).
 */
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * POST /api/jobs/:id/apply — candidato autenticado se postula a una oferta.
   * Requiere sesión válida (cualquier rol pasa el guard, pero el service
   * valida internamente reglas de negocio como perfil completo y match mínimo).
   */
  @UseGuards(JwtAuthGuard)
  @Post('jobs/:id/apply')
  async apply(@CurrentUser() user: { sub: number }, @Param('id') jobId: string, @Body() body: ApplyDto) {
    return this.applicationsService.apply(user.sub, +jobId, body.coverMessage);
  }

  /**
   * GET /api/jobs/my-applications — lista paginada y filtrable de las
   * postulaciones del candidato autenticado (por estado y rango de fechas).
   */
  @UseGuards(JwtAuthGuard)
  @Get('jobs/my-applications')
  async getMyApplications(
    @CurrentUser() user: { sub: number },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.applicationsService.getMyApplications(user.sub, { page, limit, status, fromDate, toDate });
  }

  /**
   * GET /api/company/jobs/:id/applications — lista de candidatos que se
   * postularon a una oferta de la empresa autenticada. Requiere rol COMPANY;
   * el service además valida que la oferta le pertenezca a esa empresa.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Get('company/jobs/:id/applications')
  async getJobApplications(@CurrentUser() user: { sub: number }, @Param('id') jobId: string) {
    return this.applicationsService.getJobApplications(user.sub, +jobId);
  }

  /**
   * PATCH /api/company/applications/:id/status — la empresa cambia el estado
   * de una postulación recibida (ej. PENDING → ACCEPTED/REJECTED). Requiere
   * rol COMPANY; el service valida que la oferta asociada le pertenezca.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @Patch('company/applications/:id/status')
  async updateStatus(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() body: UpdateApplicationStatusDto) {
    return this.applicationsService.updateStatus(user.sub, +id, body.status);
  }
}
