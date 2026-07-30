import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { ParametersController } from './parameters.controller';
import { ParametersService } from './parameters.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
    // 60 req/min por IP — más estricto que el default de 300/min del resto
    // de los servicios: todo lo que cuelga de este servicio requiere rol
    // ADMIN y puede modificar configuración transversal del sistema, así
    // que conviene un límite más bajo desde el día 1, no solo cuando haga
    // falta reaccionar a un abuso puntual.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
  ],
  controllers: [ParametersController, AuditLogController, CatalogController, UsersController, FeatureFlagsController],
  providers: [
    ParametersService,
    AuditLogService,
    CatalogService,
    UsersService,
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
export class AdminModule {}
