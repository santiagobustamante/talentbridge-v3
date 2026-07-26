import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard } from '@app/common';
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
    // 2026-07-26, antes solo auth-service tenía algún límite).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 300 }]),
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
