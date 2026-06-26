import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  exports: [PassportModule, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
})
export class AuthLibModule {}
