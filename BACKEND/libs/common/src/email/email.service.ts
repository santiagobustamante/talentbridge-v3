import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Cliente compartido de correo (Resend). Mismo patrón que `DeepSeekService`:
 * `CommonModule` es `@Global()` así que los 10 microservicios reciben este
 * provider, pero `RESEND_API_KEY` solo está configurada en `auth-service`
 * (único que envía correo hoy) — el cliente se crea perezosamente en el
 * primer uso real para que el resto arranque sin la variable sin crashear.
 *
 * `RESEND_FROM_EMAIL` por defecto usa el remitente de pruebas que Resend da
 * sin necesidad de verificar un dominio propio (`onboarding@resend.dev`) —
 * sirve para desarrollo/demo; un dominio propio verificado lo reemplaza sin
 * tocar código, solo la variable de entorno.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;
  private readonly from = process.env['RESEND_FROM_EMAIL'] || 'TalentBridge <onboarding@resend.dev>';

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(process.env['RESEND_API_KEY']);
    }
    return this.client;
  }

  async sendMail(params: SendMailParams): Promise<void> {
    const result = await this.getClient().emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (result.error) {
      this.logger.error(`Fallo el envío de correo a ${params.to}: ${result.error.message}`);
      throw new Error('No se pudo enviar el correo');
    }
  }
}
