import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Readable } from 'stream';

@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  proxy(req: Request, res: Response, targetBase: string) {
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

    fetch(targetUrl, {
      method,
      headers,
      body,
      // Requerido por Node/undici cuando el body es un stream en vez de un
      // buffer/string ya completo (caso multipart de arriba).
      ...(isMultipart ? { duplex: 'half' as const } : {}),
    })
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
}
