import { Module, Global } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';
import { DeepSeekService } from './ai/deepseek.service';

@Global()
@Module({
  providers: [AllExceptionsFilter, DeepSeekService],
  exports: [AllExceptionsFilter, DeepSeekService],
})
export class CommonModule {}
