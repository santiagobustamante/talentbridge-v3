import { IsEmail, IsString, IsOptional, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { IsValidMunicipio } from '@app/common';

export class RegisterDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres' })
  @MaxLength(72)
  confirmPassword: string;
}

export class RegisterCompanyDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword: string;

  // `@IsString()` solo no alcanza: un "" vacío igual es un string válido.
  // `companyName` es NOT NULL en la base — sin `@IsNotEmpty()` se podía
  // registrar una empresa con el nombre en blanco.
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @IsValidMunicipio()
  city?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  @MaxLength(255)
  email: string;

  // Sin tope de longitud a propósito: un password ya existente pudo haberse
  // creado antes de que `RegisterDto` tuviera `@MaxLength(72)` — bcrypt ya
  // trunca de forma segura a 72 bytes por su cuenta, así que agregar el
  // mismo límite acá solo arriesgaba rechazar el login de una cuenta vieja
  // con password más largo, sin ganar nada (bcrypt ya lo maneja).
  @IsString()
  password: string;
}
