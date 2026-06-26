import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { ExperiencesController } from './experiences.controller';
import { ExperiencesService } from './experiences.service';
import { EducationController } from './education.controller';
import { EducationService } from './education.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { PublicPortfolioController } from './public-portfolio.controller';
import { PublicPortfolioService } from './public-portfolio.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
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
