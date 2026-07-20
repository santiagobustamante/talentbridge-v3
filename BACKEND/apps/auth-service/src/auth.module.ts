import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import type { StringValue } from 'ms';
import { PrismaModule } from '@app/database';
import { AllExceptionsFilter, CommonModule } from '@app/common';
import { JwtStrategy, OptionalJwtAuthGuard } from '@app/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Antes caía a un secreto hardcodeado ('dev_secret') si faltaba la variable
// de entorno — cualquier deploy sin JWT_SECRET seteado firmaba tokens con un
// valor público y predecible. Mejor fallar al arrancar que arrancar inseguro
// en silencio.
const jwtSecret = process.env['JWT_SECRET'];
if (!jwtSecret) {
  throw new Error('JWT_SECRET no está seteado. El servicio no puede arrancar sin este secreto.');
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1d' as StringValue },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OptionalJwtAuthGuard,
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
export class AuthModule {}
