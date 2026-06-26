import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
import { AuthLibModule } from '@app/auth';
import { CompanyProfileController } from './company-profile.controller';
import { CompanyProfileService } from './company-profile.service';
import { CandidateSearchController } from './candidate-search.controller';
import { CandidateSearchService } from './candidate-search.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthLibModule,
  ],
  controllers: [CompanyProfileController, CandidateSearchController],
  providers: [
    CompanyProfileService,
    CandidateSearchService,
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
export class CompanyModule {}
