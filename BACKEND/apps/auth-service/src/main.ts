import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  // Todo el tráfico real llega vía el proxy del api-gateway (fetch()
  // servidor-a-servidor), así que sin esto Express toma la IP del gateway
  // como "el cliente" para cualquier request — rompe el rate limiting por
  // IP (ver ThrottlerModule en auth.module.ts). El gateway ya manda el IP
  // real en X-Forwarded-For.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env['AUTH_SERVICE_PORT'] || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Auth Service corriendo en http://localhost:${port}`);
}

bootstrap();
