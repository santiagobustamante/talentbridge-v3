import { Injectable, Logger } from '@nestjs/common';

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Cliente compartido de correo (Brevo, vía su API REST directa — no hace
 * falta el SDK completo para un solo endpoint). `CommonModule` es `@Global()`,
 * así que los 10 microservicios reciben este provider, pero `BREVO_API_KEY`
 * solo está configurada en `auth-service` (único que envía correo hoy) — no
 * hay cliente que crear perezosamente como con `DeepSeekService`/Resend
 * (antes usado acá), porque `fetch` no necesita inicialización.
 *
 * Se cambió de Resend a Brevo porque Resend, sin un dominio propio
 * verificado, solo permite enviar al correo con el que se creó la cuenta
 * (modo sandbox) — inutilizaba la verificación de correo bloqueante para
 * cualquier cuenta que no fuera la del dueño de la cuenta de Resend. Brevo
 * permite verificar un remitente individual (sin necesitar un dominio
 * propio) y enviar desde ahí a cualquier destinatario real. Ver
 * `docs/DECISIONS.md` para el detalle completo de este cambio.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getSender(): { name: string; email: string } {
    const raw = process.env['BREVO_FROM_EMAIL'] || 'TalentBridge <no-reply@talentbridge.local>';
    const match = raw.match(/^(.*?)\s*<(.+)>$/);
    return match ? { name: match[1].trim(), email: match[2].trim() } : { name: 'TalentBridge', email: raw.trim() };
  }

  async sendMail(params: SendMailParams): Promise<void> {
    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env['BREVO_API_KEY'] || '',
      },
      body: JSON.stringify({
        sender: this.getSender(),
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Fallo el envío de correo a ${params.to}: ${response.status} ${body}`);
      throw new Error('No se pudo enviar el correo');
    }
  }
}
