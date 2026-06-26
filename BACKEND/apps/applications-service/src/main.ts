import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ApplicationsModule } from './applications.module';

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
  await app.listen(port);
  console.log(`Applications Service corriendo en http://localhost:${port}`);
}

bootstrap();
