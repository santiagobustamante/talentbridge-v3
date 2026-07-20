import { Injectable, Logger } from '@nestjs/common';
import { Request, Response as ExpressResponse } from 'express';
import { Readable } from 'stream';

// Servicios en el plan free de Render "duermen" tras ~15 min sin tráfico y
// tardan hasta 25-30s en volver a arrancar. Mientras arrancan, la capa de
// borde de Render corta la conexión antes de que el contenedor responda y
// devuelve 502 — el propio servicio no está roto, solo no llegó a tiempo.
// REINTENTOS_MAX intentos adicionales, con espera creciente entre uno y
// otro, absorben ese arranque en vez de devolverle el error al usuario.
const REINTENTOS_MAX = 2;
const ESPERA_ENTRE_REINTENTOS_MS = 4000;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  proxy(req: Request, res: ExpressResponse, targetBase: string) {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetUrl = `${targetBase}${req.path}${queryString}`;
    const method = req.method.toUpperCase();

    const headers: Record<string, string> = {};

    if (req.headers['cookie']) {
      headers['Cookie'] = req.headers['cookie'] as string;
    }

    if (req.headers['authorization']) {
      headers['Authorization'] = req.headers['authorization'] as string;
    }

    // Sin esto, todo el tráfico le llega a los servicios internos con la IP
    // del propio gateway (es un fetch() servidor-a-servidor) — cualquier
    // rate limiting por IP del lado del servicio destino (ver auth-service)
    // terminaría agrupando a todos los usuarios reales bajo un mismo balde.
    headers['X-Forwarded-For'] = (req.headers['x-forwarded-for'] as string) || req.ip || '';

    const contentType = (req.headers['content-type'] || '') as string;
    const isMultipart = contentType.includes('multipart/form-data');

    if (isMultipart) {
      // El body-parser de Nest/Express no consume multipart (eso lo hace multer,
      // que este gateway no usa), así que el stream crudo de la request sigue
      // disponible acá — se reenvía tal cual en vez de perderlo, junto con el
      // Content-Type original (incluye el boundary, imprescindible para que el
      // servicio destino pueda parsear el archivo).
      headers['Content-Type'] = contentType;
    } else if (['POST', 'PATCH', 'PUT'].includes(method)) {
      if (!contentType || contentType.includes('application/json')) {
        headers['Content-Type'] = 'application/json';
      }
    }

    let body: BodyInit | undefined;
    if (['POST', 'PATCH', 'PUT'].includes(method)) {
      if (isMultipart) {
        body = Readable.toWeb(req) as unknown as ReadableStream;
      } else if (req.body) {
        try {
          body = JSON.stringify(req.body);
        } catch {
          body = undefined;
        }
      }
    }

    this.logger.log(`Proxying ${method} ${targetUrl}`);

    // Reintentar solo GET: es lo único seguro de repetir sin riesgo de
    // duplicar un efecto (crear una postulación dos veces, etc.) si la
    // request original sí llegó a procesarse y solo se cortó la respuesta.
    const puedeReintentar = method === 'GET';

    this.fetchConReintentos(targetUrl, method, headers, body, isMultipart, puedeReintentar)
      .then(async (response) => {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          res.setHeader('Set-Cookie', setCookie);
        }

        const resContentType = response.headers.get('content-type') || '';

        if (resContentType.includes('application/json')) {
          const data = await response.json();
          res.status(response.status).json(data);
        } else {
          const data = await response.text();
          res.status(response.status).send(data);
        }
      })
      .catch((error: Error) => {
        this.logger.error(`Proxy error to ${targetUrl}: ${error.message}`);
        res.status(502).json({
          statusCode: 502,
          message: 'Error al comunicarse con el servicio interno',
        });
      });
  }

  /**
   * Igual que un `fetch()` normal, pero si `puedeReintentar` y la respuesta
   * viene en 502/503/504 (o la conexión falla directamente — mismo síntoma
   * de "el contenedor todavía no terminó de arrancar"), reintenta hasta
   * `REINTENTOS_MAX` veces más con espera entre uno y otro, en vez de
   * devolver el error en el primer intento.
   */
  private async fetchConReintentos(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    isMultipart: boolean,
    puedeReintentar: boolean,
  ): Promise<Response> {
    let ultimoError: unknown;

    for (let intento = 0; intento <= (puedeReintentar ? REINTENTOS_MAX : 0); intento++) {
      try {
        const response = await fetch(targetUrl, {
          method,
          headers,
          body,
          // Requerido por Node/undici cuando el body es un stream en vez de un
          // buffer/string ya completo (caso multipart de arriba).
          ...(isMultipart ? { duplex: 'half' as const } : {}),
        });

        const esErrorDeArranque = [502, 503, 504].includes(response.status);
        if (!esErrorDeArranque || intento === REINTENTOS_MAX) {
          return response;
        }

        this.logger.warn(`${response.status} de ${targetUrl} (probable cold start) — reintento ${intento + 1}/${REINTENTOS_MAX}`);
      } catch (error) {
        ultimoError = error;
        if (intento === REINTENTOS_MAX) throw error;
        this.logger.warn(`Fallo de red a ${targetUrl} (probable cold start) — reintento ${intento + 1}/${REINTENTOS_MAX}`);
      }

      await esperar(ESPERA_ENTRE_REINTENTOS_MS);
    }

    // No debería llegar acá (el loop siempre retorna o lanza antes), pero
    // TypeScript necesita un camino de salida explícito.
    throw ultimoError ?? new Error('fetchConReintentos: agotados los reintentos sin respuesta');
  }
}
