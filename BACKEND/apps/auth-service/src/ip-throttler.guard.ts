import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * `ThrottlerGuard` estándar, pero identificando al cliente por la primera
 * IP de `X-Forwarded-For` en vez de confiar en `req.ip`/`trust proxy` de
 * Express. Todo el tráfico real llega acá vía el proxy del api-gateway
 * (`fetch()` servidor-a-servidor, que reenvía `X-Forwarded-For` con la IP
 * real del cliente — ver `http-client.service.ts`), y en el despliegue real
 * (Render) hay más de un proxy intermedio entre el navegador y este
 * servicio, así que la interacción `trust proxy: N` + `req.ip` de Express
 * no daba un resultado confiable (verificado en vivo: pegándole directo al
 * servicio el límite frenaba bien al décimo intento, pero a través del
 * gateway nunca frenaba — cada request se contaba con una key distinta).
 * Leer el header a mano evita depender de esa cadena de confianza.
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwarded = req['headers'] as Record<string, string | string[] | undefined> | undefined;
    const xff = forwarded?.['x-forwarded-for'];
    const first = Array.isArray(xff) ? xff[0] : xff?.split(',')[0]?.trim();
    return first || (req['ip'] as string) || 'unknown';
  }
}
