import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { SkillsService } from './skills.service';
import { SkillDto } from './dto/skill.dto';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSkills(@CurrentUser() user: { sub: number }) {
    return this.skillsService.getSkills(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addSkill(@CurrentUser() user: { sub: number }, @Body() dto: SkillDto) {
    return this.skillsService.addSkill(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateSkill(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() dto: SkillDto) {
    return this.skillsService.updateSkill(user.sub, +id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removeSkill(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.skillsService.removeSkill(user.sub, +id);
  }
}
