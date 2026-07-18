import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { JobsModule } from './jobs.module';

async function bootstrap() {
  const app = await NestFactory.create(JobsModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env['JOBS_SERVICE_PORT'] || 3006;
  await app.listen(port, '0.0.0.0');
  console.log(`Jobs Service corriendo en http://localhost:${port}`);
}

bootstrap();
