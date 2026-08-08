import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from '@app/database';
import { AllExceptionsFilter, CommonModule, IpThrottlerGuard, getDynamicRateLimit } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { RepositoryModule } from '@app/repository';
import { SkillsController } from './skills/skills.controller';
import { SkillsService } from './skills/skills.service';
import { ExperiencesController } from './experiences/experiences.controller';
import { ExperiencesService } from './experiences/experiences.service';
import { EducationController } from './education/education.controller';
import { EducationService } from './education/education.service';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { CvController } from './cv/cv.controller';
import { CvService } from './cv/cv.service';
import { PublicPortfolioController } from './public-portfolio/public-portfolio.controller';
import { PublicPortfolioService } from './public-portfolio/public-portfolio.service';
import { CandidateAccessService } from './shared/candidate-access.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
    RepositoryModule,
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
  controllers: [
    SkillsController,
    ExperiencesController,
    EducationController,
    ProjectsController,
    CvController,
    PublicPortfolioController,
  ],
  providers: [
    SkillsService,
    ExperiencesService,
    EducationService,
    ProjectsService,
    CvService,
    PublicPortfolioService,
    CandidateAccessService,
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
export class PortfolioModule {}
