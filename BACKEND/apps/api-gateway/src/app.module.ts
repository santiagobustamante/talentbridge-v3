import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard, getDynamicRateLimit } from '@app/common';
import { AppController } from './app.controller';
import { GatewayController } from './gateway.controller';
import { HttpClient } from './http-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    // Es el punto de entrada real de toda la app (el frontend le pega a
    // este, no a los servicios directo) — 300 requests por minuto por IP
    // alcanza para uso normal (varias llamadas por carga de pantalla) pero
    // frena un abuso/flood real. Mismo patrón que auth-service (barrido
    // 2026-07-26, antes solo auth-service tenía algún límite). El límite
    // ahora es dinámico (`RATE_LIMIT_DEFAULT`, Fase 11) — editable desde el
    // panel admin sin redeploy, con cache de 30s (ver `getDynamicRateLimit`).
    ThrottlerModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: () => getDynamicRateLimit(prisma, 'RATE_LIMIT_DEFAULT', 300) }],
      }),
    }),
  ],
  controllers: [AppController, GatewayController],
  providers: [
    HttpClient,
    {
      provide: APP_GUARD,
      useClass: IpThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
