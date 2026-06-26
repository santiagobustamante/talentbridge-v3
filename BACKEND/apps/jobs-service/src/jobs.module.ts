import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
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
  ],
  controllers: [CompanyJobsController, CandidateJobsController],
  providers: [
    JobsService,
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
