import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { ExperiencesService } from './experiences.service';
import { ExperienceDto } from './dto/experience.dto';

@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getExperiences(@CurrentUser() user: { sub: number }) {
    return this.experiencesService.getExperiences(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addExperience(@CurrentUser() user: { sub: number }, @Body() dto: ExperienceDto) {
    return this.experiencesService.addExperience(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateExperience(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() dto: ExperienceDto) {
    return this.experiencesService.updateExperience(user.sub, +id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removeExperience(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.experiencesService.removeExperience(user.sub, +id);
  }
}
