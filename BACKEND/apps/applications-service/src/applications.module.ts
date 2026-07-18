import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

/**
 * Módulo raíz del microservicio de Postulaciones (Applications Service).
 * Agrupa el controller y el service que gestionan el ciclo de vida de las
 * postulaciones de candidatos a ofertas laborales: aplicar, listar propias,
 * listar las recibidas por una empresa y actualizar su estado.
 * Registra de forma global un ValidationPipe (rechaza propiedades no
 * declaradas en los DTOs) y un filtro de excepciones común a todos los
 * microservicios de la plataforma.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
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
export class ApplicationsModule {}
