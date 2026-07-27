import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

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
  private readonly model = process.env['DEEPSEEK_MODEL'] || 'deepseek-chat';

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
    const completion = await this.withRetry(() =>
      this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: params.system }, ...params.messages],
        response_format: { type: 'json_object' },
        max_tokens: params.maxTokens ?? 700,
        temperature: params.temperature ?? 0.4,
      }),
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek no devolvió contenido');
    }

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
    const completion = await this.withRetry(() =>
      this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: params.system }, ...params.messages],
        max_tokens: params.maxTokens ?? 700,
        temperature: params.temperature ?? 0.4,
      }),
    );

    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
