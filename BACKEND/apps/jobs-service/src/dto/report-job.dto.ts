import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReportJobDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo es requerido' })
  @MaxLength(1000)
  reason: string;
}
