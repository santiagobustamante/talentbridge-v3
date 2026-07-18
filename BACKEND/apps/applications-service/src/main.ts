import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ApplicationsModule } from './applications.module';

/**
 * Punto de entrada del microservicio de Postulaciones. Levanta una app
 * NestJS HTTP independiente (arquitectura de microservicios: cada dominio
 * corre en su propio proceso/puerto detrás del API Gateway), con prefijo
 * global `/api`, soporte de cookies (para el JWT httpOnly) y CORS habilitado
 * solo para el origen del frontend.
 */
async function bootstrap() {
  const app = await NestFactory.create(ApplicationsModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env['APPLICATIONS_SERVICE_PORT'] || 3007;
  await app.listen(port, '0.0.0.0');
  console.log(`Applications Service corriendo en http://localhost:${port}`);
}

bootstrap();
