import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render/Railway ponen exactamente un reverse proxy propio delante de este
  // gateway, que agrega (no reemplaza) el IP real del cliente al final de
  // X-Forwarded-For. Sin esto, Express confía ciegamente en cualquier valor
  // que el cliente ya haya mandado en ese header (spoofeable con curl/Postman),
  // permitiendo bypassear el rate-limit de login rotando IPs falsas — con
  // "trust proxy: 1", req.ip pasa a resolver correctamente el último hop
  // confiable en vez del primero (no confiable) de la cadena.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('TalentBridge API Gateway')
    .setDescription('API Gateway para la arquitectura de microservicios de TalentBridge')
    .setVersion('3.0')
    .addBearerAuth()
    .addCookieAuth('auth_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['API_GATEWAY_PORT'] || 3000;

  await app.listen(port, '0.0.0.0');
  console.log(`API Gateway corriendo en http://localhost:${port}`);
  console.log(`Swagger disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
