import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { ProjectsService } from './projects.service';
import { ProjectDto } from './dto/project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProjects(@CurrentUser() user: { sub: number }) {
    return this.projectsService.getProjects(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addProject(@CurrentUser() user: { sub: number }, @Body() dto: ProjectDto) {
    return this.projectsService.addProject(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateProject(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() dto: ProjectDto) {
    return this.projectsService.updateProject(user.sub, +id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removeProject(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.projectsService.removeProject(user.sub, +id);
  }
}
