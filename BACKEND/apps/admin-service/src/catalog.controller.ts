import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { getClientIp } from '@app/common';
import { CatalogService } from './catalog.service';
import { CreateCatalogEntryDto, UpdateCatalogEntryDto } from './dto/catalog-entry.dto';

/**
 * CRUD de catálogos de opciones (tipos de contrato, modalidad, etc.) — cada
 * fila nunca se borra físicamente, solo se desactiva (`active: false`), para
 * no romper datos históricos que ya referencian un valor dado de baja.
 */
@Controller('admin/catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async listAll() {
    return this.catalogService.listAll();
  }

  @Get(':catalogKey')
  async listByKey(@Param('catalogKey') catalogKey: string) {
    return this.catalogService.listByKey(catalogKey);
  }

  @Post(':catalogKey')
  async create(
    @Param('catalogKey') catalogKey: string,
    @Body() dto: CreateCatalogEntryDto,
    @CurrentUser() user: { sub: number },
    @Req() req: Request,
  ) {
    return this.catalogService.create(catalogKey, dto, user.sub, getClientIp(req));
  }

  @Patch('entry/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogEntryDto,
    @CurrentUser() user: { sub: number },
    @Req() req: Request,
  ) {
    return this.catalogService.update(Number(id), dto, user.sub, getClientIp(req));
  }
}
