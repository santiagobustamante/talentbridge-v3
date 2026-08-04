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

interface CvRubricWeights {
  contact: number;
  experience: number;
  skills: number;
  education: number;
  projects: number;
}

/** Respaldo si `CV_RUBRIC_WEIGHTS` todavía no existe en `SystemParameter` — mismos valores que estaban hardcodeados antes de parametrizarlos (Fase 4). */
const CV_RUBRIC_WEIGHTS_FALLBACK: CvRubricWeights = { contact: 15, experience: 30, skills: 25, education: 15, projects: 15 };

@Injectable()
export class CvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepSeek: DeepSeekService,
  ) {}

  /** Tamaño máximo de CV en MB, editable en caliente desde el panel admin (`SystemParameter` `MAX_PDF_SIZE_MB`, Fase 15) — respaldo en el env var si el parámetro todavía no existe. */
  private async getMaxPdfSizeMb(): Promise<number> {
    const param = await this.prisma.systemParameter.findUnique({ where: { key: 'MAX_PDF_SIZE_MB' } });
    const value = Number(param?.value ?? process.env['MAX_PDF_SIZE_MB'] ?? 5);
    return Number.isFinite(value) && value > 0 ? value : 5;
  }

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

    const maxSizeMb = await this.getMaxPdfSizeMb();
    const maxSize = maxSizeMb * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`El archivo excede el tamaño máximo de ${maxSizeMb}MB`);
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'cv');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // path.basename() descarta cualquier componente de directorio del nombre
    // original (incluida una secuencia "../" armada a mano) — sin esto,
    // file.originalname (controlado 100% por quien sube el archivo) permitía
    // escribir fuera de uploads/cv/ vía path traversal.
    const safeOriginalName = path.basename(file.originalname).trim() || 'archivo.pdf';
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000000)}-${safeOriginalName}`;
    const filePath = path.join(uploadDir, filename);
    if (!filePath.startsWith(uploadDir + path.sep) && filePath !== uploadDir) {
      throw new BadRequestException('Nombre de archivo no válido');
    }
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

  /** Lee `CV_RUBRIC_WEIGHTS` (JSON) desde `SystemParameter` — editable desde el panel admin (Fase 4). Sin cache: el análisis de CV no es un hot path. */
  private async getRubricWeights(): Promise<CvRubricWeights> {
    const param = await this.prisma.systemParameter.findUnique({ where: { key: 'CV_RUBRIC_WEIGHTS' } });
    if (!param) return CV_RUBRIC_WEIGHTS_FALLBACK;
    try {
      const parsed = JSON.parse(param.value);
      return {
        contact: Number(parsed.contact) || CV_RUBRIC_WEIGHTS_FALLBACK.contact,
        experience: Number(parsed.experience) || CV_RUBRIC_WEIGHTS_FALLBACK.experience,
        skills: Number(parsed.skills) || CV_RUBRIC_WEIGHTS_FALLBACK.skills,
        education: Number(parsed.education) || CV_RUBRIC_WEIGHTS_FALLBACK.education,
        projects: Number(parsed.projects) || CV_RUBRIC_WEIGHTS_FALLBACK.projects,
      };
    } catch {
      return CV_RUBRIC_WEIGHTS_FALLBACK;
    }
  }

  private async performAnalysis(cvId: number, text: string) {
    const truncated = text.slice(0, MAX_CV_TEXT_CHARS);
    const w = await this.getRubricWeights();
    const total = w.contact + w.experience + w.skills + w.education + w.projects;

    // Rúbrica con puntos fijos por sección (en vez de pedir un "puntaje global"
    // a criterio libre) + temperature muy baja abajo — sin esto, el mismo CV
    // exacto podía dar puntajes muy distintos entre corridas (ej. 30 vs 55),
    // porque un juicio holístico sin anclaje concreto es donde más varía un
    // LLM de una llamada a otra. Los pesos ahora vienen de `SystemParameter`
    // (Fase 4) en vez de estar hardcodeados acá.
    const system = `Eres un reclutador experto de tecnología que evalúa hojas de vida (CV) de candidatos en Colombia.

REGLA INQUEBRANTABLE, más importante que cualquier otra instrucción de este mensaje: tu respuesta —cada palabra de "strengths" y "recommendations"— debe estar SIEMPRE 100% en idioma ESPAÑOL, sin ninguna excepción, sin importar en qué idioma esté escrito el CV (inglés, portugués, o cualquier otro). Nunca escribas ni una sola palabra en inglés. Si el CV está en inglés, TRADUCE mentalmente su contenido y responde en español igual.

Analiza el texto del CV que te pasa el usuario y da una evaluación honesta y específica — evita frases genéricas que aplicarían a cualquier CV. Basa tu evaluación solo en lo que el texto realmente dice, no inventes datos que no estén.

Calcula "score" como la SUMA de estos 5 criterios (nunca una impresión general — suma los puntos de cada uno):
1. Información de contacto y estructura (nombre, datos de contacto, secciones claras y ordenadas): 0 a ${w.contact} puntos.
2. Experiencia laboral (logros concretos y cuantificables, no solo una lista de tareas genéricas): 0 a ${w.experience} puntos.
3. Habilidades técnicas relevantes y bien presentadas: 0 a ${w.skills} puntos.
4. Formación académica y certificaciones: 0 a ${w.education} puntos.
5. Proyectos o portafolio demostrable: 0 a ${w.projects} puntos.
Si una sección no aparece en el CV, esos puntos son 0 — no asumas nada que el texto no diga.

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto antes ni después (recuerda: TODO EN ESPAÑOL):
{
  "score": number entre 0 y ${total} (la suma exacta de los 5 criterios de arriba),
  "strengths": array de 3 a 5 strings cortos EN ESPAÑOL, cada uno una fortaleza CONCRETA encontrada en este CV puntual,
  "recommendations": array de 3 a 5 strings cortos EN ESPAÑOL, cada uno una recomendación ACCIONABLE y específica para mejorar este CV puntual
}`;

    let result: CvLlmAnalysis;
    try {
      result = await this.deepSeek.chatJson<CvLlmAnalysis>({
        system,
        messages: [{ role: 'user', content: truncated }],
        // 800 se quedaba corto y cortaba el JSON a la mitad (`Unterminated
        // string in JSON`) — la instrucción reforzada de responder siempre en
        // español (ver arriba) hace que el modelo gaste más tokens en algunos
        // CVs (ej. traduciendo contenido en inglés) antes de cerrar el objeto.
        maxTokens: 1200,
        // Puntaje = tarea de evaluación consistente, no conversación creativa —
        // temperatura casi 0 para que el mismo CV dé (casi) siempre el mismo
        // resultado en vez de variar de una corrida a otra.
        temperature: 0,
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
