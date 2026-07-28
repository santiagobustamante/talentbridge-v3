import { IsEmail, IsString, IsOptional, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { IsValidMunicipio } from '@app/common';

/** Al menos una letra y un número — decisión del barrido 2026-07-26 (antes solo se
 *  exigía longitud mínima). Ver docs/plan-barrido-validaciones-y-datos-2026-07-26.md
 *  ítem 0.5 y docs/DECISIONS.md. No se aplica a `LoginDto`: no hay que romper el
 *  login de cuentas ya creadas con una contraseña que no cumpla esta regla nueva. */
const PASSWORD_COMPLEXITY = /(?=.*[A-Za-z])(?=.*\d)/;
const PASSWORD_COMPLEXITY_MESSAGE = 'La contraseña debe incluir al menos una letra y un número';

export class RegisterDto {
  // Sin esto el perfil se crea sin `fullName`, y el saludo del shell
  // ("Hola, {nombre}") cae a mostrar el correo hasta que el candidato
  // entre a editar su perfil manualmente — pedirlo en el registro evita
  // ese estado intermedio.
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(150)
  fullName: string;

  @IsEmail({}, { message: 'Correo electrónico no válido' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY, { message: PASSWORD_COMPLEXITY_MESSAGE })
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
  @Matches(PASSWORD_COMPLEXITY, { message: PASSWORD_COMPLEXITY_MESSAGE })
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

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Correo electrónico no válido' })
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres' })
  @MaxLength(72)
  confirmPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;
}
