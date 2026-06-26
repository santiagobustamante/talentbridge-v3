import { Module, Global } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

@Global()
@Module({
  providers: [AllExceptionsFilter],
  exports: [AllExceptionsFilter],
})
export class CommonModule {}
