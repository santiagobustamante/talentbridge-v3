import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres' })
  confirmPassword: string;
}

export class RegisterCompanyDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  email: string;

  @IsString()
  password: string;
}
