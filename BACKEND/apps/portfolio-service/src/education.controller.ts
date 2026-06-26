import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { EducationService } from './education.service';
import { EducationDto } from './dto/education.dto';

@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getEducation(@CurrentUser() user: { sub: number }) {
    return this.educationService.getEducation(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addEducation(@CurrentUser() user: { sub: number }, @Body() dto: EducationDto) {
    return this.educationService.addEducation(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateEducation(@CurrentUser() user: { sub: number }, @Param('id') id: string, @Body() dto: EducationDto) {
    return this.educationService.updateEducation(user.sub, +id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removeEducation(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.educationService.removeEducation(user.sub, +id);
  }
}
