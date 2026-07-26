import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
    // 300 req/min por IP — frena abuso/flood sin afectar uso normal. Mismo
    // patrón que auth-service (barrido 2026-07-26).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 300 }]),
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
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
export class CandidateModule {}
