import { Controller, Get, Param, Patch, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard } from '@app/auth';
import { UserRole } from '@app/database';
import { getClientIp } from '@app/common';
import { ParametersService } from './parameters.service';
import { UpdateParameterDto } from './update-parameter.dto';

@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Get()
  async list() {
    return this.parametersService.list();
  }

  @Get(':key')
  async findByKey(@Param('key') key: string) {
    return this.parametersService.findByKey(key);
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateParameterDto,
    @CurrentUser() user: { sub: number },
    @Req() req: Request,
  ) {
    return this.parametersService.update(key, dto.value, user.sub, getClientIp(req));
  }
}
