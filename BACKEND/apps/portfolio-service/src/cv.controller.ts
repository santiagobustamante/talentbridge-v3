import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFile, Delete, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, CurrentUser } from '@app/auth';
import { Express } from 'express';
import { CvService } from './cv.service';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCvs(@CurrentUser() user: { sub: number }) {
    return this.cvService.getCvs(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.cvService.getOne(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCv(@CurrentUser() user: { sub: number }, @UploadedFile() file: Express.Multer.File) {
    return this.cvService.uploadCv(user.sub, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyze')
  async analyzeCv(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.cvService.analyzeCv(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/analyses')
  async getAnalyses(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.cvService.getAnalyses(user.sub, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCv(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.cvService.deleteCv(user.sub, +id);
  }
}
