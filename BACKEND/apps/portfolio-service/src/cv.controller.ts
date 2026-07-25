import { Controller, Get, Post, UseGuards, UseInterceptors, UploadedFile, Delete, Param, ParseIntPipe } from '@nestjs/common';
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
  async getOne(@CurrentUser() user: { sub: number }, @Param('id', ParseIntPipe) id: number) {
    return this.cvService.getOne(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // Techo real a nivel de Multer — sin esto, un archivo por encima del
      // límite se buffereaba entero en memoria antes de que uploadCv() llegara
      // a rechazarlo por tamaño.
      limits: { fileSize: parseInt(process.env['MAX_PDF_SIZE_MB'] || '5', 10) * 1024 * 1024 },
    }),
  )
  async uploadCv(@CurrentUser() user: { sub: number }, @UploadedFile() file: Express.Multer.File) {
    return this.cvService.uploadCv(user.sub, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/analyze')
  async analyzeCv(@CurrentUser() user: { sub: number }, @Param('id', ParseIntPipe) id: number) {
    return this.cvService.analyzeCv(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/analyses')
  async getAnalyses(@CurrentUser() user: { sub: number }, @Param('id', ParseIntPipe) id: number) {
    return this.cvService.getAnalyses(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCv(@CurrentUser() user: { sub: number }, @Param('id', ParseIntPipe) id: number) {
    return this.cvService.deleteCv(user.sub, id);
  }
}
