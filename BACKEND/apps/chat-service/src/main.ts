import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ChatModule } from './chat.module';

/**
 * Punto de entrada del microservicio de Chat. Levanta la app NestJS HTTP
 * (para el `ChatController`) que internamente también inicializa el
 * `ChatGateway` de Socket.io sobre el mismo servidor, con prefijo `/api`,
 * cookies y CORS restringido al origen del frontend.
 */
async function bootstrap() {
  const app = await NestFactory.create(ChatModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env['CHAT_SERVICE_PORT'] || 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`Chat Service corriendo en http://localhost:${port}`);
}

bootstrap();
