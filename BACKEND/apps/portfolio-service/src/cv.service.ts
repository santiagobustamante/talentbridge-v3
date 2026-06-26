import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  async getCvs(userId: number) {
    return this.prisma.cvDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      include: { analyses: true },
    });
  }

  async getOne(userId: number, cvId: number) {
    const cv = await this.prisma.cvDocument.findFirst({
      where: { id: cvId, userId },
      include: { analyses: true },
    });
    if (!cv) throw new NotFoundException('CV no encontrado');
    return cv;
  }

  async uploadCv(userId: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se proporcionó archivo');

    const maxSize = parseInt(process.env['MAX_PDF_SIZE_MB'] || '5', 10) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`El archivo excede el tamaño máximo de ${process.env['MAX_PDF_SIZE_MB'] || 5}MB`);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'cv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000000)}-${file.originalname}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const extractedText = await this.extractTextFromBuffer(file.buffer);

    return this.prisma.cvDocument.create({
      data: { userId, originalName: file.originalname, filePath, mimeType: file.mimetype, extractedText },
    });
  }

  async analyzeCv(userId: number, cvId: number) {
    const cv = await this.prisma.cvDocument.findFirst({
      where: { id: cvId, userId },
    });
    if (!cv) throw new NotFoundException('CV no encontrado');

    let text = cv.extractedText;

    if (!text && cv.filePath && fs.existsSync(cv.filePath)) {
      try {
        const buffer = fs.readFileSync(cv.filePath);
        text = await this.extractTextFromBuffer(buffer);
        if (text) {
          await this.prisma.cvDocument.update({
            where: { id: cvId },
            data: { extractedText: text },
          });
        }
      } catch {
        throw new BadRequestException('No se pudo leer el archivo PDF desde disco');
      }
    }

    if (!text || text.trim().length === 0) {
      throw new BadRequestException(
        'No se pudo extraer texto del PDF. Usa un PDF con texto seleccionable, no escaneado.',
      );
    }

    return this.performAnalysis(cvId, text.toLowerCase());
  }

  async getAnalyses(userId: number, cvId: number) {
    const cv = await this.prisma.cvDocument.findFirst({
      where: { id: cvId, userId },
    });
    if (!cv) throw new NotFoundException('CV no encontrado');

    return this.prisma.cvAnalysis.findMany({
      where: { cvDocumentId: cvId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteCv(userId: number, cvId: number) {
    const cv = await this.prisma.cvDocument.findFirst({
      where: { id: cvId, userId },
    });
    if (!cv) throw new NotFoundException('CV no encontrado');

    try { fs.unlinkSync(cv.filePath); } catch {}

    await this.prisma.cvDocument.delete({ where: { id: cvId } });
    return { message: 'CV eliminado' };
  }

  private async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const lib = require('pdf-parse');

      if (typeof lib.PDFParse === 'function') {
        const instance = new lib.PDFParse(new Uint8Array(buffer));
        await instance.load();
        const result = await instance.getText();
        instance.destroy();
        return result?.text?.trim() || '';
      }

      const result = await lib(buffer);
      return result?.text?.trim() || '';
    } catch {
      return '';
    }
  }

  private async performAnalysis(cvId: number, text: string) {
    const strengths: string[] = [];
    const recommendations: string[] = [];

    const keywords = ['javascript', 'typescript', 'python', 'java', 'react', 'angular', 'node', 'sql', 'docker', 'git', 'aws', 'azure', 'nestjs', 'postgresql', 'html', 'css'];
    let keywordMatches = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) keywordMatches++;
    }

    const experienceMatch = text.match(/(\d+)\s*(años|years)/);
    if (experienceMatch) {
      strengths.push(`Experiencia de ${experienceMatch[1]} años detectada`);
    } else {
      recommendations.push('Añade años de experiencia claramente en tu CV');
    }

    if (text.includes('educación') || text.includes('education') || text.includes('universidad') || text.includes('university')) {
      strengths.push('Formación académica identificada');
    }

    if (keywordMatches >= 5) {
      strengths.push(`Se detectaron ${keywordMatches} palabras clave relevantes`);
    } else {
      recommendations.push('Incluye más palabras clave técnicas relevantes a tu profesión');
    }

    if (text.length < 500) {
      recommendations.push('Tu CV parece muy corto. Considera añadir más detalle sobre tu experiencia');
    }

    const score = Math.min(100, Math.round(
      (keywordMatches / keywords.length) * 40 +
      (experienceMatch ? 30 : 0) +
      (text.length > 1000 ? 20 : text.length > 500 ? 10 : 0) +
      (text.includes('educación') || text.includes('education') ? 10 : 0)
    ));

    return this.prisma.cvAnalysis.create({
      data: { cvDocumentId: cvId, score, strengths, recommendations },
    });
  }
}
