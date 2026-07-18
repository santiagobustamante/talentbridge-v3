import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { CandidateModule } from './candidate.module';

async function bootstrap() {
  const app = await NestFactory.create(CandidateModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env['CANDIDATE_SERVICE_PORT'] || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`Candidate Service corriendo en http://localhost:${port}`);
}

bootstrap();
