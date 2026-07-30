import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '@app/database';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Cliente compartido para DeepSeek. La API de DeepSeek es compatible con el
 * formato de OpenAI, así que se reutiliza ese SDK apuntado a otro `baseURL`
 * en vez de escribir un cliente HTTP propio.
 *
 * `CommonModule` es `@Global()`, así que Nest instancia este provider en
 * TODOS los microservicios al arrancar (no solo en los que llaman a
 * `chatJson`/`chatText`) — pero `DEEPSEEK_API_KEY` solo está configurada en
 * assistant-service/portfolio-service. Por eso el cliente de OpenAI se crea
 * perezosamente en el primer uso real, no en el constructor: así los otros
 * servicios pueden bootear sin la variable sin crashear.
 */
@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private client: OpenAI | null = null;
  private readonly envModel = process.env['DEEPSEEK_MODEL'] || 'deepseek-chat';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * El modelo de DeepSeek ahora es editable en caliente desde el panel admin
   * (`SystemParameter` key `DEEPSEEK_MODEL`, Fase 6) — antes quedaba fijo
   * desde el arranque del proceso (`process.env['DEEPSEEK_MODEL']`), así que
   * cambiarlo exigía redeploy. Se sigue leyendo el env var como respaldo si
   * el parámetro todavía no existe en la base.
   */
  private async getModel(): Promise<string> {
    const param = await this.prisma.systemParameter.findUnique({ where: { key: 'DEEPSEEK_MODEL' } });
    return param?.value || this.envModel;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env['DEEPSEEK_API_KEY'],
        baseURL: process.env['DEEPSEEK_BASE_URL'] || 'https://api.deepseek.com',
      });
    }
    return this.client;
  }

  /**
   * Reintenta una llamada transitoriamente fallida (timeout, 429, 5xx, hiccup
   * de red) hasta 3 veces con una pausa corta entre intentos. Sin esto, un
   * usuario podía ver "no se pudo analizar" (CV) o un error de Joaquín en el
   * primer intento simplemente porque la API de DeepSeek tardó o devolvió un
   * error transitorio — y funcionar perfecto al reintentar manualmente
   * segundos después. No reintenta errores de parseo de JSON (`chatJson`)
   * porque esos son deterministas: el mismo prompt+respuesta va a fallar
   * igual las veces que se reintente.
   */
  private async withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 700): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        this.logger.warn(`Intento ${attempt}/${attempts} de DeepSeek falló: ${(err as Error).message}`);
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw lastErr;
  }

  /**
   * Pide una respuesta en JSON estricto (`response_format: json_object`) — evita tener
   * que parsear texto libre y hace que la salida del modelo respete un shape fijo.
   * El prompt de sistema DEBE indicarle al modelo que responda solo con ese JSON.
   */
  async chatJson<T>(params: {
    system: string;
    messages: DeepSeekChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<T> {
    // El chequeo de "sin contenido" va DENTRO de withRetry (no después) — una
    // respuesta 200 con `content` vacío no lanza excepción en el SDK de
    // OpenAI, así que si este chequeo quedara afuera, ese caso puntual nunca
    // se reintentaba (solo se reintentaban timeouts/429/5xx reales), aunque
    // sea exactamente el mismo tipo de hiccup transitorio que sí cubre el
    // resto de `withRetry`.
    const model = await this.getModel();
    const content = await this.withRetry(async () => {
      const completion = await this.getClient().chat.completions.create({
        model,
        messages: [{ role: 'system', content: params.system }, ...params.messages],
        response_format: { type: 'json_object' },
        max_tokens: params.maxTokens ?? 700,
        temperature: params.temperature ?? 0.4,
      });
      const c = completion.choices[0]?.message?.content;
      if (!c) throw new Error('DeepSeek no devolvió contenido');
      return c;
    });

    try {
      return JSON.parse(content) as T;
    } catch (err) {
      this.logger.error(`Respuesta de DeepSeek no es JSON válido: ${content}`);
      throw err;
    }
  }

  /** Texto libre, sin forzar JSON — para casos donde no hace falta un shape estructurado. */
  async chatText(params: {
    system: string;
    messages: DeepSeekChatMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const model = await this.getModel();
    const completion = await this.withRetry(() =>
      this.getClient().chat.completions.create({
        model,
        messages: [{ role: 'system', content: params.system }, ...params.messages],
        max_tokens: params.maxTokens ?? 700,
        temperature: params.temperature ?? 0.4,
      }),
    );

    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
