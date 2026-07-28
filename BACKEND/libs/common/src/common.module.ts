import { Module, Global } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';
import { DeepSeekService } from './ai/deepseek.service';
import { EmailService } from './email/email.service';

@Global()
@Module({
  providers: [AllExceptionsFilter, DeepSeekService, EmailService],
  exports: [AllExceptionsFilter, DeepSeekService, EmailService],
})
export class CommonModule {}
