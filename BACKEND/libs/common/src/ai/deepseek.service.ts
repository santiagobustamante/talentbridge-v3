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
    const completion = await this.getClient().chat.completions.create({
      model: this.model,
      messages: [{ role: 'system', content: params.system }, ...params.messages],
      response_format: { type: 'json_object' },
      max_tokens: params.maxTokens ?? 700,
      temperature: params.temperature ?? 0.4,
    });

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
    const completion = await this.getClient().chat.completions.create({
      model: this.model,
      messages: [{ role: 'system', content: params.system }, ...params.messages],
      max_tokens: params.maxTokens ?? 700,
      temperature: params.temperature ?? 0.4,
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  }
}
