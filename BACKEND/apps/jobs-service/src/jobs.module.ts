import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard, getDynamicRateLimit } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { CompanyJobsController } from './company-jobs.controller';
import { JobsService } from './jobs.service';
import { CandidateJobsController } from './candidate-jobs.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
    // 300 req/min por IP — frena abuso/flood sin afectar uso normal. Mismo
    // patrón que auth-service (barrido 2026-07-26). Límite dinámico
    // (`RATE_LIMIT_DEFAULT`, Fase 11) — ver `getDynamicRateLimit`.
    ThrottlerModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: () => getDynamicRateLimit(prisma, 'RATE_LIMIT_DEFAULT', 300) }],
      }),
    }),
  ],
  controllers: [CompanyJobsController, CandidateJobsController],
  providers: [
    JobsService,
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
export class JobsModule {}
