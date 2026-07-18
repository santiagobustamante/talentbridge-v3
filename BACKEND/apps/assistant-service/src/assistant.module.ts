import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

/**
 * Módulo raíz del microservicio del asistente virtual "Joaquín". Expone un
 * único endpoint conversacional que combina datos reales del usuario
 * (obtenidos vía Prisma) con una llamada al modelo de lenguaje DeepSeek
 * (a través de `@app/common`) para responder preguntas y sugerir acciones
 * de navegación dentro de la plataforma.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
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
export class AssistantModule {}
