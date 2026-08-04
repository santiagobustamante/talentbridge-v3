import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReportMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo es requerido' })
  @MaxLength(1000)
  reason: string;
}
