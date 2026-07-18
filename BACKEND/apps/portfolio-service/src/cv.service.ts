import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { DeepSeekService } from '@app/common';
import * as fs from 'fs';
import * as path from 'path';

/** Tope de caracteres del CV enviados al modelo — un CV real nunca se acerca a
 *  esto; existe para no pagar tokens de más si la extracción de PDF produce
 *  basura (ej. un PDF escaneado con OCR ruidoso). */
const MAX_CV_TEXT_CHARS = 8000;

interface CvLlmAnalysis {
  score: number;
  strengths: string[];
  recommendations: string[];
}

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepSeek: DeepSeekService,
  ) {}

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

    return this.performAnalysis(cvId, text);
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
    const truncated = text.slice(0, MAX_CV_TEXT_CHARS);

    const system = `Eres un reclutador experto de tecnología que evalúa hojas de vida (CV) de candidatos en Colombia. Analiza el texto del CV que te pasa el usuario y da una evaluación honesta y específica — evita frases genéricas que aplicarían a cualquier CV. Basate solo en lo que el texto realmente dice, no inventes datos que no estén.

Respondé ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto antes ni después:
{
  "score": number entre 0 y 100 (qué tan completo y bien presentado está el CV para procesos de selección técnica),
  "strengths": array de 3 a 5 strings cortos, cada uno una fortaleza CONCRETA encontrada en este CV puntual,
  "recommendations": array de 3 a 5 strings cortos, cada uno una recomendación ACCIONABLE y específica para mejorar este CV puntual
}`;

    let result: CvLlmAnalysis;
    try {
      result = await this.deepSeek.chatJson<CvLlmAnalysis>({
        system,
        messages: [{ role: 'user', content: truncated }],
        maxTokens: 800,
      });
    } catch (err) {
      this.logger.error(`Fallo el análisis de CV con DeepSeek: ${(err as Error).message}`);
      throw new BadRequestException('No se pudo analizar el CV en este momento. Intenta de nuevo en unos minutos.');
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
    const strengths = Array.isArray(result.strengths) ? result.strengths.filter((s) => typeof s === 'string') : [];
    const recommendations = Array.isArray(result.recommendations)
      ? result.recommendations.filter((s) => typeof s === 'string')
      : [];

    return this.prisma.cvAnalysis.create({
      data: { cvDocumentId: cvId, score, strengths, recommendations },
    });
  }
}
