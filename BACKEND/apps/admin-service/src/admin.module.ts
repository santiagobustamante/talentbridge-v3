import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard, getDynamicRateLimit } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { RepositoryModule } from '@app/repository';
import { ParametersController } from './parameters/parameters.controller';
import { ParametersService } from './parameters/parameters.service';
import { AuditLogController } from './audit-log/audit-log.controller';
import { AuditLogService } from './audit-log/audit-log.service';
import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { FeatureFlagsController } from './feature-flags/feature-flags.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { ModerationController } from './moderation/moderation.controller';
import { ModerationService } from './moderation/moderation.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
    RepositoryModule,
    // 60 req/min por IP — más estricto que el default de 300/min del resto
    // de los servicios: todo lo que cuelga de este servicio requiere rol
    // ADMIN y puede modificar configuración transversal del sistema, así
    // que conviene un límite más bajo desde el día 1, no solo cuando haga
    // falta reaccionar a un abuso puntual. Límite dinámico (`RATE_LIMIT_ADMIN`,
    // Fase 11) — ver `getDynamicRateLimit`.
    ThrottlerModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: () => getDynamicRateLimit(prisma, 'RATE_LIMIT_ADMIN', 60) }],
      }),
    }),
  ],
  controllers: [ParametersController, AuditLogController, CatalogController, UsersController, FeatureFlagsController, DashboardController, ModerationController],
  providers: [
    ParametersService,
    AuditLogService,
    CatalogService,
    UsersService,
    DashboardService,
    ModerationService,
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
