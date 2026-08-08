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
      // Techo físico fijo a nivel de Multer (20MB) — sin esto, un archivo
      // arbitrariamente grande se buffereaba entero en memoria antes de que
      // uploadCv() llegara a rechazarlo por tamaño. No lee `MAX_PDF_SIZE_MB`
      // de `SystemParameter` acá porque este decorador se evalúa una sola vez
      // al cargar el módulo, no por request — el límite real y editable en
      // caliente (Fase 15) vive en `CvService.uploadCv()`. Este techo solo
      // existe para protección de memoria y debe quedar por encima del
      // `maxValue` que el panel admin permite para `MAX_PDF_SIZE_MB` (20),
      // si no, subir el parámetro por encima de este número no tendría efecto.
      limits: { fileSize: 20 * 1024 * 1024 },
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
